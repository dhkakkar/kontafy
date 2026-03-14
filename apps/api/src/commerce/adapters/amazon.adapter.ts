import { Injectable, Logger } from '@nestjs/common';
import {
  PlatformAdapter,
  PlatformCredentials,
  DateRange,
  PlatformOrder,
  PlatformSettlement,
  InvoiceMapping,
} from './platform.interface';

/**
 * Amazon SP-API adapter.
 *
 * Expects credentials:
 *   - refresh_token: string
 *   - client_id: string
 *   - client_secret: string
 *   - marketplace_id: string (default: A21TJRUUN4KGV for India)
 *   - seller_id: string
 */

interface AmazonCredentials extends PlatformCredentials {
  refresh_token: string;
  client_id: string;
  client_secret: string;
  marketplace_id?: string;
  seller_id: string;
}

const AMAZON_TOKEN_URL = 'https://api.amazon.com/auth/o2/token';
const AMAZON_SP_API_BASE = 'https://sellingpartnerapi-fe.amazon.com';
const DEFAULT_MARKETPLACE_ID = 'A21TJRUUN4KGV'; // Amazon India

@Injectable()
export class AmazonAdapter implements PlatformAdapter {
  readonly platform = 'amazon';
  readonly displayName = 'Amazon Seller Central';
  private readonly logger = new Logger(AmazonAdapter.name);

  /**
   * Exchange refresh token for a short-lived access token.
   */
  private async getAccessToken(creds: AmazonCredentials): Promise<string> {
    const response = await fetch(AMAZON_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: creds.refresh_token,
        client_id: creds.client_id,
        client_secret: creds.client_secret,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Amazon token exchange failed: ${error}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  /**
   * Make an authenticated SP-API request.
   */
  private async apiRequest(
    creds: AmazonCredentials,
    path: string,
    params?: Record<string, string>,
  ): Promise<any> {
    const accessToken = await this.getAccessToken(creds);
    const url = new URL(`${AMAZON_SP_API_BASE}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-amz-access-token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Amazon SP-API error (${path}): ${error}`);
      throw new Error(`Amazon API error: ${response.status}`);
    }

    return response.json();
  }

  async validateCredentials(credentials: PlatformCredentials): Promise<boolean> {
    try {
      const creds = credentials as AmazonCredentials;
      await this.getAccessToken(creds);
      return true;
    } catch (error) {
      this.logger.warn(`Amazon credential validation failed: ${(error as Error).message}`);
      return false;
    }
  }

  async fetchOrders(credentials: PlatformCredentials, dateRange: DateRange): Promise<PlatformOrder[]> {
    const creds = credentials as AmazonCredentials;
    const marketplaceId = creds.marketplace_id || DEFAULT_MARKETPLACE_ID;

    const data = await this.apiRequest(creds, '/orders/v0/orders', {
      MarketplaceIds: marketplaceId,
      CreatedAfter: dateRange.from.toISOString(),
      CreatedBefore: dateRange.to.toISOString(),
      OrderStatuses: 'Shipped,Delivered',
    });

    const orders: PlatformOrder[] = [];

    for (const order of data?.payload?.Orders ?? []) {
      // Fetch order items
      let items: any[] = [];
      try {
        const itemsData = await this.apiRequest(
          creds,
          `/orders/v0/orders/${order.AmazonOrderId}/orderItems`,
        );
        items = itemsData?.payload?.OrderItems ?? [];
      } catch (err) {
        this.logger.warn(`Failed to fetch items for order ${order.AmazonOrderId}`);
      }

      const subtotal = items.reduce(
        (sum: number, item: any) =>
          sum + parseFloat(item.ItemPrice?.Amount ?? '0'),
        0,
      );

      const taxAmount = items.reduce(
        (sum: number, item: any) =>
          sum + parseFloat(item.ItemTax?.Amount ?? '0'),
        0,
      );

      const platformFees = items.reduce(
        (sum: number, item: any) =>
          sum + parseFloat(item.PromotionDiscount?.Amount ?? '0'),
        0,
      );

      orders.push({
        platform_order_id: order.AmazonOrderId,
        order_date: new Date(order.PurchaseDate),
        status: order.OrderStatus,
        customer_name: order.BuyerInfo?.BuyerName ?? 'Amazon Customer',
        customer_email: order.BuyerInfo?.BuyerEmail,
        items: items.map((item: any) => ({
          name: item.Title ?? 'Unknown Item',
          sku: item.SellerSKU,
          quantity: parseInt(item.QuantityOrdered ?? '1', 10),
          unit_price: parseFloat(item.ItemPrice?.Amount ?? '0') / parseInt(item.QuantityOrdered ?? '1', 10),
          tax_amount: parseFloat(item.ItemTax?.Amount ?? '0'),
          total: parseFloat(item.ItemPrice?.Amount ?? '0') + parseFloat(item.ItemTax?.Amount ?? '0'),
          hsn_code: undefined,
        })),
        subtotal,
        platform_fees: platformFees,
        shipping_fees: parseFloat(order.ShippingPrice?.Amount ?? '0'),
        tax_amount: taxAmount,
        net_amount: subtotal + taxAmount - platformFees,
        settlement_id: undefined,
        raw_data: order,
      });
    }

    return orders;
  }

  async fetchSettlements(credentials: PlatformCredentials, dateRange: DateRange): Promise<PlatformSettlement[]> {
    const creds = credentials as AmazonCredentials;

    try {
      const data = await this.apiRequest(creds, '/finances/v0/financialEventGroups', {
        FinancialEventGroupStartedAfter: dateRange.from.toISOString(),
        FinancialEventGroupStartedBefore: dateRange.to.toISOString(),
      });

      const groups = data?.payload?.FinancialEventGroupList ?? [];

      return groups.map((group: any) => ({
        settlement_id: group.FinancialEventGroupId,
        start_date: new Date(group.FinancialEventGroupStart),
        end_date: new Date(group.FinancialEventGroupEnd ?? group.FinancialEventGroupStart),
        total_amount: parseFloat(group.OriginalTotal?.CurrencyAmount ?? '0'),
        order_amount: parseFloat(group.OriginalTotal?.CurrencyAmount ?? '0'),
        refund_amount: 0,
        fees_amount: parseFloat(group.ConvertedTotal?.CurrencyAmount ?? '0') -
          parseFloat(group.OriginalTotal?.CurrencyAmount ?? '0'),
        tax_on_fees: 0,
        net_amount: parseFloat(group.ConvertedTotal?.CurrencyAmount ?? '0'),
        status: group.ProcessingStatus ?? 'unknown',
        raw_data: group,
      }));
    } catch (error) {
      this.logger.warn(`Failed to fetch Amazon settlements: ${(error as Error).message}`);
      return [];
    }
  }

  mapOrderToInvoice(order: PlatformOrder, prefix: string): InvoiceMapping {
    return {
      invoice_number: `${prefix}-AMZ-${order.platform_order_id}`,
      type: 'sale',
      date: order.order_date,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      items: order.items.map((item) => ({
        description: item.name,
        hsn_code: item.hsn_code,
        quantity: item.quantity,
        rate: item.unit_price,
        tax_amount: item.tax_amount,
        total: item.total,
      })),
      subtotal: order.subtotal,
      tax_amount: order.tax_amount,
      total: order.net_amount + order.platform_fees,
      platform_fees: order.platform_fees,
      notes: `Amazon Order: ${order.platform_order_id}`,
    };
  }
}
