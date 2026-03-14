import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, OrgRole } from '../decorators/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RoleGuard implements CanActivate {
  private readonly logger = new Logger(RoleGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<OrgRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator — allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.sub) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get org_id from header or user payload
    const orgId = request.headers['x-org-id'] || user.org_id;
    if (!orgId) {
      throw new ForbiddenException('Organization context required for role-based access');
    }

    // Look up the user's role in this org
    const member = await this.prisma.orgMember.findUnique({
      where: {
        org_id_user_id: {
          org_id: orgId,
          user_id: user.sub,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    if (!requiredRoles.includes(member.role as OrgRole)) {
      this.logger.warn(
        `User ${user.sub} with role "${member.role}" attempted to access route requiring roles: ${requiredRoles.join(', ')}`,
      );
      throw new ForbiddenException(
        `This action requires one of: ${requiredRoles.join(', ')}. Your role: ${member.role}`,
      );
    }

    // Attach member info to the request for downstream use
    request.orgMember = member;

    return true;
  }
}
