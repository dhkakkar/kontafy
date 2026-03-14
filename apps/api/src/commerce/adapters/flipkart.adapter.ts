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
 * Flipkart Seller API adapter.
 *
 * Expects credentials:
 *   - app_id: string
 *   - app_secret: string
 */

interface FlipkartCredentials extends PlatformCredentials {
  app_id: string;
  app_secret: string;
}

const FLIPKART_AUTH_URL = 'https://api.flipkart.net/oauth-service/oauth/token';
const FLIPKART_API_BASE = 'https://api.flipkart.net/sellers';

@Injectable()
export class FlipkartAdapter implements PlatformAdapter {
  readonly platform = 'flipkart';
  readonly displayName = 'Flipkart Seller Hub';
  private readonly logger = new Logger(FlipkartAdapter.name);

  /**
   * Get access token from Flipkart OAuth.
   */
  private async getAccessToken(creds: FlipkartCredentials): Promise<string> {
    const response = await fetch(
      `${FLIPKART_AUTH_URL}?grant_type=client_credentials&scope=Seller_Api`,
      {
        method: 'GET',
        headers: {
          Authorization:
            'Basic ' +
            Buffer.from(`${creds.app_id}:${creds.app_secret}`).toString('base64'),
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Flipkart token exchange failed: ${error}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  /**
   * Make an authenticated Flipkart API request.
   */
  private async apiRequest(
    creds: FlipkartCredentials,
    path: string,
    options: { method?: string; body?: unknown } = {},
  ): Promise<any> {
    const accessToken = await this.getAccessToken(creds);
    const url = `${FLIPKART_API_BASE}${path}`;

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Flipkart API error (${path}): ${error}`);
      throw new Error(`Flipkart API error: ${response.status}`);
    }

    return response.json();
  }

  async validateCredentials(credentials: PlatformCredentials): Promise<boolean> {
    try {
      const creds = credentials as FlipkartCredentials;
      await this.getAccessToken(creds);
      return true;
    } catch (error) {
      this.logger.warn(`Flipkart credential validation failed: ${(error as Error).message}`);
      return false;
    }
  }

  async fetchOrders(credentials: PlatformCredentials, dateRange: DateRange): Promise<PlatformOrder[]> {
    const creds = credentials as FlipkartCredentials;

    // Flipkart uses a search endpoint with filter
    const searchData = await this.apiRequest(creds, '/orders/search', {
      method: 'POST',
      body: {
        filter: {
          type: 'preDispatch',
          states: ['APPROVED', 'PACKED', 'READY_TO_DISPATCH', 'SHIPPED', 'DELIVERED'],
          orderDate: {
            fromDate: dateRange.from.toISOString(),
            toDate: dateRange.to.toISOString(),
          },
        },
      },
    });

    const orders: PlatformOrder[] = [];
    const shipments = searchData?.shipments ?? [];

    for (const shipment of shipments) {
      const orderItems = shipment.orderItems ?? [];
      const firstItem = orderItems[0] ?? {};

      const subtotal = orderItems.reduce(
        (sum: number, item: any) => sum + (item.priceComponents?.sellingPrice ?? 0),
        0,
      );

      const platformFees = orderItems.reduce(
        (sum: number, item: any) =>
          sum +
          (item.priceComponents?.totalMarketPlaceFee ?? 0) +
          (item.priceComponents?.commission ?? 0),
        0,
      );

      const taxAmount = orderItems.reduce(
        (sum: number, item: any) =>
          sum +
          (item.priceComponents?.cgstAmount ?? 0) +
          (item.priceComponents?.sgstAmount ?? 0) +
          (item.priceComponents?.igstAmount ?? 0),
        0,
      );

      const shippingFees = orderItems.reduce(
        (sum: number, item: any) => sum + (item.priceComponents?.shippingCharge ?? 0),
        0,
      );

      orders.push({
        platform_order_id: shipment.orderId ?? shipment.shipmentId,
        order_date: new Date(firstItem.orderDate ?? Date.now()),
        status: shipment.status ?? 'UNKNOWN',
        customer_name: firstItem.buyerDetails?.name ?? 'Flipkart Customer',
        items: orderItems.map((item: any) => ({
          name: item.title ?? item.sku ?? 'Unknown Item',
          sku: item.sku,
          quantity: item.quantity ?? 1,
          unit_price: (item.priceComponents?.sellingPrice ?? 0) / (item.quantity ?? 1),
          tax_amount:
            (item.priceComponents?.cgstAmount ?? 0) +
            (item.priceComponents?.sgstAmount ?? 0) +
            (item.priceComponents?.igstAmount ?? 0),
          total: item.priceComponents?.sellingPrice ?? 0,
          hsn_code: item.hsnCode,
        })),
        subtotal,
        platform_fees: platformFees,
        shipping_fees: shippingFees,
        tax_amount: taxAmount,
        net_amount: subtotal - platformFees,
        raw_data: shipment,
      });
    }

    return orders;
  }

  async fetchSettlements(credentials: PlatformCredentials, dateRange: DateRange): Promise<PlatformSettlement[]> {
    const creds = credentials as FlipkartCredentials;

    try {
      const data = await this.apiRequest(creds, '/finances/settlements', {
        method: 'POST',
        body: {
          fromDate: dateRange.from.toISOString(),
          toDate: dateRange.to.toISOString(),
        },
      });

      const settlements = data?.settlements ?? [];
      return settlements.map((s: any) => ({
        settlement_id: s.settlementId,
        start_date: new Date(s.startDate),
        end_date: new Date(s.endDate),
        total_amount: s.orderTotal ?? 0,
        order_amount: s.orderTotal ?? 0,
        refund_amount: s.returnAmount ?? 0,
        fees_amount: s.marketplaceFee ?? 0,
        tax_on_fees: s.taxOnFee ?? 0,
        net_amount: s.netPayable ?? 0,
        status: s.status ?? 'unknown',
        raw_data: s,
      }));
    } catch (error) {
      this.logger.warn(`Failed to fetch Flipkart settlements: ${(error as Error).message}`);
      return [];
    }
  }

  mapOrderToInvoice(order: PlatformOrder, prefix: string): InvoiceMapping {
    return {
      invoice_number: `${prefix}-FK-${order.platform_order_id}`,
      type: 'sale',
      date: order.order_date,
      customer_name: order.customer_name,
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
      notes: `Flipkart Order: ${order.platform_order_id}`,
    };
  }
}
