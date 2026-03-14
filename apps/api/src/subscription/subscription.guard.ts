import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionService } from './subscription.service';
import { PlanId, PLAN_ORDER } from './plan-features';

// ─── Decorator Keys ────────────────────────────────────────────

export const PLAN_REQUIRED_KEY = 'planRequired';
export const USAGE_CHECK_KEY = 'usageCheck';

// ─── Decorators ─────────────────────────────────────────────────

/**
 * @PlanRequired('professional') — requires the org to be on at least this plan tier.
 *
 * Usage:
 *   @PlanRequired('professional')
 *   @Post('custom-reports')
 *   generateReport() { ... }
 */
export const PlanRequired = (minimumPlan: PlanId) =>
  SetMetadata(PLAN_REQUIRED_KEY, minimumPlan);

/**
 * @UsageCheck('invoices') — checks usage limits before allowing the action.
 * Supported resources: 'invoices' | 'users'
 *
 * Usage:
 *   @UsageCheck('invoices')
 *   @Post('invoices')
 *   createInvoice() { ... }
 */
export const UsageCheck = (resource: 'invoices' | 'users') =>
  SetMetadata(USAGE_CHECK_KEY, resource);

// ─── Guard ──────────────────────────────────────────────────────

@Injectable()
export class SubscriptionGuard implements CanActivate {
  private readonly logger = new Logger(SubscriptionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPlan = this.reflector.getAllAndOverride<PlanId | undefined>(
      PLAN_REQUIRED_KEY,
      [context.getHandler(), context.getClass()],
    );

    const usageResource = this.reflector.getAllAndOverride<
      'invoices' | 'users' | undefined
    >(USAGE_CHECK_KEY, [context.getHandler(), context.getClass()]);

    // No subscription decorators on this route — allow
    if (!requiredPlan && !usageResource) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const orgId = request.headers['x-org-id'] || request.user?.org_id;

    if (!orgId) {
      throw new ForbiddenException(
        'Organization context required for subscription checks',
      );
    }

    // Check if subscription is active (handles grace periods / expiry)
    const isActive =
      await this.subscriptionService.isSubscriptionActive(orgId);
    if (!isActive) {
      throw new ForbiddenException(
        'Your subscription has expired. Please renew to continue using this feature.',
      );
    }

    // ─── Plan Tier Check ──────────────────────────────────────
    if (requiredPlan) {
      const currentSub =
        await this.subscriptionService.getCurrentSubscription(
          orgId,
          request.user?.sub,
        );

      const currentPlanOrder = PLAN_ORDER[currentSub.planId as PlanId] ?? 0;
      const requiredPlanOrder = PLAN_ORDER[requiredPlan] ?? 0;

      if (currentPlanOrder < requiredPlanOrder) {
        throw new ForbiddenException(
          `This feature requires the ${requiredPlan} plan or higher. Your current plan: ${currentSub.planName}. Upgrade at /billing/plans.`,
        );
      }
    }

    // ─── Usage Limit Check ────────────────────────────────────
    if (usageResource) {
      let result: { allowed: boolean; message?: string };

      switch (usageResource) {
        case 'invoices':
          result = await this.subscriptionService.checkInvoiceLimit(orgId);
          break;
        case 'users':
          result = await this.subscriptionService.checkUserLimit(orgId);
          break;
        default:
          result = { allowed: true };
      }

      if (!result.allowed) {
        throw new ForbiddenException(
          result.message ||
            `Usage limit reached for ${usageResource}. Upgrade your plan for higher limits.`,
        );
      }
    }

    return true;
  }
}
