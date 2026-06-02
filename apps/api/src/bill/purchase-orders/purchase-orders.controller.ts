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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiQuery, ApiBody } from '@nestjs/swagger';
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
  @ApiBody({
    schema: {
      type: 'object',
      required: ['contact_id', 'date', 'items'],
      properties: {
        contact_id: { type: 'string', format: 'uuid', example: '8b6b0c1e-2f5a-4b3c-9d8e-1a2b3c4d5e6f' },
        date: { type: 'string', format: 'date', example: '2026-06-01' },
        delivery_date: { type: 'string', format: 'date', example: '2026-06-10' },
        shipping_address: { type: 'object', additionalProperties: true },
        place_of_supply: { type: 'string', example: '29-Karnataka' },
        is_igst: { type: 'boolean', example: false },
        notes: { type: 'string', example: 'Deliver to backside gate.' },
        terms: { type: 'string', example: 'Net 30 days.' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: ['description', 'quantity', 'rate'],
            properties: {
              product_id: { type: 'string', format: 'uuid' },
              description: { type: 'string', example: 'A4 Copier Paper - 80 GSM' },
              hsn_code: { type: 'string', example: '4802' },
              quantity: { type: 'number', example: 10 },
              unit: { type: 'string', example: 'reams' },
              rate: { type: 'number', example: 250 },
              discount_pct: { type: 'number', example: 5 },
              cgst_rate: { type: 'number', example: 9 },
              sgst_rate: { type: 'number', example: 9 },
              igst_rate: { type: 'number', example: 0 },
              cess_rate: { type: 'number', example: 0 },
            },
          },
        },
      },
    },
  })
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
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: true,
      description: 'Partial purchase order fields to update.',
    },
  })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.purchaseOrdersService.update(orgId, id, body);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update purchase order status' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['status'],
      properties: {
        status: { type: 'string', example: 'sent' },
      },
    },
  })
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
