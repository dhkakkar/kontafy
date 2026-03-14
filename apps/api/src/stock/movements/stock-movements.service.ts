import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStockMovementDto, ListStockMovementsDto } from '../dto/stock-movement.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class StockMovementsService {
  private readonly logger = new Logger(StockMovementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List stock movements with filters and pagination.
   */
  async findAll(orgId: string, filters: ListStockMovementsDto) {
    const where: any = { org_id: orgId };

    if (filters.product_id) where.product_id = filters.product_id;
    if (filters.warehouse_id) where.warehouse_id = filters.warehouse_id;
    if (filters.type) where.type = filters.type;

    if (filters.from_date || filters.to_date) {
      where.created_at = {};
      if (filters.from_date) where.created_at.gte = new Date(filters.from_date);
      if (filters.to_date) where.created_at.lte = new Date(filters.to_date);
    }

    const skip = (filters.page - 1) * filters.limit;

    const [movements, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: {
          product: {
            select: { id: true, name: true, sku: true, unit: true },
          },
          warehouse: {
            select: { id: true, name: true },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: filters.limit,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      data: movements,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        total_pages: Math.ceil(total / filters.limit),
      },
    };
  }

  /**
   * Record a stock movement and update stock levels atomically.
   */
  async create(orgId: string, data: CreateStockMovementDto) {
    // Validate product exists
    const product = await this.prisma.product.findFirst({
      where: { id: data.product_id, org_id: orgId, is_active: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Validate warehouse exists
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: data.warehouse_id, org_id: orgId },
    });
    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    // For transfers, validate destination warehouse
    if (data.type === 'transfer') {
      if (!data.destination_warehouse_id) {
        throw new BadRequestException(
          'Destination warehouse is required for transfers',
        );
      }
      if (data.destination_warehouse_id === data.warehouse_id) {
        throw new BadRequestException(
          'Source and destination warehouses must be different',
        );
      }
      const destWarehouse = await this.prisma.warehouse.findFirst({
        where: { id: data.destination_warehouse_id, org_id: orgId },
      });
      if (!destWarehouse) {
        throw new NotFoundException('Destination warehouse not found');
      }
    }

    // For sale_out and transfer, check sufficient stock
    if (data.type === 'sale_out' || data.type === 'transfer') {
      const currentLevel = await this.prisma.stockLevel.findUnique({
        where: {
          org_id_product_id_warehouse_id: {
            org_id: orgId,
            product_id: data.product_id,
            warehouse_id: data.warehouse_id,
          },
        },
      });

      const currentQty = currentLevel ? Number(currentLevel.quantity) : 0;
      if (currentQty < data.quantity) {
        throw new BadRequestException(
          `Insufficient stock. Available: ${currentQty}, Requested: ${data.quantity}`,
        );
      }
    }

    // Execute atomically in a transaction
    return this.prisma.$transaction(async (tx) => {
      // Create the movement record
      const movement = await tx.stockMovement.create({
        data: {
          org_id: orgId,
          product_id: data.product_id,
          warehouse_id: data.warehouse_id,
          type: data.type,
          quantity: data.quantity,
          reference_type: data.reference_type,
          reference_id: data.reference_id,
          batch_number: data.batch_number,
          serial_number: data.serial_number,
          cost_price: data.cost_price,
          notes: data.notes,
        },
        include: {
          product: { select: { id: true, name: true, unit: true } },
          warehouse: { select: { id: true, name: true } },
        },
      });

      // Determine quantity change for source warehouse
      let quantityDelta: number;
      if (data.type === 'purchase_in') {
        quantityDelta = data.quantity;
      } else if (data.type === 'sale_out') {
        quantityDelta = -data.quantity;
      } else if (data.type === 'transfer') {
        quantityDelta = -data.quantity;
      } else {
        // adjustment — can be positive or negative, use quantity as-is
        quantityDelta = data.quantity;
      }

      // Upsert stock level for source warehouse
      await tx.stockLevel.upsert({
        where: {
          org_id_product_id_warehouse_id: {
            org_id: orgId,
            product_id: data.product_id,
            warehouse_id: data.warehouse_id,
          },
        },
        create: {
          org_id: orgId,
          product_id: data.product_id,
          warehouse_id: data.warehouse_id,
          quantity: Math.max(0, quantityDelta),
        },
        update: {
          quantity: { increment: quantityDelta },
        },
      });

      // For transfers, also credit the destination warehouse
      if (data.type === 'transfer' && data.destination_warehouse_id) {
        // Create a corresponding movement for the destination
        await tx.stockMovement.create({
          data: {
            org_id: orgId,
            product_id: data.product_id,
            warehouse_id: data.destination_warehouse_id,
            type: 'transfer',
            quantity: data.quantity,
            reference_type: 'transfer_in',
            reference_id: movement.id,
            batch_number: data.batch_number,
            serial_number: data.serial_number,
            cost_price: data.cost_price,
            notes: `Transfer from ${warehouse.name}: ${data.notes || ''}`.trim(),
          },
        });

        // Credit destination warehouse
        await tx.stockLevel.upsert({
          where: {
            org_id_product_id_warehouse_id: {
              org_id: orgId,
              product_id: data.product_id,
              warehouse_id: data.destination_warehouse_id,
            },
          },
          create: {
            org_id: orgId,
            product_id: data.product_id,
            warehouse_id: data.destination_warehouse_id,
            quantity: data.quantity,
          },
          update: {
            quantity: { increment: data.quantity },
          },
        });
      }

      this.logger.log(
        `Stock movement recorded: ${movement.id} (${data.type}, qty: ${data.quantity})`,
      );

      return movement;
    });
  }

  /**
   * Get current stock levels across all warehouses.
   */
  async getStockLevels(orgId: string, productId?: string, warehouseId?: string) {
    const where: any = { org_id: orgId };
    if (productId) where.product_id = productId;
    if (warehouseId) where.warehouse_id = warehouseId;

    const levels = await this.prisma.stockLevel.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            purchase_price: true,
            selling_price: true,
          },
        },
        warehouse: {
          select: { id: true, name: true, is_default: true },
        },
      },
      orderBy: [
        { product: { name: 'asc' } },
        { warehouse: { name: 'asc' } },
      ],
    });

    return levels.map((level) => ({
      ...level,
      stock_value: Number(level.quantity) * Number(level.product.purchase_price || 0),
    }));
  }

  /**
   * Get products below their reorder level.
   */
  async getLowStock(orgId: string) {
    // Get all products that track inventory and have a reorder level
    const products = await this.prisma.product.findMany({
      where: {
        org_id: orgId,
        is_active: true,
        track_inventory: true,
        reorder_level: { not: null },
      },
      include: {
        stock_levels: {
          select: { quantity: true, warehouse_id: true },
          include: {
            warehouse: { select: { id: true, name: true } },
          },
        },
      },
    });

    const lowStockProducts = products
      .map((product) => {
        const totalQty = product.stock_levels.reduce(
          (sum, sl) => sum + Number(sl.quantity),
          0,
        );
        const reorderLevel = Number(product.reorder_level || 0);

        return {
          id: product.id,
          name: product.name,
          sku: product.sku,
          unit: product.unit,
          reorder_level: reorderLevel,
          current_quantity: totalQty,
          deficit: reorderLevel - totalQty,
          stock_levels: product.stock_levels,
        };
      })
      .filter((p) => p.current_quantity <= p.reorder_level)
      .sort((a, b) => b.deficit - a.deficit);

    return lowStockProducts;
  }

  /**
   * Get stock dashboard summary.
   */
  async getDashboardSummary(orgId: string) {
    const [totalProducts, totalGoodsProducts, totalServiceProducts] =
      await Promise.all([
        this.prisma.product.count({
          where: { org_id: orgId, is_active: true },
        }),
        this.prisma.product.count({
          where: { org_id: orgId, is_active: true, type: 'goods' },
        }),
        this.prisma.product.count({
          where: { org_id: orgId, is_active: true, type: 'services' },
        }),
      ]);

    const stockLevels = await this.prisma.stockLevel.findMany({
      where: { org_id: orgId },
      include: {
        product: {
          select: { purchase_price: true },
        },
      },
    });

    const totalStockValue = stockLevels.reduce(
      (sum, sl) =>
        sum + Number(sl.quantity) * Number(sl.product.purchase_price || 0),
      0,
    );

    const totalQuantity = stockLevels.reduce(
      (sum, sl) => sum + Number(sl.quantity),
      0,
    );

    const lowStockItems = await this.getLowStock(orgId);

    const warehouseCount = await this.prisma.warehouse.count({
      where: { org_id: orgId },
    });

    return {
      total_products: totalProducts,
      total_goods: totalGoodsProducts,
      total_services: totalServiceProducts,
      total_quantity: totalQuantity,
      total_stock_value: totalStockValue,
      low_stock_count: lowStockItems.length,
      low_stock_items: lowStockItems.slice(0, 5),
      warehouse_count: warehouseCount,
    };
  }
}
