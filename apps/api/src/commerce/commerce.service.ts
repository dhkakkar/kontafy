import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AmazonAdapter } from './adapters/amazon.adapter';
import { FlipkartAdapter } from './adapters/flipkart.adapter';
import { ShopifyAdapter } from './adapters/shopify.adapter';
import { WooCommerceAdapter } from './adapters/woocommerce.adapter';
import {
  PlatformAdapter,
  PlatformCredentials,
  DateRange,
  PlatformOrder,
} from './adapters/platform.interface';
import {
  Platform,
  ConnectPlatformDto,
  SyncTriggerDto,
  OrdersQueryDto,
  SyncHistoryQueryDto,
} from './dto/commerce.dto';

@Injectable()
export class CommerceService {
  private readonly logger = new Logger(CommerceService.name);
  private readonly adapters: Map<string, PlatformAdapter>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly amazonAdapter: AmazonAdapter,
    private readonly flipkartAdapter: FlipkartAdapter,
    private readonly shopifyAdapter: ShopifyAdapter,
    private readonly wooCommerceAdapter: WooCommerceAdapter,
  ) {
    this.adapters = new Map<string, PlatformAdapter>([
      ['amazon', this.amazonAdapter],
      ['flipkart', this.flipkartAdapter],
      ['shopify', this.shopifyAdapter],
      ['woocommerce', this.wooCommerceAdapter],
    ]);
  }

  /**
   * Get the adapter for a platform, or throw if unknown.
   */
  private getAdapter(platform: string): PlatformAdapter {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      throw new BadRequestException(`Unsupported platform: ${platform}`);
    }
    return adapter;
  }

  /**
   * Get a connection by org + platform, or throw NotFoundException.
   */
  private async getConnection(orgId: string, platform: string) {
    const connection = await this.prisma.marketplaceConnection.findFirst({
      where: { org_id: orgId, platform, is_active: true },
    });

    if (!connection) {
      throw new NotFoundException(`No active ${platform} connection found`);
    }

    return connection;
  }

  // ─── Connection Management ──────────────────────────────────────────

  /**
   * Connect a new e-commerce platform.
   * Validates credentials before storing.
   */
  async connectPlatform(orgId: string, data: ConnectPlatformDto) {
    const adapter = this.getAdapter(data.platform);

    // Check for existing active connection
    const existing = await this.prisma.marketplaceConnection.findFirst({
      where: { org_id: orgId, platform: data.platform, is_active: true },
    });

    if (existing) {
      throw new ConflictException(
        `${adapter.displayName} is already connected. Disconnect first to reconnect.`,
      );
    }

    // Validate credentials with the platform
    const valid = await adapter.validateCredentials(data.credentials as PlatformCredentials);
    if (!valid) {
      throw new BadRequestException(
        `Invalid ${adapter.displayName} credentials. Please check and try again.`,
      );
    }

    const connection = await this.prisma.marketplaceConnection.create({
      data: {
        org_id: orgId,
        platform: data.platform,
        store_name: data.store_name,
        credentials: data.credentials as any,
        settings: (data.settings as any) ?? {},
        is_active: true,
      },
    });

    this.logger.log(
      `Connected ${adapter.displayName} for org ${orgId} (connection: ${connection.id})`,
    );

    return {
      id: connection.id,
      platform: connection.platform,
      store_name: connection.store_name,
      is_active: connection.is_active,
      created_at: connection.created_at,
    };
  }

  /**
   * Disconnect a platform (soft-delete by setting is_active = false).
   */
  async disconnectPlatform(orgId: string, platform: Platform) {
    const connection = await this.getConnection(orgId, platform);

    await this.prisma.marketplaceConnection.update({
      where: { id: connection.id },
      data: { is_active: false, credentials: {} },
    });

    this.logger.log(`Disconnected ${platform} for org ${orgId}`);

    return { message: `${platform} disconnected successfully` };
  }

  // ─── Sync Operations ───────────────────────────────────────────────

  /**
   * Sync orders from a platform.
   * Creates/updates MarketplaceOrder records and optionally creates Invoices.
   */
  async syncOrders(orgId: string, platform: Platform, params?: SyncTriggerDto) {
    const connection = await this.getConnection(orgId, platform);
    const adapter = this.getAdapter(platform);
    const credentials = connection.credentials as PlatformCredentials;

    // Default date range: last 7 days
    const dateRange: DateRange = {
      from: params?.date_from ? new Date(params.date_from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      to: params?.date_to ? new Date(params.date_to) : new Date(),
    };

    // Create sync log
    const syncLog = await this.prisma.ecommerceSyncLog.create({
      data: {
        org_id: orgId,
        connection_id: connection.id,
        type: 'orders',
        status: 'running',
      },
    });

    try {
      const platformOrders = await adapter.fetchOrders(credentials, dateRange);

      let ordersCreated = 0;
      let ordersUpdated = 0;
      const errors: { order_id: string; error: string }[] = [];

      for (const order of platformOrders) {
        try {
          const result = await this.upsertOrder(orgId, connection.id, platform, adapter, order);
          if (result === 'created') ordersCreated++;
          else ordersUpdated++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          errors.push({ order_id: order.platform_order_id, error: msg });
          this.logger.warn(
            `Failed to process ${platform} order ${order.platform_order_id}: ${msg}`,
          );
        }
      }

      // Update sync log + connection
      await this.prisma.ecommerceSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: errors.length > 0 ? 'partial' : 'success',
          orders_created: ordersCreated,
          orders_updated: ordersUpdated,
          errors: errors.length > 0 ? errors : undefined,
          completed_at: new Date(),
        },
      });

      await this.prisma.marketplaceConnection.update({
        where: { id: connection.id },
        data: { last_synced_at: new Date() },
      });

      this.logger.log(
        `Sync complete for ${platform} (org: ${orgId}): ${ordersCreated} created, ${ordersUpdated} updated, ${errors.length} errors`,
      );

      return {
        platform,
        orders_fetched: platformOrders.length,
        orders_created: ordersCreated,
        orders_updated: ordersUpdated,
        errors: errors.length,
        sync_log_id: syncLog.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      this.logger.error(`Sync failed for ${platform} (org: ${orgId}): ${errorMessage}`);

      await this.prisma.ecommerceSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'failed',
          errors: [{ error: errorMessage }],
          completed_at: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Upsert a single order — creates or updates the MarketplaceOrder.
   */
  private async upsertOrder(
    orgId: string,
    connectionId: string,
    platform: string,
    adapter: PlatformAdapter,
    order: PlatformOrder,
  ): Promise<'created' | 'updated'> {
    const existing = await this.prisma.marketplaceOrder.findFirst({
      where: {
        org_id: orgId,
        external_order_id: order.platform_order_id,
        platform,
      },
    });

    const orderData = {
      org_id: orgId,
      connection_id: connectionId,
      external_order_id: order.platform_order_id,
      platform,
      order_date: order.order_date,
      status: order.status,
      items: order.items as any,
      subtotal: order.subtotal,
      platform_fees: order.platform_fees,
      shipping_fees: order.shipping_fees,
      tax_amount: order.tax_amount,
      net_amount: order.net_amount,
      settlement_id: order.settlement_id,
      synced_at: new Date(),
    };

    if (existing) {
      await this.prisma.marketplaceOrder.update({
        where: { id: existing.id },
        data: orderData,
      });
      return 'updated';
    }

    // Create new order — also create a Contact + Invoice if org settings allow
    const newOrder = await this.prisma.marketplaceOrder.create({
      data: orderData,
    });

    // Auto-create invoice from order
    try {
      await this.createInvoiceFromOrder(orgId, newOrder.id, adapter, order);
    } catch (err) {
      this.logger.warn(
        `Failed to auto-create invoice for order ${order.platform_order_id}: ${(err as Error).message}`,
      );
    }

    return 'created';
  }

  /**
   * Creates a Kontafy Invoice from a marketplace order.
   */
  private async createInvoiceFromOrder(
    orgId: string,
    marketplaceOrderId: string,
    adapter: PlatformAdapter,
    order: PlatformOrder,
  ) {
    // Find or create contact for the customer
    let contact = await this.prisma.contact.findFirst({
      where: {
        org_id: orgId,
        name: order.customer_name,
        type: 'customer',
      },
    });

    if (!contact) {
      contact = await this.prisma.contact.create({
        data: {
          org_id: orgId,
          type: 'customer',
          name: order.customer_name,
          email: order.customer_email,
          phone: order.customer_phone,
        },
      });
    }

    // Get org prefix for invoice numbering
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });

    const prefix = (org?.name ?? 'KTF')
      .replace(/[^A-Z0-9]/gi, '')
      .substring(0, 3)
      .toUpperCase();

    const invoiceData = adapter.mapOrderToInvoice(order, prefix);

    // Create the invoice
    const invoice = await this.prisma.invoice.create({
      data: {
        org_id: orgId,
        invoice_number: invoiceData.invoice_number,
        type: invoiceData.type,
        status: 'paid', // Marketplace orders are typically pre-paid
        contact_id: contact.id,
        date: invoiceData.date,
        subtotal: invoiceData.subtotal,
        tax_amount: invoiceData.tax_amount,
        total: invoiceData.total,
        amount_paid: invoiceData.total,
        balance_due: 0,
        notes: invoiceData.notes,
        items: {
          create: invoiceData.items.map((item) => ({
            description: item.description,
            hsn_code: item.hsn_code,
            quantity: item.quantity,
            unit: 'pcs',
            rate: item.rate,
            taxable_amount: item.rate * item.quantity,
            cgst_amount: 0,
            sgst_amount: 0,
            igst_amount: item.tax_amount,
            total: item.total,
          })),
        },
      },
    });

    // Link invoice to the marketplace order
    await this.prisma.marketplaceOrder.update({
      where: { id: marketplaceOrderId },
      data: { invoice_id: invoice.id },
    });
  }

  /**
   * Sync settlement data from a platform.
   */
  async syncSettlements(orgId: string, platform: Platform, params?: SyncTriggerDto) {
    const connection = await this.getConnection(orgId, platform);
    const adapter = this.getAdapter(platform);
    const credentials = connection.credentials as PlatformCredentials;

    const dateRange: DateRange = {
      from: params?.date_from ? new Date(params.date_from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: params?.date_to ? new Date(params.date_to) : new Date(),
    };

    const syncLog = await this.prisma.ecommerceSyncLog.create({
      data: {
        org_id: orgId,
        connection_id: connection.id,
        type: 'settlements',
        status: 'running',
      },
    });

    try {
      const settlements = await adapter.fetchSettlements(credentials, dateRange);

      await this.prisma.ecommerceSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'success',
          orders_created: settlements.length,
          completed_at: new Date(),
        },
      });

      return {
        platform,
        settlements_fetched: settlements.length,
        settlements,
        sync_log_id: syncLog.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.prisma.ecommerceSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'failed',
          errors: [{ error: errorMessage }],
          completed_at: new Date(),
        },
      });

      throw error;
    }
  }

  // ─── Read Operations ───────────────────────────────────────────────

  /**
   * Get connection status for all platforms in an org.
   */
  async getConnectionStatus(orgId: string) {
    const connections = await this.prisma.marketplaceConnection.findMany({
      where: { org_id: orgId, is_active: true },
      select: {
        id: true,
        platform: true,
        store_name: true,
        is_active: true,
        last_synced_at: true,
        created_at: true,
      },
    });

    // Build a map of all platforms with their connection status
    const allPlatforms = ['amazon', 'flipkart', 'shopify', 'woocommerce'];
    const connMap = new Map(connections.map((c) => [c.platform, c]));

    return allPlatforms.map((platform) => {
      const conn = connMap.get(platform);
      const adapter = this.adapters.get(platform);
      return {
        platform,
        display_name: adapter?.displayName ?? platform,
        connected: !!conn,
        connection_id: conn?.id ?? null,
        store_name: conn?.store_name ?? null,
        last_synced_at: conn?.last_synced_at ?? null,
        connected_at: conn?.created_at ?? null,
      };
    });
  }

  /**
   * List synced orders with pagination and filters.
   */
  async getOrders(orgId: string, query: OrdersQueryDto) {
    const where: any = { org_id: orgId };

    if (query.platform) where.platform = query.platform;
    if (query.status) where.status = query.status;
    if (query.date_from || query.date_to) {
      where.order_date = {};
      if (query.date_from) where.order_date.gte = new Date(query.date_from);
      if (query.date_to) where.order_date.lte = new Date(query.date_to);
    }

    const skip = (query.page - 1) * query.limit;

    const [orders, total] = await Promise.all([
      this.prisma.marketplaceOrder.findMany({
        where,
        include: {
          invoice: { select: { id: true, invoice_number: true, status: true } },
        },
        orderBy: { order_date: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.marketplaceOrder.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        total_pages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * Sync history log for a specific platform.
   */
  async getSyncHistory(orgId: string, platform: Platform, query: SyncHistoryQueryDto) {
    const connection = await this.prisma.marketplaceConnection.findFirst({
      where: { org_id: orgId, platform },
      select: { id: true },
    });

    if (!connection) {
      return { data: [], meta: { total: 0, page: 1, limit: query.limit, total_pages: 0 } };
    }

    const skip = (query.page - 1) * query.limit;

    const [logs, total] = await Promise.all([
      this.prisma.ecommerceSyncLog.findMany({
        where: { org_id: orgId, connection_id: connection.id },
        orderBy: { started_at: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.ecommerceSyncLog.count({
        where: { org_id: orgId, connection_id: connection.id },
      }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        total_pages: Math.ceil(total / query.limit),
      },
    };
  }

  /**
   * Dashboard analytics — sales by platform, fees breakdown, etc.
   */
  async getDashboard(orgId: string) {
    const connections = await this.prisma.marketplaceConnection.findMany({
      where: { org_id: orgId, is_active: true },
      select: { id: true, platform: true, store_name: true, last_synced_at: true },
    });

    // Aggregate order stats by platform
    const platformStats = await this.prisma.marketplaceOrder.groupBy({
      by: ['platform'],
      where: { org_id: orgId },
      _sum: {
        subtotal: true,
        platform_fees: true,
        shipping_fees: true,
        tax_amount: true,
        net_amount: true,
      },
      _count: { id: true },
    });

    // Monthly revenue by platform (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyOrders = await this.prisma.marketplaceOrder.findMany({
      where: {
        org_id: orgId,
        order_date: { gte: sixMonthsAgo },
      },
      select: {
        platform: true,
        order_date: true,
        net_amount: true,
        platform_fees: true,
      },
      orderBy: { order_date: 'asc' },
    });

    // Build monthly breakdown
    const monthlyMap = new Map<string, Record<string, number>>();
    for (const order of monthlyOrders) {
      if (!order.order_date) continue;
      const monthKey = `${order.order_date.getFullYear()}-${String(order.order_date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {});
      }
      const bucket = monthlyMap.get(monthKey)!;
      bucket[order.platform] = (bucket[order.platform] ?? 0) + Number(order.net_amount ?? 0);
    }

    const monthlyRevenue = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, platforms]) => ({ month, ...platforms }));

    // Total stats
    const totalSales = platformStats.reduce(
      (sum, s) => sum + Number(s._sum.net_amount ?? 0),
      0,
    );
    const totalFees = platformStats.reduce(
      (sum, s) => sum + Number(s._sum.platform_fees ?? 0),
      0,
    );
    const totalOrders = platformStats.reduce((sum, s) => sum + s._count.id, 0);

    return {
      summary: {
        total_sales: totalSales,
        total_fees: totalFees,
        total_orders: totalOrders,
        connected_platforms: connections.length,
      },
      platform_breakdown: platformStats.map((s) => ({
        platform: s.platform,
        orders: s._count.id,
        sales: Number(s._sum.net_amount ?? 0),
        fees: Number(s._sum.platform_fees ?? 0),
        shipping: Number(s._sum.shipping_fees ?? 0),
        tax: Number(s._sum.tax_amount ?? 0),
      })),
      monthly_revenue: monthlyRevenue,
      connections: connections.map((c) => ({
        platform: c.platform,
        store_name: c.store_name,
        last_synced_at: c.last_synced_at,
      })),
    };
  }

  /**
   * Sync all connected platforms for an org (used by scheduled job).
   */
  async syncAllPlatforms(orgId: string) {
    const connections = await this.prisma.marketplaceConnection.findMany({
      where: { org_id: orgId, is_active: true },
    });

    const results = [];

    for (const conn of connections) {
      try {
        const result = await this.syncOrders(orgId, conn.platform as Platform);
        results.push({ platform: conn.platform, status: 'success', ...result });
      } catch (error) {
        results.push({
          platform: conn.platform,
          status: 'failed',
          error: (error as Error).message,
        });
      }
    }

    return results;
  }
}
