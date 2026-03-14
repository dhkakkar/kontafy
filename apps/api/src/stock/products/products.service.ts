import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from '../dto/product.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List products for an organization with optional filters.
   */
  async findAll(
    orgId: string,
    filters?: { type?: string; search?: string; active_only?: boolean },
  ) {
    const where: any = { org_id: orgId };

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.active_only !== false) {
      where.is_active = true;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { hsn_code: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        stock_levels: {
          select: {
            quantity: true,
            reserved: true,
            warehouse: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return products.map((product) => {
      const totalQty = product.stock_levels.reduce(
        (sum, sl) => sum + Number(sl.quantity),
        0,
      );
      const stockValue = totalQty * Number(product.purchase_price || 0);

      return {
        ...product,
        total_quantity: totalQty,
        stock_value: stockValue,
      };
    });
  }

  /**
   * Get a single product by ID with stock levels.
   */
  async findOne(orgId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, org_id: orgId },
      include: {
        stock_levels: {
          include: {
            warehouse: {
              select: { id: true, name: true, is_default: true },
            },
          },
        },
        stock_movements: {
          orderBy: { created_at: 'desc' },
          take: 10,
          include: {
            warehouse: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const totalQty = product.stock_levels.reduce(
      (sum, sl) => sum + Number(sl.quantity),
      0,
    );
    const stockValue = totalQty * Number(product.purchase_price || 0);

    return {
      ...product,
      total_quantity: totalQty,
      stock_value: stockValue,
    };
  }

  /**
   * Create a new product.
   */
  async create(orgId: string, data: CreateProductDto) {
    // Check for duplicate SKU within org
    if (data.sku) {
      const existing = await this.prisma.product.findFirst({
        where: { org_id: orgId, sku: data.sku },
      });
      if (existing) {
        throw new ConflictException(`Product with SKU "${data.sku}" already exists`);
      }
    }

    const product = await this.prisma.product.create({
      data: {
        org_id: orgId,
        name: data.name,
        sku: data.sku,
        description: data.description,
        type: data.type,
        hsn_code: data.hsn_code,
        unit: data.unit,
        purchase_price: data.purchase_price,
        selling_price: data.selling_price,
        tax_rate: data.tax_rate,
        track_inventory: data.track_inventory,
        reorder_level: data.reorder_level,
        image_url: data.image_url,
        is_active: true,
      },
    });

    this.logger.log(`Product created: ${product.id} (${product.name})`);
    return product;
  }

  /**
   * Update an existing product.
   */
  async update(orgId: string, id: string, data: UpdateProductDto) {
    const product = await this.prisma.product.findFirst({
      where: { id, org_id: orgId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check SKU uniqueness if changing
    if (data.sku && data.sku !== product.sku) {
      const existing = await this.prisma.product.findFirst({
        where: { org_id: orgId, sku: data.sku },
      });
      if (existing) {
        throw new ConflictException(`Product with SKU "${data.sku}" already exists`);
      }
    }

    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  /**
   * Soft delete a product (set is_active = false).
   */
  async remove(orgId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, org_id: orgId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if product has stock
    const stockLevels = await this.prisma.stockLevel.findMany({
      where: { product_id: id, quantity: { gt: 0 } },
    });

    if (stockLevels.length > 0) {
      throw new BadRequestException(
        'Cannot delete product with existing stock. Adjust stock to zero first.',
      );
    }

    await this.prisma.product.update({
      where: { id },
      data: { is_active: false },
    });

    return { message: 'Product deleted successfully' };
  }
}
