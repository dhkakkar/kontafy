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
import { ContactsService } from './contacts.service';
import { OrgId } from '../../common/decorators/org-id.decorator';

@ApiTags('Bill')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('bill/contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @ApiOperation({
    summary: 'List contacts with filtering',
    description:
      'Returns a paginated list of customers and vendors for the org. Filter with `type` (`customer`, `vendor` or `both`), free-text `search` over name / company / GSTIN / email / phone, and `active_only=true` to hide deactivated contacts. Used by the contacts index and as the search source in invoice / bill pickers.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, description: 'customer, vendor, or both' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'active_only', required: false, type: Boolean })
  async findAll(
    @OrgId() orgId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('active_only') activeOnly?: boolean,
  ) {
    return this.contactsService.findAll(orgId, { page, limit, type, search, activeOnly });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get contact details',
    description:
      'Returns the full contact record — addresses, tax IDs, payment terms, credit limit and the metadata blob (TDS, MSME, GST treatment). For the running balance and recent transactions, call the dedicated `/:id/balance` and `/:id/transactions` endpoints instead.',
  })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.contactsService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new contact',
    description:
      'Creates a customer, vendor or both-type contact and auto-provisions the matching AR / AP sub-ledger accounts. Any non-zero `opening_balance` (and `payable_opening_balance` for both-type contacts) is posted as an opening journal dated `opening_date` so receivables / payables reports include this contact from day one.',
  })
  async create(
    @OrgId() orgId: string,
    @Body()
    body: {
      type: string;
      name: string;
      company_name?: string;
      gstin?: string;
      pan?: string;
      email?: string;
      phone?: string;
      whatsapp?: string;
      billing_address?: Record<string, any>;
      shipping_address?: Record<string, any>;
      payment_terms?: number;
      credit_limit?: number;
      opening_balance?: number;
      // When set, the service posts an opening-balance journal dated
      // here against the auto-created sub-ledger. Defaults to today on
      // the backend if omitted.
      opening_date?: string;
      // For type='both', the receivable-side opening lives on
      // opening_balance and the payable-side opening here. For
      // customer-only / vendor-only contacts this is ignored.
      payable_opening_balance?: number;
      notes?: string;
      // Structured extras: TDS config, MSME registration, GST treatment
      // override, default ledger linkage. Persisted in Contact.metadata
      // JSON column so callers don't need a schema change per field.
      metadata?: Record<string, any>;
    },
  ) {
    return this.contactsService.create(orgId, body);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update contact',
    description:
      'Patches editable fields on a contact. Re-saving `opening_balance` rewrites the opening-balance journal entry so the AR / AP ledger stays accurate. Historical transactions tied to the contact are not touched — past invoices keep their original snapshot of the contact details.',
  })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.contactsService.update(orgId, id, body);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Deactivate contact (soft delete)',
    description:
      'Soft-deletes a contact by flipping `is_active` to false. Existing invoices, bills and payments remain intact and continue to appear on reports; the contact is just hidden from new-document pickers and from `active_only=true` lists. To re-enable, send `PATCH /:id` with `is_active: true`.',
  })
  async remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.contactsService.deactivate(orgId, id);
  }

  @Get(':id/balance')
  @ApiOperation({
    summary: 'Get contact outstanding balance',
    description:
      'Returns the live receivable / payable balance for the contact — invoices billed minus payments received (or bills owed minus payments made for vendors). Computed from the books, so it always reconciles with the AR / AP control accounts on the trial balance.',
  })
  async getBalance(@OrgId() orgId: string, @Param('id') id: string) {
    return this.contactsService.getBalance(orgId, id);
  }

  @Get(':id/transactions')
  @ApiOperation({
    summary: 'Get paginated list of invoices and payments for a contact',
    description:
      'Returns the contact\'s transaction history (invoices, bills, payments and credit notes) ordered by date desc. Filter `type=invoice` or `type=payment` to scope to one kind, or omit to get an interleaved statement-style view used on the contact detail page.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, description: 'invoice or payment' })
  async getTransactions(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('type') type?: string,
  ) {
    return this.contactsService.getTransactions(orgId, id, { page, limit, type });
  }

  @Get(':id/outstanding')
  @ApiOperation({
    summary: 'Get outstanding invoices with aging breakdown for a contact',
    description:
      'Returns every open invoice / bill for the contact bucketed by age (Current, 1-30, 31-60, 61-90, 90+ days past due) along with the totals per bucket. Drives the aging table on the contact page and the customer statement export.',
  })
  async getOutstanding(@OrgId() orgId: string, @Param('id') id: string) {
    return this.contactsService.getOutstanding(orgId, id);
  }

  @Get(':id/summary')
  @ApiOperation({
    summary: 'Get contact summary: total revenue, outstanding, invoice count, last transaction',
    description:
      'Returns the at-a-glance KPI block shown at the top of the contact detail page — lifetime billed revenue, current outstanding balance, total number of invoices and the date / amount of the most recent transaction. Aggregates run on demand; safe to call on every page load.',
  })
  async getSummary(@OrgId() orgId: string, @Param('id') id: string) {
    return this.contactsService.getSummary(orgId, id);
  }
}
