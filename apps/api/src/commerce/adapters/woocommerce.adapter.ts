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
 * WooCommerce REST API adapter.
 *
 * Expects credentials:
 *   - store_url: string (e.g. "https://mystore.com")
 *   - consumer_key: string
 *   - consumer_secret: string
 */

interface WooCommerceCredentials extends PlatformCredentials {
  store_url: string;
  consumer_key: string;
  consumer_secret: string;
}

@Injectable()
export class WooCommerceAdapter implements PlatformAdapter {
  readonly platform = 'woocommerce';
  readonly displayName = 'WooCommerce';
  private readonly logger = new Logger(WooCommerceAdapter.name);

  /**
   * Make an authenticated WooCommerce REST API request.
   */
  private async apiRequest(
    creds: WooCommerceCredentials,
    endpoint: string,
    params?: Record<string, string>,
  ): Promise<any> {
    const baseUrl = creds.store_url.replace(/\/$/, '');
    const url = new URL(`${baseUrl}/wp-json/wc/v3${endpoint}`);

    // WooCommerce basic auth via query params
    url.searchParams.set('consumer_key', creds.consumer_key);
    url.searchParams.set('consumer_secret', creds.consumer_secret);

    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const response = await fetch(url.toString(), {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`WooCommerce API error (${endpoint}): ${error}`);
      throw new Error(`WooCommerce API error: ${response.status}`);
    }

    return response.json();
  }

  async validateCredentials(credentials: PlatformCredentials): Promise<boolean> {
    try {
      const creds = credentials as WooCommerceCredentials;
      const data = await this.apiRequest(creds, '/system_status');
      return !!data?.environment;
    } catch (error) {
      this.logger.warn(`WooCommerce credential validation failed: ${(error as Error).message}`);
      return false;
    }
  }

  async fetchOrders(credentials: PlatformCredentials, dateRange: DateRange): Promise<PlatformOrder[]> {
    const creds = credentials as WooCommerceCredentials;

    const data = await this.apiRequest(creds, '/orders', {
      after: dateRange.from.toISOString(),
      before: dateRange.to.toISOString(),
      per_page: '100',
      status: 'completed,processing',
      orderby: 'date',
      order: 'desc',
    });

    const orders: PlatformOrder[] = (data ?? []).map((order: any) => {
      const billing = order.billing ?? {};
      const customerName =
        `${billing.first_name ?? ''} ${billing.last_name ?? ''}`.trim() ||
        'WooCommerce Customer';

      const lineItems = order.line_items ?? [];

      const subtotal = lineItems.reduce(
        (sum: number, item: any) => sum + parseFloat(item.subtotal ?? '0'),
        0,
      );

      const taxAmount = lineItems.reduce(
        (sum: number, item: any) => sum + parseFloat(item.subtotal_tax ?? '0'),
        0,
      );

      const shippingFees = (order.shipping_lines ?? []).reduce(
        (sum: number, line: any) => sum + parseFloat(line.total ?? '0'),
        0,
      );

      // WooCommerce doesn't have platform fees
      const total = parseFloat(order.total ?? '0');

      return {
        platform_order_id: String(order.id),
        order_date: new Date(order.date_created_gmt ?? order.date_created),
        status: order.status,
        customer_name: customerName,
        customer_email: billing.email,
        customer_phone: billing.phone,
        items: lineItems.map((item: any) => ({
          name: item.name,
          sku: item.sku,
          quantity: item.quantity,
          unit_price: parseFloat(item.price ?? '0'),
          tax_amount: parseFloat(item.subtotal_tax ?? '0'),
          total: parseFloat(item.total ?? '0'),
          hsn_code: undefined,
        })),
        subtotal,
        platform_fees: 0,
        shipping_fees: shippingFees,
        tax_amount: taxAmount,
        net_amount: total,
        raw_data: order,
      };
    });

    return orders;
  }

  async fetchSettlements(
    _credentials: PlatformCredentials,
    _dateRange: DateRange,
  ): Promise<PlatformSettlement[]> {
    // WooCommerce does not have a native settlements/payouts API
    // Payment gateway settlement data would need platform-specific plugins
    return [];
  }

  mapOrderToInvoice(order: PlatformOrder, prefix: string): InvoiceMapping {
    return {
      invoice_number: `${prefix}-WOO-${order.platform_order_id}`,
      type: 'sale',
      date: order.order_date,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
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
      total: order.net_amount,
      platform_fees: 0,
      notes: `WooCommerce Order: #${order.platform_order_id}`,
    };
  }
}
