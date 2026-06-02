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
  @ApiOperation({
    summary: 'List invoices with filtering and pagination',
    description:
      'Returns paginated invoices for the org. Supports filtering by `status` (draft / sent / partially_paid / paid / overdue / cancelled), `type` (sale / proforma / etc.), `contact_id`, date range (`from`/`to`) and free-text `search` over invoice number and notes. Drives the main invoices list page.',
  })
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
  @ApiOperation({
    summary: 'Get invoice details with items',
    description:
      'Returns the full invoice including line items, tax breakdown (CGST / SGST / IGST / cess), applied payments and credit notes, and the current `amount_paid` / `balance_due` totals. Used by the invoice detail page and as the data source for the invoice PDF.',
  })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.invoicesService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new invoice',
    description:
      'Creates an invoice in `draft` status with an auto-generated invoice number. Server-side computes line totals, tax (CGST / SGST or IGST based on `is_igst` and `place_of_supply`) and the grand total from the items array. Drafts do not hit the books — move to `sent` via `PATCH /:id/status` to post the AR journal entry.',
  })
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
  @ApiOperation({
    summary: 'Update an invoice (draft only)',
    description:
      'Patches an invoice and recalculates line / tax / grand totals from the new items. Editing is blocked once the invoice is partially_paid, paid or cancelled — for those, issue a credit note or reverse the payment first. After commit, if the invoice is in a posted status, its journal entry is re-posted in lock-step.',
  })
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
  @ApiOperation({
    summary: 'Update invoice status (send, cancel, etc.)',
    description:
      'Transitions the invoice through its lifecycle (draft → sent → partially_paid → paid, or → cancelled). The service validates the transition against the allowed graph. Moving away from `draft` posts the AR journal entry; moving into `cancelled` reverses it. The contact\'s running balance is updated as a side effect.',
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
    return this.invoicesService.updateStatus(orgId, id, body.status);
  }

  @Post(':id/duplicate')
  @ApiOperation({
    summary: 'Duplicate an invoice as a new draft',
    description:
      'Clones an existing invoice (line items, contact, terms) into a new `draft` invoice with today\'s date and a fresh auto-generated number. Useful for recurring billing handled manually or for copying a previous month\'s invoice as a starting point.',
  })
  async duplicate(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.invoicesService.duplicate(orgId, id, userId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a draft invoice',
    description:
      'Hard-deletes a draft invoice and its line items. Only invoices in `draft` status can be deleted — for posted invoices, cancel them via `PATCH /:id/status` (which reverses the journal) instead of deleting, so the audit trail and number sequence stay intact.',
  })
  async remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.invoicesService.remove(orgId, id);
  }

}
