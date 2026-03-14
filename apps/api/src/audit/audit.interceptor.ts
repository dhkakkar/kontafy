import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';
import { SKIP_AUDIT_KEY } from './skip-audit.decorator';

/**
 * Maps HTTP methods to human-readable audit actions.
 */
function methodToAction(method: string): string {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'created';
    case 'PUT':
    case 'PATCH':
      return 'updated';
    case 'DELETE':
      return 'deleted';
    default:
      return method.toLowerCase();
  }
}

/**
 * Extracts entity type from the URL path.
 * e.g., /api/v1/invoices/123 -> "invoice"
 *       /api/v1/books/accounts -> "account"
 */
function extractEntityInfo(url: string): { entityType: string; entityId?: string } {
  // Remove query string and API prefix
  const cleanPath = url.split('?')[0].replace(/^\/api\/v\d+\//, '');
  const segments = cleanPath.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { entityType: 'unknown' };
  }

  // Common patterns:
  //   /invoices         -> entityType: "invoice"
  //   /invoices/:id     -> entityType: "invoice", entityId: id
  //   /settings/tax     -> entityType: "settings.tax"
  //   /books/accounts/1 -> entityType: "account", entityId: 1

  // UUID pattern
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  let entityType = segments[0];
  let entityId: string | undefined;

  // If last segment is a UUID, it's the entity ID
  const lastSegment = segments[segments.length - 1];
  if (uuidPattern.test(lastSegment) && segments.length > 1) {
    entityId = lastSegment;
    // Use the segment before the UUID as entity type
    const typeSegment = segments[segments.length - 2];
    entityType = typeSegment;
  } else if (segments.length > 1) {
    // For nested paths like /settings/tax, combine them
    entityType = segments.join('.');
  }

  // Singularize common entity types
  entityType = entityType.replace(/s$/, '');

  return { entityType, entityId };
}

/**
 * Routes to exclude from audit logging.
 * These include health checks, auth endpoints, and webhook receivers.
 */
const EXCLUDED_PATHS = [
  '/health',
  '/auth',
  '/audit',
  '/webhook',
  '/docs',
];

function shouldSkipPath(url: string): boolean {
  const path = url.split('?')[0].replace(/^\/api\/v\d+/, '');
  return EXCLUDED_PATHS.some((excluded) => path.startsWith(excluded));
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method?.toUpperCase();

    // Only audit mutations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    // Check if route is excluded via path
    if (shouldSkipPath(request.url)) {
      return next.handle();
    }

    // Check if route is excluded via @SkipAudit() decorator
    const skipAudit = this.reflector.getAllAndOverride<boolean>(SKIP_AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipAudit) {
      return next.handle();
    }

    const user = request.user;
    const orgId = request.headers?.['x-org-id'] || user?.org_id;
    const userId = user?.sub;

    // No user context means unauthenticated request — skip
    if (!userId) {
      return next.handle();
    }

    const { entityType, entityId } = extractEntityInfo(request.url);
    const action = methodToAction(method);

    // Capture request body for the audit record (sanitized)
    const requestBody = this.sanitizeBody(request.body);

    // Extract IP address
    const ipAddress =
      request.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.headers?.['x-real-ip'] ||
      request.ip ||
      request.connection?.remoteAddress;

    return next.handle().pipe(
      tap({
        next: (responseData) => {
          // Extract entity ID from response if not in URL (e.g., POST /invoices returns { id })
          let resolvedEntityId = entityId;
          if (!resolvedEntityId && responseData) {
            const data = responseData?.data || responseData;
            if (data?.id) {
              resolvedEntityId = data.id;
            }
          }

          // Fire and forget — don't await
          this.auditService
            .log({
              orgId: orgId || '',
              userId,
              action,
              entityType,
              entityId: resolvedEntityId,
              changes: requestBody,
              metadata: {
                method,
                path: request.url,
                statusCode: context.switchToHttp().getResponse().statusCode,
              },
              ipAddress,
            })
            .catch((err) => {
              this.logger.error('Audit interceptor failed to log', err);
            });
        },
        error: () => {
          // Optionally log failed mutations too
          this.auditService
            .log({
              orgId: orgId || '',
              userId,
              action: `${action}.failed`,
              entityType,
              entityId,
              changes: requestBody,
              metadata: {
                method,
                path: request.url,
                error: true,
              },
              ipAddress,
            })
            .catch((err) => {
              this.logger.error('Audit interceptor failed to log error', err);
            });
        },
      }),
    );
  }

  /**
   * Remove sensitive fields from the request body before logging.
   */
  private sanitizeBody(body: any): Record<string, any> | null {
    if (!body || typeof body !== 'object') return null;

    const sanitized = { ...body };
    const sensitiveKeys = [
      'password',
      'secret',
      'token',
      'api_key',
      'apiKey',
      'credentials',
      'credit_card',
      'card_number',
      'cvv',
      'ssn',
    ];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
