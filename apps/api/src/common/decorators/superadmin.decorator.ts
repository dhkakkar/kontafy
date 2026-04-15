import { SetMetadata } from '@nestjs/common';

export const IS_SUPERADMIN_KEY = 'isSuperadmin';

/**
 * @SuperadminOnly() decorator — restricts access to platform superadmins.
 *
 * Usage:
 *   @SuperadminOnly()
 *   @Get('organizations')
 *   listOrgs() { ... }
 */
export const SuperadminOnly = () => SetMetadata(IS_SUPERADMIN_KEY, true);
