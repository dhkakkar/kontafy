import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { StockMovementsService } from './stock-movements.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createStockMovementSchema,
  listStockMovementsSchema,
  CreateStockMovementDto,
  ListStockMovementsDto,
} from '../dto/stock-movement.dto';

@ApiTags('Stock')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('stock')
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  @Get('movements')
  @ApiOperation({
    summary: 'List stock movements with filters',
    description:
      'Paginated stock ledger. Supported filters: `product_id`, `warehouse_id`, `type` (`purchase_in` / `sale_out` / `adjustment` / `transfer`), `from_date`, `to_date`, `page`, `limit`. Each row references the source document (invoice/bill/adjustment) so you can drill back to the originating transaction.',
  })
  @ApiQuery({ name: 'product_id', required: false })
  @ApiQuery({ name: 'warehouse_id', required: false })
  @ApiQuery({ name: 'type', required: false, description: 'purchase_in, sale_out, adjustment, transfer' })
  @ApiQuery({ name: 'from_date', required: false })
  @ApiQuery({ name: 'to_date', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @OrgId() orgId: string,
    @Query(new ZodValidationPipe(listStockMovementsSchema)) query: ListStockMovementsDto,
  ) {
    return this.stockMovementsService.findAll(orgId, query);
  }

  @Post('movements')
  @ApiOperation({
    summary: 'Record a stock movement',
    description:
      'Posts an inbound, outbound, adjustment or transfer movement. Stock-on-hand for the affected product/warehouse is updated atomically. Most callers should use this only for manual adjustments and opening stock — invoice/bill posting auto-creates movements for sale_out and purchase_in.',
  })
  async create(
    @OrgId() orgId: string,
    @Body(new ZodValidationPipe(createStockMovementSchema)) body: CreateStockMovementDto,
  ) {
    return this.stockMovementsService.create(orgId, body);
  }

  @Get('levels')
  @ApiOperation({
    summary: 'Get current stock levels across warehouses',
    description:
      'Returns the live quantity-on-hand for every (product, warehouse) pair, with optional `product_id` and `warehouse_id` filters to narrow the slice. Useful for the stock pivot grid and for last-mile fulfilment lookups.',
  })
  @ApiQuery({ name: 'product_id', required: false })
  @ApiQuery({ name: 'warehouse_id', required: false })
  async getStockLevels(
    @OrgId() orgId: string,
    @Query('product_id') productId?: string,
    @Query('warehouse_id') warehouseId?: string,
  ) {
    return this.stockMovementsService.getStockLevels(orgId, productId, warehouseId);
  }

  @Get('low-stock')
  @ApiOperation({
    summary: 'Get products below reorder point',
    description:
      'Returns every product whose current on-hand quantity is at or below its configured `reorder_point`. Drives the "Low stock" widget on the stock dashboard and the reorder report.',
  })
  async getLowStock(@OrgId() orgId: string) {
    return this.stockMovementsService.getLowStock(orgId);
  }

  @Get('dashboard')
  @ApiOperation({
    summary: 'Get stock dashboard summary',
    description:
      'Aggregated counters for the stock landing page — total products, total warehouses, inventory valuation, low-stock count and recent movement totals. Pre-aggregated server-side to keep the dashboard responsive.',
  })
  async getDashboard(@OrgId() orgId: string) {
    return this.stockMovementsService.getDashboardSummary(orgId);
  }
}
