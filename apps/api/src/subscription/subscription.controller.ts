import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Headers,
  RawBodyRequest,
  BadRequestException,
  Logger,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { RazorpayService } from './razorpay.service';
import { OrgId } from '../common/decorators/org-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import {
  CreateCheckoutDto,
  ChangePlanDto,
  CancelSubscriptionDto,
  RazorpayWebhookDto,
} from './dto/subscription.dto';
import { PlanId } from './plan-features';

@ApiTags('Subscription')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('subscription')
export class SubscriptionController {
  private readonly logger = new Logger(SubscriptionController.name);

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly razorpayService: RazorpayService,
  ) {}

  // ─── Plans ────────────────────────────────────────────────────

  @Get('plans')
  @ApiOperation({
    summary: 'List all available subscription plans',
    description:
      'Returns the static catalog of plans (free, starter, pro, business, etc.) with monthly/annual pricing in INR and the feature limits attached to each. Use this to render the pricing page and the upgrade modal.',
  })
  listPlans() {
    return this.subscriptionService.listPlans();
  }

  // ─── Current Subscription ─────────────────────────────────────

  @Get('current')
  @ApiOperation({
    summary: 'Get current organization subscription details',
    description:
      'Returns the active subscription record for the org — plan id, status, current period start/end, cancel-at-period-end flag and the linked Razorpay subscription id. Used to drive the billing tab and feature-gating throughout the app.',
  })
  async getCurrentSubscription(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.subscriptionService.getCurrentSubscription(orgId, userId);
  }

  // ─── Checkout ─────────────────────────────────────────────────

  @Post('checkout')
  @ApiOperation({
    summary: 'Create a Razorpay checkout session',
    description:
      'Initiates a Razorpay subscription/order and returns the checkout payload the frontend needs to launch the hosted payment modal. After successful payment Razorpay calls back to `POST /subscription/webhook`, which is what actually flips the org\'s plan — do not change plan state from the client.',
  })
  async createCheckout(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateCheckoutDto,
  ) {
    // Validate with Zod
    const parsed = CreateCheckoutDto.parse(dto);
    return this.subscriptionService.createCheckout(orgId, userId, parsed);
  }

  // ─── Webhook ──────────────────────────────────────────────────

  @Public()
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Razorpay webhook handler',
    description:
      'Public endpoint that Razorpay calls for `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `payment.failed` and related events. The HMAC signature in `X-Razorpay-Signature` is verified against the raw body before processing — invalid signatures return 400 and are ignored. Always responds 200 on success so Razorpay does not retry.',
  })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
    @Body() body: any,
  ) {
    // Verify webhook signature
    const rawBody =
      typeof body === 'string' ? body : JSON.stringify(body);

    if (!signature) {
      throw new BadRequestException('Missing webhook signature');
    }

    const isValid = this.razorpayService.verifyWebhookSignature(
      rawBody,
      signature,
    );

    if (!isValid) {
      this.logger.warn('Invalid webhook signature received');
      throw new BadRequestException('Invalid webhook signature');
    }

    const parsed = RazorpayWebhookDto.parse(body);
    await this.subscriptionService.handleWebhook(parsed.event, parsed.payload);

    return { status: 'ok' };
  }

  // ─── Upgrade ──────────────────────────────────────────────────

  @Post('upgrade')
  @ApiOperation({
    summary: 'Upgrade to a higher plan',
    description:
      'Switches the org\'s subscription to a higher-tier plan. The change is effective immediately and Razorpay raises a pro-rated charge for the remainder of the current billing cycle. New feature limits are applied as soon as the webhook confirms the payment.',
  })
  async upgradePlan(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePlanDto,
  ) {
    const parsed = ChangePlanDto.parse(dto);
    return this.subscriptionService.upgradePlan(
      orgId,
      userId,
      parsed.planId as PlanId,
    );
  }

  // ─── Downgrade ────────────────────────────────────────────────

  @Post('downgrade')
  @ApiOperation({
    summary: 'Downgrade to a lower plan (effective next billing cycle)',
    description:
      'Schedules a downgrade to a lower-tier plan. The org keeps current-plan features until the period ends, then transitions to the target plan at renewal. The pending change can be cancelled by calling `POST /subscription/upgrade` back to the original plan before the period end.',
  })
  async downgradePlan(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: ChangePlanDto,
  ) {
    const parsed = ChangePlanDto.parse(dto);
    return this.subscriptionService.downgradePlan(
      orgId,
      userId,
      parsed.planId as PlanId,
    );
  }

  // ─── Cancel ───────────────────────────────────────────────────

  @Post('cancel')
  @ApiOperation({
    summary: 'Cancel subscription',
    description:
      'Cancels the active Razorpay subscription. Pass `cancelAtPeriodEnd: true` to keep paid features until the current period ends, or `false` to terminate immediately. The org falls back to the free plan once cancellation takes effect.',
  })
  async cancelSubscription(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CancelSubscriptionDto,
  ) {
    const parsed = CancelSubscriptionDto.parse(dto);
    return this.subscriptionService.cancelSubscription(
      orgId,
      userId,
      parsed.cancelAtPeriodEnd,
      parsed.reason,
    );
  }

  // ─── Billing History ──────────────────────────────────────────

  @Get('invoices')
  @ApiOperation({
    summary: 'Get billing history / invoices',
    description:
      'Returns the list of past Razorpay payments for this org\'s subscription, with amount, status, period and a link to the Razorpay-hosted receipt PDF. Drives the "Billing history" table on the Settings → Billing screen.',
  })
  async getBillingInvoices(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.subscriptionService.getBillingInvoices(orgId, userId);
  }

  // ─── Usage ────────────────────────────────────────────────────

  @Get('usage')
  @ApiOperation({
    summary: 'Get current usage vs plan limits',
    description:
      'Returns metered usage counters (invoices issued this month, team members, storage used, etc.) compared against the limits of the current plan. Use this to render usage bars and surface upgrade prompts when the org is approaching a cap.',
  })
  async getUsage(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.subscriptionService.getUsage(orgId, userId);
  }
}
