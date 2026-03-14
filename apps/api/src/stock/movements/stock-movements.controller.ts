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
  @ApiOperation({ summary: 'List stock movements with filters' })
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
  @ApiOperation({ summary: 'Record a stock movement' })
  async create(
    @OrgId() orgId: string,
    @Body(new ZodValidationPipe(createStockMovementSchema)) body: CreateStockMovementDto,
  ) {
    return this.stockMovementsService.create(orgId, body);
  }

  @Get('levels')
  @ApiOperation({ summary: 'Get current stock levels across warehouses' })
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
  @ApiOperation({ summary: 'Get products below reorder point' })
  async getLowStock(@OrgId() orgId: string) {
    return this.stockMovementsService.getLowStock(orgId);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get stock dashboard summary' })
  async getDashboard(@OrgId() orgId: string) {
    return this.stockMovementsService.getDashboardSummary(orgId);
  }
}
