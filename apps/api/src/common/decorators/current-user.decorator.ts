import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  sub: string;        // Supabase user ID (UUID)
  email?: string;
  phone?: string;
  role?: string;
  org_id?: string;
  aud: string;
  exp: number;
  iat: number;
}

/**
 * @CurrentUser() decorator — extracts the authenticated user from the request.
 *
 * Usage:
 *   @Get('profile')
 *   getProfile(@CurrentUser() user: CurrentUserPayload) { ... }
 *
 *   @Get('id')
 *   getId(@CurrentUser('sub') userId: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
