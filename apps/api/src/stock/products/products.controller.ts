import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createProductSchema,
  updateProductSchema,
  CreateProductDto,
  UpdateProductDto,
} from '../dto/product.dto';

@ApiTags('Stock')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('stock/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({
    summary: 'List products with optional filters',
    description:
      'Returns the org\'s product catalog. Supported filters: `type` (`goods` | `services`), `search` (matches name, HSN/SAC code or SKU), and `active_only` to hide soft-deleted entries. Each row carries pricing, tax rate and current on-hand quantity.',
  })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by type: goods or services' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name, HSN code, or SKU' })
  @ApiQuery({ name: 'active_only', required: false, type: Boolean })
  async findAll(
    @OrgId() orgId: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('active_only') activeOnly?: boolean,
  ) {
    return this.productsService.findAll(orgId, {
      type,
      search,
      active_only: activeOnly,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get product details with current stock levels',
    description:
      'Returns the full product record along with per-warehouse stock-on-hand and aggregate movement counters. Used to render the product detail page.',
  })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.productsService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new product',
    description:
      'Creates a goods or services SKU. The HSN/SAC code, GST rate and unit drive automatic tax computation on invoices and bills. If `opening_stock` is set, an opening-balance stock movement is auto-posted against the default warehouse.',
  })
  async create(
    @OrgId() orgId: string,
    @Body(new ZodValidationPipe(createProductSchema)) body: CreateProductDto,
  ) {
    return this.productsService.create(orgId, body);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update product',
    description:
      'Patches catalog fields on a product. Historical invoice/bill lines keep their snapshotted price and tax — only future documents pick up the new values.',
  })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) body: UpdateProductDto,
  ) {
    return this.productsService.update(orgId, id, body);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Soft delete product',
    description:
      'Marks the product as inactive so it stops appearing in selectors. The row and its historical movements are preserved so old invoices/bills continue to render correctly. To restore, call `PATCH /stock/products/:id` with `is_active: true`.',
  })
  async remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.productsService.remove(orgId, id);
  }
}
