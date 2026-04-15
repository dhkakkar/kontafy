import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_SUPERADMIN_KEY } from '../decorators/superadmin.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SuperadminGuard implements CanActivate {
  private readonly logger = new Logger(SuperadminGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isSuperadminRoute = this.reflector.getAllAndOverride<boolean>(
      IS_SUPERADMIN_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isSuperadminRoute) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.sub) {
      throw new ForbiddenException('User not authenticated');
    }

    const superadmin = await this.prisma.superadmin.findUnique({
      where: { user_id: user.sub },
    });

    if (!superadmin) {
      this.logger.warn(
        `User ${user.sub} attempted to access superadmin route`,
      );
      throw new ForbiddenException('Superadmin access required');
    }

    request.isSuperadmin = true;
    return true;
  }
}
