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
import { InvoicesService } from './invoices.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Bill')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('bill/invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'List invoices with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'contact_id', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @OrgId() orgId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('contact_id') contactId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.invoicesService.findAll(orgId, {
      page,
      limit,
      status,
      type,
      contactId,
      from,
      to,
      search,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice details with items' })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.invoicesService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new invoice' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['type', 'contact_id', 'date', 'items'],
      properties: {
        type: { type: 'string', example: 'sale' },
        contact_id: { type: 'string', format: 'uuid', example: '8b6b0c1e-2f5a-4b3c-9d8e-1a2b3c4d5e6f' },
        date: { type: 'string', format: 'date', example: '2026-06-01' },
        due_date: { type: 'string', format: 'date', example: '2026-06-30' },
        place_of_supply: { type: 'string', example: '29-Karnataka' },
        is_igst: { type: 'boolean', example: false },
        notes: { type: 'string', example: 'Thank you for your business.' },
        terms: { type: 'string', example: 'Payment due within 30 days.' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: ['description', 'quantity', 'rate'],
            properties: {
              product_id: { type: 'string', format: 'uuid' },
              description: { type: 'string', example: 'Consulting services' },
              hsn_code: { type: 'string', example: '998314' },
              quantity: { type: 'number', example: 10 },
              unit: { type: 'string', example: 'hours' },
              rate: { type: 'number', example: 1500 },
              discount_pct: { type: 'number', example: 0 },
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
      type: string;
      contact_id: string;
      date: string;
      due_date?: string;
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
    return this.invoicesService.create(orgId, userId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an invoice (draft only)' })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: true,
      description: 'Partial invoice fields to update.',
    },
  })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.invoicesService.update(orgId, id, body);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update invoice status (send, cancel, etc.)' })
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
    return this.invoicesService.updateStatus(orgId, id, body.status);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate an invoice as a new draft' })
  async duplicate(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.invoicesService.duplicate(orgId, id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a draft invoice' })
  async remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.invoicesService.remove(orgId, id);
  }

}
