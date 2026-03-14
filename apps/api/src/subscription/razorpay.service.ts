import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface RazorpaySubscription {
  id: string;
  plan_id: string;
  status: string;
  current_start: number | null;
  current_end: number | null;
  ended_at: number | null;
  short_url: string;
  total_count: number;
  paid_count: number;
  charge_at: number | null;
  customer_id?: string;
}

interface RazorpayPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  description: string;
  created_at: number;
  invoice_id: string | null;
}

interface RazorpayPlan {
  id: string;
  entity: string;
  interval: number;
  period: string;
  item: {
    id: string;
    active: boolean;
    amount: number;
    unit_amount: number;
    currency: string;
    name: string;
    description: string;
  };
}

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;
  private readonly baseUrl = 'https://api.razorpay.com/v1';

  constructor(private readonly configService: ConfigService) {
    this.keyId = this.configService.get<string>('RAZORPAY_KEY_ID', '');
    this.keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET', '');
    this.webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET', '');
  }

  // ───────────────────────────────────────────────────────
  // Auth Header
  // ───────────────────────────────────────────────────────

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
    return `Basic ${credentials}`;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, any>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: this.getAuthHeader(),
      'Content-Type': 'application/json',
    };

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        this.logger.error(
          `Razorpay API error: ${response.status} ${JSON.stringify(errorBody)}`,
        );
        throw new BadRequestException(
          errorBody?.error?.description || 'Razorpay API request failed',
        );
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Razorpay API request failed', error);
      throw new InternalServerErrorException('Payment gateway unavailable');
    }
  }

  // ───────────────────────────────────────────────────────
  // Plans
  // ───────────────────────────────────────────────────────

  async createPlan(params: {
    name: string;
    description: string;
    amount: number; // in paise
    currency?: string;
    period: 'monthly' | 'yearly';
  }): Promise<RazorpayPlan> {
    return this.request<RazorpayPlan>('POST', '/plans', {
      period: params.period === 'monthly' ? 'monthly' : 'yearly',
      interval: 1,
      item: {
        name: params.name,
        amount: params.amount,
        currency: params.currency || 'INR',
        description: params.description,
      },
    });
  }

  async getPlan(planId: string): Promise<RazorpayPlan> {
    return this.request<RazorpayPlan>('GET', `/plans/${planId}`);
  }

  // ───────────────────────────────────────────────────────
  // Subscriptions
  // ───────────────────────────────────────────────────────

  async createSubscription(params: {
    planId: string;
    totalCount?: number;
    quantity?: number;
    notes?: Record<string, string>;
    customerNotify?: boolean;
  }): Promise<RazorpaySubscription> {
    return this.request<RazorpaySubscription>('POST', '/subscriptions', {
      plan_id: params.planId,
      total_count: params.totalCount || 120, // ~10 years of monthly billing
      quantity: params.quantity || 1,
      customer_notify: params.customerNotify ?? 1,
      notes: params.notes || {},
    });
  }

  async getSubscription(subscriptionId: string): Promise<RazorpaySubscription> {
    return this.request<RazorpaySubscription>(
      'GET',
      `/subscriptions/${subscriptionId}`,
    );
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelAtCycleEnd: boolean = true,
  ): Promise<RazorpaySubscription> {
    return this.request<RazorpaySubscription>(
      'POST',
      `/subscriptions/${subscriptionId}/cancel`,
      {
        cancel_at_cycle_end: cancelAtCycleEnd ? 1 : 0,
      },
    );
  }

  async pauseSubscription(subscriptionId: string): Promise<RazorpaySubscription> {
    return this.request<RazorpaySubscription>(
      'POST',
      `/subscriptions/${subscriptionId}/pause`,
    );
  }

  async resumeSubscription(subscriptionId: string): Promise<RazorpaySubscription> {
    return this.request<RazorpaySubscription>(
      'POST',
      `/subscriptions/${subscriptionId}/resume`,
    );
  }

  // ───────────────────────────────────────────────────────
  // Payments
  // ───────────────────────────────────────────────────────

  async getPayment(paymentId: string): Promise<RazorpayPayment> {
    return this.request<RazorpayPayment>('GET', `/payments/${paymentId}`);
  }

  async getSubscriptionPayments(
    subscriptionId: string,
  ): Promise<{ items: RazorpayPayment[]; count: number }> {
    return this.request<{ items: RazorpayPayment[]; count: number }>(
      'GET',
      `/subscriptions/${subscriptionId}/payments`,
    );
  }

  // ───────────────────────────────────────────────────────
  // Webhook Verification
  // ───────────────────────────────────────────────────────

  verifyWebhookSignature(body: string, signature: string): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('RAZORPAY_WEBHOOK_SECRET not configured');
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(body)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error);
      return false;
    }
  }

  /**
   * Get the Razorpay key ID for client-side checkout.
   */
  getKeyId(): string {
    return this.keyId;
  }

  // ───────────────────────────────────────────────────────
  // Proration
  // ───────────────────────────────────────────────────────

  /**
   * Calculate proration amount for mid-cycle upgrade.
   * Returns the amount in INR (not paise).
   */
  calculateProration(params: {
    currentPlanPrice: number;
    newPlanPrice: number;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  }): number {
    const now = new Date();
    const totalDays = Math.ceil(
      (params.currentPeriodEnd.getTime() - params.currentPeriodStart.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    const remainingDays = Math.ceil(
      (params.currentPeriodEnd.getTime() - now.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    if (remainingDays <= 0 || totalDays <= 0) return 0;

    const dailyRateCurrent = params.currentPlanPrice / totalDays;
    const dailyRateNew = params.newPlanPrice / totalDays;
    const prorationAmount = (dailyRateNew - dailyRateCurrent) * remainingDays;

    return Math.max(0, Math.round(prorationAmount * 100) / 100);
  }
}
