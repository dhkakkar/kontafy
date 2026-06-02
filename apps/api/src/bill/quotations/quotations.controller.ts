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
import { QuotationsService } from './quotations.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Quotations')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('quotations')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new quotation',
    description:
      'Creates a quotation in `draft` status with an auto-generated quotation number. Server-side computes line totals and tax based on `is_igst` and `place_of_supply`. Quotations are pre-sale documents and never post to the books — convert to an invoice via `POST /:id/convert-to-invoice` once the customer accepts.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['contact_id', 'date', 'items'],
      properties: {
        contact_id: { type: 'string', format: 'uuid', example: '8b6b0c1e-2f5a-4b3c-9d8e-1a2b3c4d5e6f' },
        date: { type: 'string', format: 'date', example: '2026-06-01' },
        validity_date: { type: 'string', format: 'date', example: '2026-06-30' },
        place_of_supply: { type: 'string', example: '29-Karnataka' },
        is_igst: { type: 'boolean', example: false },
        notes: { type: 'string', example: 'Valid for 30 days.' },
        terms: { type: 'string', example: 'Payment due within 15 days.' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            required: ['description', 'quantity', 'rate'],
            properties: {
              product_id: { type: 'string', format: 'uuid' },
              description: { type: 'string', example: 'Web development - hourly' },
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
      contact_id: string;
      date: string;
      validity_date?: string;
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
    return this.quotationsService.create(orgId, userId, body);
  }

  @Get()
  @ApiOperation({
    summary: 'List quotations with filtering and pagination',
    description:
      'Returns paginated quotations for the org. Filter by `status` (draft / sent / accepted / rejected / expired / converted) and free-text `search` over quotation number, contact name and notes. Drives the quotations list page.',
  })
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
    return this.quotationsService.findAll(orgId, { page, limit, status, search });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get quotation details with items',
    description:
      'Returns the full quotation including line items, tax breakdown, validity date and a reference to the invoice it has been converted into (if any). Used by the quotation detail page and the quotation PDF render.',
  })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.quotationsService.findOne(orgId, id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a quotation (draft/sent only)',
    description:
      'Patches a quotation and recalculates line / tax / grand totals. Editing is allowed only while the quotation is in `draft` or `sent`. Once accepted, rejected, expired or converted, the document is locked — to revise, duplicate it into a new quotation instead.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      additionalProperties: true,
      description: 'Partial quotation fields to update.',
    },
  })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.quotationsService.update(orgId, id, body);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update quotation status',
    description:
      'Transitions a quotation between draft, sent, accepted, rejected, expired and converted. `converted` is normally set automatically when the quotation is turned into an invoice. No journal posting occurs — quotations are pre-sale documents.',
  })
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
    return this.quotationsService.updateStatus(orgId, id, body.status);
  }

  @Post(':id/convert-to-invoice')
  @ApiOperation({
    summary: 'Convert a quotation to an invoice',
    description:
      'Creates a new invoice (in `draft` status) from this quotation\'s line items and contact, then marks the quotation as `converted`. The invoice posts to the books only when its status is moved away from draft. Cancelled or already-converted quotations cannot be converted.',
  })
  async convertToInvoice(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.quotationsService.convertToInvoice(orgId, id, userId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a draft quotation',
    description:
      'Hard-deletes a quotation and its line items. Only quotations in `draft` status can be deleted — for sent or accepted ones, set the status to rejected or expired instead so the number sequence stays in the audit trail.',
  })
  async remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.quotationsService.remove(orgId, id);
  }
}
