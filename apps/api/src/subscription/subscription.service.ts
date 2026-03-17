import {
  Injectable,
  Logger,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from './razorpay.service';
import {
  PlanId,
  PLAN_DEFINITIONS,
  PLAN_ORDER,
  getPlan,
  isUpgrade,
  isDowngrade,
} from './plan-features';
import {
  CreateCheckoutDto,
  CurrentSubscriptionResponse,
  UsageResponse,
  BillingInvoice,
  CheckoutResponse,
} from './dto/subscription.dto';

const GRACE_PERIOD_DAYS = 7;

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayService,
    private readonly configService: ConfigService,
  ) {}

  // ───────────────────────────────────────────────────────
  // Plans
  // ───────────────────────────────────────────────────────

  listPlans() {
    return Object.values(PLAN_DEFINITIONS).map((plan) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      features: plan.features,
      popular: plan.popular || false,
    }));
  }

  // ───────────────────────────────────────────────────────
  // Current Subscription
  // ───────────────────────────────────────────────────────

  async getCurrentSubscription(
    orgId: string,
    userId: string,
  ): Promise<CurrentSubscriptionResponse> {
    await this.verifyMembership(orgId, userId);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        plan: true,
        plan_expires_at: true,
        settings: true,
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const planId = (org.plan || 'free') as PlanId;
    const planDef = getPlan(planId);
    const settings = (org.settings as Record<string, any>) || {};
    const subscription = settings.subscription || {};

    return {
      planId: planDef.id,
      planName: planDef.name,
      status: subscription.status || 'active',
      billingCycle: subscription.billingCycle || 'monthly',
      currentPeriodStart: subscription.currentPeriodStart || null,
      currentPeriodEnd: org.plan_expires_at?.toISOString() || null,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd || false,
      razorpaySubscriptionId: subscription.razorpaySubscriptionId || null,
      features: planDef.features,
    };
  }

  // ───────────────────────────────────────────────────────
  // Checkout
  // ───────────────────────────────────────────────────────

  async createCheckout(
    orgId: string,
    userId: string,
    dto: CreateCheckoutDto,
  ): Promise<CheckoutResponse> {
    await this.verifyMembership(orgId, userId);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true, name: true, settings: true },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const currentPlanId = (org.plan || 'free') as PlanId;
    const targetPlan = getPlan(dto.planId as PlanId);

    if (!targetPlan) {
      throw new BadRequestException('Invalid plan selected');
    }

    if (dto.planId === currentPlanId) {
      throw new BadRequestException('You are already on this plan');
    }

    // Get or create Razorpay plan ID
    const settings = (org.settings as Record<string, any>) || {};
    let razorpayPlanId = settings[`razorpay_plan_${dto.planId}_${dto.billingCycle}`];

    if (!razorpayPlanId) {
      // Create the plan in Razorpay
      const price =
        dto.billingCycle === 'yearly'
          ? targetPlan.priceYearly
          : targetPlan.priceMonthly;

      const rzPlan = await this.razorpay.createPlan({
        name: `Kontafy ${targetPlan.name} (${dto.billingCycle})`,
        description: targetPlan.description,
        amount: price * 100, // Convert to paise
        period: dto.billingCycle,
      });

      razorpayPlanId = rzPlan.id;

      // Cache the plan ID in org settings
      await this.prisma.organization.update({
        where: { id: orgId },
        data: {
          settings: {
            ...settings,
            [`razorpay_plan_${dto.planId}_${dto.billingCycle}`]: razorpayPlanId,
          },
        },
      });
    }

    // Create Razorpay subscription
    const subscription = await this.razorpay.createSubscription({
      planId: razorpayPlanId,
      notes: {
        org_id: orgId,
        user_id: userId,
        plan_id: dto.planId,
        billing_cycle: dto.billingCycle,
      },
    });

    // Store pending subscription info
    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        settings: {
          ...settings,
          [`razorpay_plan_${dto.planId}_${dto.billingCycle}`]: razorpayPlanId,
          subscription: {
            ...(settings.subscription || {}),
            pendingSubscriptionId: subscription.id,
            pendingPlanId: dto.planId,
            pendingBillingCycle: dto.billingCycle,
          },
        },
      },
    });

    const price =
      dto.billingCycle === 'yearly'
        ? targetPlan.priceYearly
        : targetPlan.priceMonthly;

    return {
      subscriptionId: subscription.id,
      razorpayKeyId: this.razorpay.getKeyId(),
      amount: price * 100, // paise
      currency: 'INR',
      planName: targetPlan.name,
      description: `Kontafy ${targetPlan.name} - ${dto.billingCycle === 'yearly' ? 'Annual' : 'Monthly'} Subscription`,
    };
  }

  // ───────────────────────────────────────────────────────
  // Webhook Handler
  // ───────────────────────────────────────────────────────

  async handleWebhook(event: string, payload: Record<string, any>) {
    this.logger.log(`Processing webhook: ${event}`);

    switch (event) {
      case 'subscription.activated':
        await this.handleSubscriptionActivated(payload);
        break;
      case 'subscription.charged':
        await this.handleSubscriptionCharged(payload);
        break;
      case 'subscription.cancelled':
        await this.handleSubscriptionCancelled(payload);
        break;
      case 'subscription.paused':
        await this.handleSubscriptionPaused(payload);
        break;
      case 'payment.failed':
        await this.handlePaymentFailed(payload);
        break;
      default:
        this.logger.warn(`Unhandled webhook event: ${event}`);
    }
  }

  private async handleSubscriptionActivated(payload: Record<string, any>) {
    const subscription = payload.subscription?.entity;
    if (!subscription) return;

    const notes = subscription.notes || {};
    const orgId = notes.org_id;
    if (!orgId) {
      this.logger.error('No org_id in subscription notes');
      return;
    }

    const planId = notes.plan_id as PlanId;
    const billingCycle = notes.billing_cycle || 'monthly';

    const periodEnd = subscription.current_end
      ? new Date(subscription.current_end * 1000)
      : new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);

    const periodStart = subscription.current_start
      ? new Date(subscription.current_start * 1000)
      : new Date();

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    if (!org) return;

    const settings = (org.settings as Record<string, any>) || {};

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        plan: planId,
        plan_expires_at: periodEnd,
        settings: {
          ...settings,
          subscription: {
            status: 'active',
            razorpaySubscriptionId: subscription.id,
            billingCycle,
            currentPeriodStart: periodStart.toISOString(),
            currentPeriodEnd: periodEnd.toISOString(),
            cancelAtPeriodEnd: false,
            lastPaymentAt: new Date().toISOString(),
          },
        },
        updated_at: new Date(),
      },
    });

    this.logger.log(`Subscription activated for org ${orgId}: plan=${planId}`);
  }

  private async handleSubscriptionCharged(payload: Record<string, any>) {
    const subscription = payload.subscription?.entity;
    const payment = payload.payment?.entity;
    if (!subscription) return;

    const notes = subscription.notes || {};
    const orgId = notes.org_id;
    if (!orgId) return;

    const billingCycle = notes.billing_cycle || 'monthly';

    const periodEnd = subscription.current_end
      ? new Date(subscription.current_end * 1000)
      : new Date(Date.now() + (billingCycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);

    const periodStart = subscription.current_start
      ? new Date(subscription.current_start * 1000)
      : new Date();

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    if (!org) return;

    const settings = (org.settings as Record<string, any>) || {};
    const existingInvoices = settings.billingInvoices || [];

    // Record billing invoice
    const billingInvoice: BillingInvoice = {
      id: payment?.id || `inv_${Date.now()}`,
      date: new Date().toISOString(),
      amount: payment?.amount ? payment.amount / 100 : 0, // paise to INR
      status: 'paid',
      planName: getPlan(notes.plan_id as PlanId)?.name || 'Unknown',
      receiptUrl: null,
      razorpayPaymentId: payment?.id || null,
    };

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        plan_expires_at: periodEnd,
        settings: {
          ...settings,
          subscription: {
            ...(settings.subscription || {}),
            status: 'active',
            currentPeriodStart: periodStart.toISOString(),
            currentPeriodEnd: periodEnd.toISOString(),
            lastPaymentAt: new Date().toISOString(),
            failedPaymentCount: 0,
            graceDeadline: null,
          },
          billingInvoices: [...existingInvoices, billingInvoice],
        },
        updated_at: new Date(),
      },
    });

    this.logger.log(`Subscription charged for org ${orgId}`);
  }

  private async handleSubscriptionCancelled(payload: Record<string, any>) {
    const subscription = payload.subscription?.entity;
    if (!subscription) return;

    const notes = subscription.notes || {};
    const orgId = notes.org_id;
    if (!orgId) return;

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true, plan_expires_at: true },
    });

    if (!org) return;

    const settings = (org.settings as Record<string, any>) || {};

    // If plan hasn't expired yet, mark as pending cancellation.
    // Otherwise, downgrade to free immediately.
    const expiresAt = org.plan_expires_at;
    const isExpired = !expiresAt || expiresAt <= new Date();

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        plan: isExpired ? 'free' : undefined,
        plan_expires_at: isExpired ? null : expiresAt,
        settings: {
          ...settings,
          subscription: {
            ...(settings.subscription || {}),
            status: isExpired ? 'cancelled' : 'pending_cancellation',
            cancelAtPeriodEnd: !isExpired,
            cancelledAt: new Date().toISOString(),
          },
        },
        updated_at: new Date(),
      },
    });

    this.logger.log(`Subscription cancelled for org ${orgId}`);
  }

  private async handleSubscriptionPaused(payload: Record<string, any>) {
    const subscription = payload.subscription?.entity;
    if (!subscription) return;

    const notes = subscription.notes || {};
    const orgId = notes.org_id;
    if (!orgId) return;

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    if (!org) return;

    const settings = (org.settings as Record<string, any>) || {};

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        settings: {
          ...settings,
          subscription: {
            ...(settings.subscription || {}),
            status: 'paused',
          },
        },
        updated_at: new Date(),
      },
    });
  }

  private async handlePaymentFailed(payload: Record<string, any>) {
    const payment = payload.payment?.entity;
    if (!payment) return;

    // Find org by subscription notes or payment notes
    const notes = payment.notes || {};
    const orgId = notes.org_id;
    if (!orgId) return;

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    if (!org) return;

    const settings = (org.settings as Record<string, any>) || {};
    const sub = settings.subscription || {};
    const failedCount = (sub.failedPaymentCount || 0) + 1;

    // Set grace period deadline if first failure
    const graceDeadline =
      sub.graceDeadline ||
      new Date(Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();

    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        settings: {
          ...settings,
          subscription: {
            ...sub,
            status: 'past_due',
            failedPaymentCount: failedCount,
            graceDeadline,
            lastFailedPaymentAt: new Date().toISOString(),
          },
        },
        updated_at: new Date(),
      },
    });

    this.logger.warn(
      `Payment failed for org ${orgId}: attempt ${failedCount}, grace until ${graceDeadline}`,
    );
  }

  // ───────────────────────────────────────────────────────
  // Upgrade
  // ───────────────────────────────────────────────────────

  async upgradePlan(orgId: string, userId: string, targetPlanId: PlanId) {
    await this.verifyMembership(orgId, userId);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true, plan_expires_at: true, settings: true },
    });

    if (!org) throw new NotFoundException('Organization not found');

    const currentPlanId = (org.plan || 'free') as PlanId;

    if (!isUpgrade(currentPlanId, targetPlanId)) {
      throw new BadRequestException(
        `Cannot upgrade from ${currentPlanId} to ${targetPlanId}. Use downgrade instead.`,
      );
    }

    const settings = (org.settings as Record<string, any>) || {};
    const subscription = settings.subscription || {};

    // If upgrading from free, create checkout
    if (currentPlanId === 'free') {
      return this.createCheckout(orgId, userId, {
        planId: targetPlanId as any,
        billingCycle: 'monthly',
      });
    }

    // Calculate proration for mid-cycle upgrade
    const currentPlan = getPlan(currentPlanId);
    const newPlan = getPlan(targetPlanId);
    const billingCycle = subscription.billingCycle || 'monthly';

    let prorationAmount = 0;
    if (subscription.currentPeriodStart && subscription.currentPeriodEnd) {
      prorationAmount = this.razorpay.calculateProration({
        currentPlanPrice:
          billingCycle === 'yearly'
            ? currentPlan.priceYearly
            : currentPlan.priceMonthly,
        newPlanPrice:
          billingCycle === 'yearly'
            ? newPlan.priceYearly
            : newPlan.priceMonthly,
        currentPeriodStart: new Date(subscription.currentPeriodStart),
        currentPeriodEnd: new Date(subscription.currentPeriodEnd),
      });
    }

    // Cancel current subscription and create new one
    if (subscription.razorpaySubscriptionId) {
      try {
        await this.razorpay.cancelSubscription(
          subscription.razorpaySubscriptionId,
          false, // Cancel immediately
        );
      } catch (error) {
        this.logger.error('Failed to cancel current subscription for upgrade', error);
      }
    }

    // Create new checkout for the upgraded plan
    const checkout = await this.createCheckout(orgId, userId, {
      planId: targetPlanId as any,
      billingCycle,
    });

    return {
      ...checkout,
      prorationAmount,
      previousPlan: currentPlan.name,
      newPlan: newPlan.name,
    };
  }

  // ───────────────────────────────────────────────────────
  // Downgrade
  // ───────────────────────────────────────────────────────

  async downgradePlan(orgId: string, userId: string, targetPlanId: PlanId) {
    await this.verifyMembership(orgId, userId);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true, plan_expires_at: true, settings: true },
    });

    if (!org) throw new NotFoundException('Organization not found');

    const currentPlanId = (org.plan || 'free') as PlanId;

    if (!isDowngrade(currentPlanId, targetPlanId)) {
      throw new BadRequestException(
        `Cannot downgrade from ${currentPlanId} to ${targetPlanId}. Use upgrade instead.`,
      );
    }

    const settings = (org.settings as Record<string, any>) || {};
    const subscription = settings.subscription || {};

    // Downgrade takes effect at end of current billing period
    await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        settings: {
          ...settings,
          subscription: {
            ...subscription,
            pendingDowngrade: targetPlanId,
            pendingDowngradeAt: org.plan_expires_at?.toISOString() || null,
          },
        },
        updated_at: new Date(),
      },
    });

    // If downgrading to free, cancel the Razorpay subscription at period end
    if (targetPlanId === 'free' && subscription.razorpaySubscriptionId) {
      await this.razorpay.cancelSubscription(
        subscription.razorpaySubscriptionId,
        true, // Cancel at cycle end
      );
    }

    const currentPlan = getPlan(currentPlanId);
    const newPlan = getPlan(targetPlanId);

    return {
      message: `Your plan will be downgraded from ${currentPlan.name} to ${newPlan.name} at the end of your current billing period.`,
      effectiveDate: org.plan_expires_at?.toISOString() || null,
      currentPlan: currentPlan.name,
      newPlan: newPlan.name,
    };
  }

  // ───────────────────────────────────────────────────────
  // Cancel
  // ───────────────────────────────────────────────────────

  async cancelSubscription(
    orgId: string,
    userId: string,
    cancelAtPeriodEnd: boolean = true,
    reason?: string,
  ) {
    await this.verifyMembership(orgId, userId);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true, plan_expires_at: true, settings: true },
    });

    if (!org) throw new NotFoundException('Organization not found');

    const currentPlanId = (org.plan || 'free') as PlanId;
    if (currentPlanId === 'free') {
      throw new BadRequestException('Cannot cancel a free plan');
    }

    const settings = (org.settings as Record<string, any>) || {};
    const subscription = settings.subscription || {};

    // Cancel on Razorpay
    if (subscription.razorpaySubscriptionId) {
      await this.razorpay.cancelSubscription(
        subscription.razorpaySubscriptionId,
        cancelAtPeriodEnd,
      );
    }

    const updateData: Record<string, any> = {
      settings: {
        ...settings,
        subscription: {
          ...subscription,
          cancelAtPeriodEnd,
          cancellationReason: reason,
          cancelledAt: new Date().toISOString(),
          status: cancelAtPeriodEnd ? 'pending_cancellation' : 'cancelled',
        },
      },
      updated_at: new Date(),
    };

    // If immediate cancellation, downgrade to free
    if (!cancelAtPeriodEnd) {
      updateData.plan = 'free';
      updateData.plan_expires_at = null;
    }

    await this.prisma.organization.update({
      where: { id: orgId },
      data: updateData,
    });

    return {
      message: cancelAtPeriodEnd
        ? 'Your subscription will be cancelled at the end of the current billing period.'
        : 'Your subscription has been cancelled immediately.',
      effectiveDate: cancelAtPeriodEnd
        ? org.plan_expires_at?.toISOString()
        : new Date().toISOString(),
    };
  }

  // ───────────────────────────────────────────────────────
  // Billing History
  // ───────────────────────────────────────────────────────

  async getBillingInvoices(orgId: string, userId: string): Promise<BillingInvoice[]> {
    await this.verifyMembership(orgId, userId);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    });

    if (!org) throw new NotFoundException('Organization not found');

    const settings = (org.settings as Record<string, any>) || {};
    const invoices: BillingInvoice[] = settings.billingInvoices || [];

    // Sort by date descending
    return invoices.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  // ───────────────────────────────────────────────────────
  // Usage
  // ───────────────────────────────────────────────────────

  async getUsage(orgId: string, userId: string): Promise<UsageResponse> {
    await this.verifyMembership(orgId, userId);

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true },
    });

    if (!org) throw new NotFoundException('Organization not found');

    const planId = (org.plan || 'free') as PlanId;
    const planDef = getPlan(planId);

    // Count invoices this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const invoiceCount = await this.prisma.invoice.count({
      where: {
        org_id: orgId,
        created_at: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    // Count users
    const userCount = await this.prisma.orgMember.count({
      where: { org_id: orgId },
    });

    // Estimate storage (count file attachments)
    const files = await this.prisma.fileAttachment.aggregate({
      where: { org_id: orgId },
      _sum: { file_size: true },
    });
    const storageMb = Math.round((files._sum.file_size || 0) / (1024 * 1024) * 100) / 100;

    const invoiceLimit = planDef.features.maxInvoicesPerMonth;
    const userLimit = planDef.features.maxUsers;
    const storageLimit = planDef.features.maxStorageMb;

    return {
      invoices: {
        used: invoiceCount,
        limit: invoiceLimit,
        percentage:
          invoiceLimit === -1
            ? 0
            : Math.round((invoiceCount / invoiceLimit) * 100),
      },
      users: {
        used: userCount,
        limit: userLimit,
        percentage:
          userLimit === -1 ? 0 : Math.round((userCount / userLimit) * 100),
      },
      storage: {
        usedMb: storageMb,
        limitMb: storageLimit,
        percentage:
          storageLimit === -1
            ? 0
            : Math.round((storageMb / storageLimit) * 100),
      },
    };
  }

  // ───────────────────────────────────────────────────────
  // Usage Enforcement (for guards)
  // ───────────────────────────────────────────────────────

  async checkInvoiceLimit(orgId: string): Promise<{
    allowed: boolean;
    used: number;
    limit: number;
    message?: string;
  }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true },
    });

    if (!org) throw new NotFoundException('Organization not found');

    const planId = (org.plan || 'free') as PlanId;
    const planDef = getPlan(planId);

    if (planDef.features.maxInvoicesPerMonth === -1) {
      return { allowed: true, used: 0, limit: -1 };
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const invoiceCount = await this.prisma.invoice.count({
      where: {
        org_id: orgId,
        created_at: { gte: monthStart, lte: monthEnd },
      },
    });

    const limit = planDef.features.maxInvoicesPerMonth;
    const allowed = invoiceCount < limit;

    return {
      allowed,
      used: invoiceCount,
      limit,
      message: allowed
        ? undefined
        : `Invoice limit reached (${invoiceCount}/${limit}). Upgrade your plan to create more invoices.`,
    };
  }

  async checkUserLimit(orgId: string): Promise<{
    allowed: boolean;
    used: number;
    limit: number;
    message?: string;
  }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true },
    });

    if (!org) throw new NotFoundException('Organization not found');

    const planId = (org.plan || 'free') as PlanId;
    const planDef = getPlan(planId);

    if (planDef.features.maxUsers === -1) {
      return { allowed: true, used: 0, limit: -1 };
    }

    const userCount = await this.prisma.orgMember.count({
      where: { org_id: orgId },
    });

    const limit = planDef.features.maxUsers;
    const allowed = userCount < limit;

    return {
      allowed,
      used: userCount,
      limit,
      message: allowed
        ? undefined
        : `User limit reached (${userCount}/${limit}). Upgrade your plan to add more team members.`,
    };
  }

  /**
   * Check if a specific feature is available on the current plan.
   */
  async checkFeature(
    orgId: string,
    feature: string,
  ): Promise<{ allowed: boolean; planRequired?: string }> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true },
    });

    if (!org) throw new NotFoundException('Organization not found');

    const planId = (org.plan || 'free') as PlanId;
    const planDef = getPlan(planId);
    const features = planDef.features as Record<string, any>;

    if (features[feature] === undefined) {
      return { allowed: true }; // Unknown features are allowed by default
    }

    if (typeof features[feature] === 'boolean') {
      if (features[feature]) {
        return { allowed: true };
      }

      // Find the cheapest plan that has this feature
      const plans = Object.values(PLAN_DEFINITIONS);
      const requiredPlan = plans.find(
        (p) =>
          PLAN_ORDER[p.id] > PLAN_ORDER[planId] &&
          (p.features as Record<string, any>)[feature] === true,
      );

      return {
        allowed: false,
        planRequired: requiredPlan?.name || 'a higher plan',
      };
    }

    return { allowed: true };
  }

  /**
   * Check if subscription is in grace period and still accessible.
   */
  async isSubscriptionActive(orgId: string): Promise<boolean> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { plan: true, plan_expires_at: true, settings: true },
    });

    if (!org) return false;

    const planId = (org.plan || 'free') as PlanId;
    if (planId === 'free') return true; // Free is always active

    const settings = (org.settings as Record<string, any>) || {};
    const subscription = settings.subscription || {};

    // Check grace period
    if (subscription.status === 'past_due' && subscription.graceDeadline) {
      const graceDeadline = new Date(subscription.graceDeadline);
      if (graceDeadline < new Date()) {
        // Grace period expired, downgrade to free
        await this.prisma.organization.update({
          where: { id: orgId },
          data: {
            plan: 'free',
            plan_expires_at: null,
            settings: {
              ...settings,
              subscription: {
                ...subscription,
                status: 'expired',
                downgradedAt: new Date().toISOString(),
              },
            },
            updated_at: new Date(),
          },
        });
        return false;
      }
      return true; // Still in grace period
    }

    // Check if plan has expired
    if (org.plan_expires_at && org.plan_expires_at < new Date()) {
      // Handle pending downgrade
      if (subscription.pendingDowngrade) {
        const downgradeTarget = subscription.pendingDowngrade as PlanId;
        await this.prisma.organization.update({
          where: { id: orgId },
          data: {
            plan: downgradeTarget,
            plan_expires_at: downgradeTarget === 'free' ? null : org.plan_expires_at,
            settings: {
              ...settings,
              subscription: {
                ...subscription,
                status: downgradeTarget === 'free' ? 'cancelled' : 'active',
                pendingDowngrade: null,
                pendingDowngradeAt: null,
              },
            },
            updated_at: new Date(),
          },
        });
      }
      return false;
    }

    return subscription.status !== 'cancelled' && subscription.status !== 'expired';
  }

  // ───────────────────────────────────────────────────────
  // Helpers
  // ───────────────────────────────────────────────────────

  private async verifyMembership(orgId: string, userId: string) {
    const member = await this.prisma.orgMember.findUnique({
      where: {
        org_id_user_id: {
          org_id: orgId,
          user_id: userId,
        },
      },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    return member;
  }
}
