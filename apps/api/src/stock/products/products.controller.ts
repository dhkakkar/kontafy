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
  @ApiOperation({ summary: 'List products with optional filters' })
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
  @ApiOperation({ summary: 'Get product details with current stock levels' })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.productsService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  async create(
    @OrgId() orgId: string,
    @Body(new ZodValidationPipe(createProductSchema)) body: CreateProductDto,
  ) {
    return this.productsService.create(orgId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product' })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) body: UpdateProductDto,
  ) {
    return this.productsService.update(orgId, id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete product' })
  async remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.productsService.remove(orgId, id);
  }
}
