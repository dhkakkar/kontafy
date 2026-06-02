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
import { PaymentsService } from './payments.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { CreatePaymentDto, AllocatePaymentDto } from '../dto/payments.dto';

@ApiTags('Bill')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('bill/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiOperation({
    summary: 'List payments with filtering and pagination',
    description:
      'Returns paginated payment records for the org. Supports filtering by `type` (`received` from customers or `made` to vendors), `contact_id`, date range (`from`/`to`) and free-text `search` over reference number and notes. Drives the payments list page.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, description: 'received or made' })
  @ApiQuery({ name: 'contact_id', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @OrgId() orgId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('type') type?: string,
    @Query('contact_id') contactId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('search') search?: string,
  ) {
    return this.paymentsService.findAll(orgId, {
      page,
      limit,
      type,
      contactId,
      from,
      to,
      search,
    });
  }

  @Get('outstanding')
  @ApiOperation({
    summary: 'Outstanding receivables/payables summary with aging analysis',
    description:
      'Returns the org-wide AR and AP rollup: total outstanding on each side bucketed by age (Current, 1-30, 31-60, 61-90, 90+ days). Drives the cash-flow / collections dashboard and is the data behind the aging report export.',
  })
  async getOutstanding(@OrgId() orgId: string) {
    return this.paymentsService.getOutstandingSummary(orgId);
  }

  @Get('stats')
  @ApiOperation({
    summary:
      'Aggregate payments stats — totals + per-type counts for the page header',
    description:
      'Returns the KPI tiles shown on top of the payments page — total received, total made, count of each, plus net cash flow. Aggregates run on demand against the payments table and are safe to call on every page load.',
  })
  async getStats(@OrgId() orgId: string) {
    return this.paymentsService.getStats(orgId);
  }

  @Get('outstanding/contact/:contactId')
  @ApiOperation({
    summary:
      'Outstanding invoices/bills for a single contact (used by the Record Payment allocation table)',
    description:
      'Returns the open invoices or bills for one contact that can be paid against, scoped by `direction` (`receive` for customer invoices, `pay` for vendor bills). Only statuses that can still accept a payment (sent / partially_paid / overdue) are included. Used to populate the allocation grid when recording a new payment.',
  })
  @ApiQuery({ name: 'direction', required: true, description: 'receive | pay' })
  async getOutstandingForContact(
    @OrgId() orgId: string,
    @Param('contactId') contactId: string,
    @Query('direction') direction: 'receive' | 'pay',
  ) {
    return this.paymentsService.getOutstandingForContact(
      orgId,
      contactId,
      direction === 'pay' ? 'pay' : 'receive',
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get payment details with allocations',
    description:
      'Returns the full payment record including how it has been allocated across invoices / bills, the linked bank account and any unallocated remainder (which sits on the advance ledger). Used by the payment detail drawer.',
  })
  async findOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.paymentsService.findOne(orgId, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Record a payment (received or made)',
    description:
      'Records a customer receipt or vendor payment, posts the matching bank journal (Dr Bank | Cr AR for receipts; Dr AP | Cr Bank for payments), and applies the supplied allocations against open invoices / bills. Any unallocated remainder is parked on the customer-advance (2116) or vendor-advance (1112) account and can be applied later via `POST /:id/allocate`.',
  })
  async create(
    @OrgId() orgId: string,
    @Body() body: CreatePaymentDto,
  ) {
    return this.paymentsService.create(orgId, body);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update payment details',
    description:
      'Patches editable fields on a payment (date, reference, notes, bank account). The bank journal is reposted so the books reflect the latest details. To change allocations against invoices use `POST /:id/allocate` instead — it handles the per-invoice status recalculation.',
  })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: Record<string, any>,
  ) {
    return this.paymentsService.update(orgId, id, body);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a payment and reverse allocations',
    description:
      'Hard-deletes a payment, reverses its own bank journal, and recomputes each previously-allocated invoice — restoring its `balance_due` and bumping its status back (paid → partially_paid → sent as appropriate). Re-posts the affected invoice journals so the books always match.',
  })
  async remove(
    @OrgId() orgId: string,
    @Param('id') id: string,
  ) {
    return this.paymentsService.remove(orgId, id);
  }

  @Post(':id/allocate')
  @ApiOperation({
    summary: 'Allocate payment to multiple invoices',
    description:
      'Distributes an existing payment\'s unallocated balance across one or more invoices / bills. The service validates each invoice belongs to the same contact and updates each one\'s `amount_paid` / `balance_due` / `status`. Use this when applying a previously-received advance to new invoices, or correcting an allocation made at payment time.',
  })
  async allocate(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() body: AllocatePaymentDto,
  ) {
    return this.paymentsService.allocate(orgId, id, body);
  }
}
