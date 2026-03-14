import { SetMetadata } from '@nestjs/common';

export const SKIP_AUDIT_KEY = 'skipAudit';

/**
 * @SkipAudit() decorator — marks a route handler to be excluded from
 * automatic audit logging by the AuditInterceptor.
 *
 * Usage:
 *   @SkipAudit()
 *   @Post('webhook')
 *   handleWebhook() { ... }
 */
export const SkipAudit = () => SetMetadata(SKIP_AUDIT_KEY, true);
