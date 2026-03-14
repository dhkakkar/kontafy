/**
 * Common interface that all e-commerce platform adapters must implement.
 *
 * Each adapter handles the platform-specific API calls and maps
 * external data into Kontafy's internal format.
 */

export interface PlatformCredentials {
  /** Platform-specific auth fields (API keys, tokens, etc.) */
  [key: string]: unknown;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface PlatformOrder {
  platform_order_id: string;
  order_date: Date;
  status: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  items: PlatformOrderItem[];
  subtotal: number;
  platform_fees: number;
  shipping_fees: number;
  tax_amount: number;
  net_amount: number;
  settlement_id?: string;
  raw_data: Record<string, unknown>;
}

export interface PlatformOrderItem {
  name: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  tax_amount: number;
  total: number;
  hsn_code?: string;
}

export interface PlatformSettlement {
  settlement_id: string;
  start_date: Date;
  end_date: Date;
  total_amount: number;
  order_amount: number;
  refund_amount: number;
  fees_amount: number;
  tax_on_fees: number;
  net_amount: number;
  status: string;
  raw_data: Record<string, unknown>;
}

export interface PlatformProduct {
  platform_product_id: string;
  name: string;
  sku?: string;
  price: number;
  status: string;
  raw_data: Record<string, unknown>;
}

export interface InvoiceMapping {
  invoice_number: string;
  type: string;
  date: Date;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  items: {
    description: string;
    hsn_code?: string;
    quantity: number;
    rate: number;
    tax_amount: number;
    total: number;
  }[];
  subtotal: number;
  tax_amount: number;
  total: number;
  platform_fees: number;
  notes?: string;
}

export interface PlatformAdapter {
  /** Unique platform identifier */
  readonly platform: string;

  /** Human-readable display name */
  readonly displayName: string;

  /**
   * Validate that the provided credentials are correct
   * by making a test API call.
   */
  validateCredentials(credentials: PlatformCredentials): Promise<boolean>;

  /**
   * Fetch orders from the platform within the given date range.
   */
  fetchOrders(credentials: PlatformCredentials, dateRange: DateRange): Promise<PlatformOrder[]>;

  /**
   * Fetch settlement/payout data from the platform.
   * Not all platforms support this — returns empty array if unsupported.
   */
  fetchSettlements(credentials: PlatformCredentials, dateRange: DateRange): Promise<PlatformSettlement[]>;

  /**
   * Fetch products from the platform.
   * Not all platforms support this — returns empty array if unsupported.
   */
  fetchProducts?(credentials: PlatformCredentials): Promise<PlatformProduct[]>;

  /**
   * Map a platform order into Kontafy's invoice format.
   */
  mapOrderToInvoice(order: PlatformOrder, prefix: string): InvoiceMapping;
}
