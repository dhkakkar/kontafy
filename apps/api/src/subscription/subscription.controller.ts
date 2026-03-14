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
  @ApiOperation({ summary: 'List all available subscription plans' })
  listPlans() {
    return this.subscriptionService.listPlans();
  }

  // ─── Current Subscription ─────────────────────────────────────

  @Get('current')
  @ApiOperation({ summary: 'Get current organization subscription details' })
  async getCurrentSubscription(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.subscriptionService.getCurrentSubscription(orgId, userId);
  }

  // ─── Checkout ─────────────────────────────────────────────────

  @Post('checkout')
  @ApiOperation({ summary: 'Create a Razorpay checkout session' })
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
  @ApiOperation({ summary: 'Razorpay webhook handler' })
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
  @ApiOperation({ summary: 'Upgrade to a higher plan' })
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
  @ApiOperation({ summary: 'Downgrade to a lower plan (effective next billing cycle)' })
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
  @ApiOperation({ summary: 'Cancel subscription' })
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
  @ApiOperation({ summary: 'Get billing history / invoices' })
  async getBillingInvoices(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.subscriptionService.getBillingInvoices(orgId, userId);
  }

  // ─── Usage ────────────────────────────────────────────────────

  @Get('usage')
  @ApiOperation({ summary: 'Get current usage vs plan limits' })
  async getUsage(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.subscriptionService.getUsage(orgId, userId);
  }
}
