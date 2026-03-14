import { Injectable, Logger } from '@nestjs/common';
import {
  PlatformAdapter,
  PlatformCredentials,
  DateRange,
  PlatformOrder,
  PlatformSettlement,
  PlatformProduct,
  InvoiceMapping,
} from './platform.interface';

/**
 * Shopify Admin API adapter (GraphQL).
 *
 * Expects credentials:
 *   - shop_domain: string (e.g. "my-store.myshopify.com")
 *   - access_token: string
 *   - api_version: string (default: "2024-01")
 */

interface ShopifyCredentials extends PlatformCredentials {
  shop_domain: string;
  access_token: string;
  api_version?: string;
}

const DEFAULT_API_VERSION = '2024-01';

@Injectable()
export class ShopifyAdapter implements PlatformAdapter {
  readonly platform = 'shopify';
  readonly displayName = 'Shopify';
  private readonly logger = new Logger(ShopifyAdapter.name);

  private getApiUrl(creds: ShopifyCredentials): string {
    const version = creds.api_version || DEFAULT_API_VERSION;
    return `https://${creds.shop_domain}/admin/api/${version}/graphql.json`;
  }

  /**
   * Execute a GraphQL query against the Shopify Admin API.
   */
  private async graphql(
    creds: ShopifyCredentials,
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<any> {
    const url = this.getApiUrl(creds);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': creds.access_token,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Shopify GraphQL error: ${error}`);
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.errors?.length) {
      this.logger.error(`Shopify GraphQL errors: ${JSON.stringify(data.errors)}`);
      throw new Error(`Shopify GraphQL error: ${data.errors[0].message}`);
    }

    return data.data;
  }

  async validateCredentials(credentials: PlatformCredentials): Promise<boolean> {
    try {
      const creds = credentials as ShopifyCredentials;
      const data = await this.graphql(creds, `{ shop { name } }`);
      return !!data?.shop?.name;
    } catch (error) {
      this.logger.warn(`Shopify credential validation failed: ${(error as Error).message}`);
      return false;
    }
  }

  async fetchOrders(credentials: PlatformCredentials, dateRange: DateRange): Promise<PlatformOrder[]> {
    const creds = credentials as ShopifyCredentials;

    const query = `
      query FetchOrders($query: String!, $first: Int!) {
        orders(first: $first, query: $query) {
          edges {
            node {
              id
              name
              createdAt
              displayFinancialStatus
              displayFulfillmentStatus
              totalPriceSet { shopMoney { amount currencyCode } }
              subtotalPriceSet { shopMoney { amount currencyCode } }
              totalTaxSet { shopMoney { amount currencyCode } }
              totalShippingPriceSet { shopMoney { amount currencyCode } }
              customer {
                firstName
                lastName
                email
                phone
              }
              lineItems(first: 50) {
                edges {
                  node {
                    title
                    sku
                    quantity
                    originalUnitPriceSet { shopMoney { amount } }
                    totalDiscountSet { shopMoney { amount } }
                    taxLines { priceSet { shopMoney { amount } } }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const filterQuery = `created_at:>='${dateRange.from.toISOString()}' created_at:<='${dateRange.to.toISOString()}'`;

    const data = await this.graphql(creds, query, {
      query: filterQuery,
      first: 100,
    });

    const orders: PlatformOrder[] = [];

    for (const edge of data?.orders?.edges ?? []) {
      const order = edge.node;
      const customer = order.customer;
      const customerName = customer
        ? `${customer.firstName ?? ''} ${customer.lastName ?? ''}`.trim()
        : 'Shopify Customer';

      const lineItems = (order.lineItems?.edges ?? []).map((e: any) => e.node);
      const subtotal = parseFloat(order.subtotalPriceSet?.shopMoney?.amount ?? '0');
      const taxAmount = parseFloat(order.totalTaxSet?.shopMoney?.amount ?? '0');
      const shippingFees = parseFloat(order.totalShippingPriceSet?.shopMoney?.amount ?? '0');
      const total = parseFloat(order.totalPriceSet?.shopMoney?.amount ?? '0');

      // Shopify doesn't have platform_fees in orders — those come from payouts
      orders.push({
        platform_order_id: order.name, // e.g., "#1001"
        order_date: new Date(order.createdAt),
        status: order.displayFulfillmentStatus ?? 'UNFULFILLED',
        customer_name: customerName,
        customer_email: customer?.email,
        customer_phone: customer?.phone,
        items: lineItems.map((item: any) => {
          const unitPrice = parseFloat(item.originalUnitPriceSet?.shopMoney?.amount ?? '0');
          const itemTax = (item.taxLines ?? []).reduce(
            (sum: number, tl: any) => sum + parseFloat(tl.priceSet?.shopMoney?.amount ?? '0'),
            0,
          );
          return {
            name: item.title,
            sku: item.sku,
            quantity: item.quantity,
            unit_price: unitPrice,
            tax_amount: itemTax,
            total: unitPrice * item.quantity + itemTax,
          };
        }),
        subtotal,
        platform_fees: 0,
        shipping_fees: shippingFees,
        tax_amount: taxAmount,
        net_amount: total,
        raw_data: order,
      });
    }

    return orders;
  }

  async fetchSettlements(credentials: PlatformCredentials, dateRange: DateRange): Promise<PlatformSettlement[]> {
    const creds = credentials as ShopifyCredentials;

    // Use REST API for payouts (not available via GraphQL in all versions)
    const version = creds.api_version || DEFAULT_API_VERSION;
    const url = `https://${creds.shop_domain}/admin/api/${version}/shopify_payments/payouts.json?date_min=${dateRange.from.toISOString().split('T')[0]}&date_max=${dateRange.to.toISOString().split('T')[0]}`;

    try {
      const response = await fetch(url, {
        headers: { 'X-Shopify-Access-Token': creds.access_token },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const payouts = data?.payouts ?? [];

      return payouts.map((p: any) => ({
        settlement_id: String(p.id),
        start_date: new Date(p.date),
        end_date: new Date(p.date),
        total_amount: parseFloat(p.amount ?? '0'),
        order_amount: parseFloat(p.amount ?? '0'),
        refund_amount: 0,
        fees_amount: 0,
        tax_on_fees: 0,
        net_amount: parseFloat(p.amount ?? '0'),
        status: p.status,
        raw_data: p,
      }));
    } catch (error) {
      this.logger.warn(`Failed to fetch Shopify payouts: ${(error as Error).message}`);
      return [];
    }
  }

  async fetchProducts(credentials: PlatformCredentials): Promise<PlatformProduct[]> {
    const creds = credentials as ShopifyCredentials;

    const query = `
      query {
        products(first: 100) {
          edges {
            node {
              id
              title
              status
              variants(first: 10) {
                edges {
                  node {
                    sku
                    price
                  }
                }
              }
            }
          }
        }
      }
    `;

    const data = await this.graphql(creds, query);
    const products: PlatformProduct[] = [];

    for (const edge of data?.products?.edges ?? []) {
      const product = edge.node;
      const firstVariant = product.variants?.edges?.[0]?.node;

      products.push({
        platform_product_id: product.id,
        name: product.title,
        sku: firstVariant?.sku,
        price: parseFloat(firstVariant?.price ?? '0'),
        status: product.status,
        raw_data: product,
      });
    }

    return products;
  }

  mapOrderToInvoice(order: PlatformOrder, prefix: string): InvoiceMapping {
    return {
      invoice_number: `${prefix}-SHOP-${order.platform_order_id.replace('#', '')}`,
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
      platform_fees: order.platform_fees,
      notes: `Shopify Order: ${order.platform_order_id}`,
    };
  }
}
