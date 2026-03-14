import { createParamDecorator, ExecutionContext, BadRequestException } from '@nestjs/common';

/**
 * @OrgId() decorator — extracts organization ID from the X-Org-Id header or user token.
 *
 * Multi-tenancy: Every data-scoped request must include an org_id.
 * The org_id can come from:
 *   1. X-Org-Id request header (for users with multiple orgs)
 *   2. The JWT token's org_id claim (for single-org users)
 *
 * Usage:
 *   @Get('invoices')
 *   listInvoices(@OrgId() orgId: string) { ... }
 */
export const OrgId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();

    // Priority 1: Header
    const headerOrgId = request.headers['x-org-id'] as string | undefined;
    if (headerOrgId) {
      return headerOrgId;
    }

    // Priority 2: JWT payload
    const user = request.user;
    if (user?.org_id) {
      return user.org_id;
    }

    throw new BadRequestException(
      'Organization ID is required. Provide X-Org-Id header or ensure your token includes org_id.',
    );
  },
);
