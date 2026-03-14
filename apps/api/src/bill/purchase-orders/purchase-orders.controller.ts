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
import { PurchaseOrdersService } from './purchase-orders.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Purchase Orders')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new purchase order' })
  async create(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Body()
    body: {
      contact_id: string;
      date: string;
      delivery_date?: string;
      shipping_address?: Record<string, any>;
      place_of_supply?: string;
      is_igst?: boolean;
      notes?: string;
      terms?: string;
      items: Array<{
        product_id?: string;
        description: string;
        hsn_code?: string;
        quantity: number;
        unit?: string;
        rate: number;
        discount_pct?: number;
        cgst_rate?: number;
        sgst_rate?: number;
        igst_rate?: number;
        cess_rate?: number;
      }>;
    },
  ) {
    return this.purchaseOrdersService.create(orgId, userId, body);
  }

  @Get()
  @ApiOperation({ summary: 'List purchase orders with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @OrgId() orgId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.purchaseOrdersService.findAll(orgId, { page, limit, status, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase order details with items' })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.purchaseOrdersService.findOne(orgId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a purchase order (draft/sent only)' })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.purchaseOrdersService.update(orgId, id, body);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update purchase order status' })
  async updateStatus(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.purchaseOrdersService.updateStatus(orgId, id, body.status);
  }

  @Post(':id/convert-to-bill')
  @ApiOperation({ summary: 'Convert a purchase order to a purchase bill' })
  async convertToBill(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.purchaseOrdersService.convertToBill(orgId, id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft purchase order' })
  async remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.purchaseOrdersService.remove(orgId, id);
  }
}
