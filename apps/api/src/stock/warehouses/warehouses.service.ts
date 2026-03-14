import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from '../dto/warehouse.dto';

@Injectable()
export class WarehousesService {
  private readonly logger = new Logger(WarehousesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all warehouses for an organization with stock summary.
   */
  async findAll(orgId: string) {
    const warehouses = await this.prisma.warehouse.findMany({
      where: { org_id: orgId },
      include: {
        stock_levels: {
          include: {
            product: {
              select: { id: true, name: true, purchase_price: true },
            },
          },
        },
      },
      orderBy: [{ is_default: 'desc' }, { name: 'asc' }],
    });

    return warehouses.map((warehouse) => {
      const totalItems = warehouse.stock_levels.length;
      const totalQuantity = warehouse.stock_levels.reduce(
        (sum, sl) => sum + Number(sl.quantity),
        0,
      );
      const totalValue = warehouse.stock_levels.reduce(
        (sum, sl) =>
          sum + Number(sl.quantity) * Number(sl.product.purchase_price || 0),
        0,
      );

      return {
        ...warehouse,
        stock_levels: undefined,
        total_items: totalItems,
        total_quantity: totalQuantity,
        total_value: totalValue,
      };
    });
  }

  /**
   * Create a new warehouse.
   */
  async create(orgId: string, data: CreateWarehouseDto) {
    // If setting as default, unset existing default
    if (data.is_default) {
      await this.prisma.warehouse.updateMany({
        where: { org_id: orgId, is_default: true },
        data: { is_default: false },
      });
    }

    const warehouse = await this.prisma.warehouse.create({
      data: {
        org_id: orgId,
        name: data.name,
        address: data.address || {},
        is_default: data.is_default,
      },
    });

    this.logger.log(`Warehouse created: ${warehouse.id} (${warehouse.name})`);
    return warehouse;
  }

  /**
   * Update an existing warehouse.
   */
  async update(orgId: string, id: string, data: UpdateWarehouseDto) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, org_id: orgId },
    });

    if (!warehouse) {
      throw new NotFoundException('Warehouse not found');
    }

    // If setting as default, unset existing default
    if (data.is_default) {
      await this.prisma.warehouse.updateMany({
        where: { org_id: orgId, is_default: true, id: { not: id } },
        data: { is_default: false },
      });
    }

    return this.prisma.warehouse.update({
      where: { id },
      data,
    });
  }
}
