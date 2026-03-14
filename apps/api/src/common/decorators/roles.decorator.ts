import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export type OrgRole = 'owner' | 'admin' | 'accountant' | 'viewer' | 'ca';

/**
 * @Roles() decorator — restricts access to users with specific org roles.
 *
 * Usage:
 *   @Roles('owner', 'admin')
 *   @Post('settings')
 *   updateSettings() { ... }
 */
export const Roles = (...roles: OrgRole[]) => SetMetadata(ROLES_KEY, roles);
