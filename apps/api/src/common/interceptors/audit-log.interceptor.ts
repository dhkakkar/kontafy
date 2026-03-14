import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * AuditLogInterceptor — logs all mutation operations (POST, PUT, PATCH, DELETE)
 * to the audit_log table for compliance and traceability.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only audit mutations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const userId = request.user?.sub;
    const orgId = request.headers?.['x-org-id'] || request.user?.org_id;
    const path = request.route?.path || request.url;
    const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';

    // Determine entity from path
    const entityInfo = this.extractEntityInfo(path, request.params);

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: async (responseData) => {
          try {
            const action = this.methodToAction(method);
            const entityId =
              entityInfo.entityId ||
              responseData?.data?.id ||
              request.params?.id;

            await this.prisma.auditLog.create({
              data: {
                org_id: orgId,
                user_id: userId,
                action,
                entity_type: entityInfo.entityType,
                entity_id: entityId,
                changes: {
                  method,
                  path,
                  body: this.sanitizeBody(request.body),
                  duration_ms: Date.now() - startTime,
                },
                ip_address: ip,
              },
            });
          } catch (error) {
            // Never let audit logging break the response
            this.logger.error('Failed to write audit log', error);
          }
        },
        error: async (error) => {
          try {
            await this.prisma.auditLog.create({
              data: {
                org_id: orgId,
                user_id: userId,
                action: 'error',
                entity_type: entityInfo.entityType,
                changes: {
                  method,
                  path,
                  error: error.message,
                  status: error.status || 500,
                  duration_ms: Date.now() - startTime,
                },
                ip_address: ip,
              },
            });
          } catch (auditError) {
            this.logger.error('Failed to write error audit log', auditError);
          }
        },
      }),
    );
  }

  private methodToAction(method: string): string {
    switch (method) {
      case 'POST':
        return 'create';
      case 'PUT':
      case 'PATCH':
        return 'update';
      case 'DELETE':
        return 'delete';
      default:
        return method.toLowerCase();
    }
  }

  private extractEntityInfo(path: string, params: any): { entityType: string; entityId?: string } {
    // Extract entity type from path segments like /api/v1/invoices/:id
    const segments = path.split('/').filter(Boolean);
    // Find the first meaningful resource segment (skip api, v1, etc.)
    const resourceSegments = segments.filter(
      (s) => !['api', 'v1', 'v2'].includes(s) && !s.startsWith(':'),
    );
    const entityType = resourceSegments[resourceSegments.length - 1] || 'unknown';
    const entityId = params?.id;

    return { entityType, entityId };
  }

  private sanitizeBody(body: any): any {
    if (!body) return undefined;

    const sanitized = { ...body };
    // Remove sensitive fields
    const sensitiveKeys = ['password', 'token', 'secret', 'otp', 'credentials'];
    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]';
      }
    }
    return sanitized;
  }
}
