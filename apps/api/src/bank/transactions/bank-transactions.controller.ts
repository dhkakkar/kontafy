import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { BankTransactionsService } from './bank-transactions.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createBankTransactionSchema,
  CreateBankTransactionDto,
  reconcileTransactionSchema,
  ReconcileTransactionDto,
} from '../dto/bank.dto';

@ApiTags('Bank')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('bank/transactions')
export class BankTransactionsController {
  constructor(
    private readonly bankTransactionsService: BankTransactionsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List bank transactions with filters',
    description:
      'Returns paginated bank statement rows for the org. Filter by `bank_account_id` to scope to one account, `from`/`to` for a date range and `is_reconciled` (true/false) to separate matched from open items. Results include both manually entered transactions and rows imported from CSV.',
  })
  @ApiQuery({ name: 'bank_account_id', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'is_reconciled', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @OrgId() orgId: string,
    @Query('bank_account_id') bankAccountId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('is_reconciled') isReconciled?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.bankTransactionsService.findAll(orgId, {
      bank_account_id: bankAccountId,
      from,
      to,
      is_reconciled: isReconciled,
      page,
      limit,
    });
  }

  @Post()
  @ApiOperation({
    summary: 'Add a manual bank transaction',
    description:
      'Records a single debit or credit on the chosen bank account — used when you spot a transaction in your statement that has no matching payment or expense yet. The row starts unreconciled and can be matched later via the reconciliation flow or by recording a payment that auto-links to it.',
  })
  async create(
    @OrgId() orgId: string,
    @Body(new ZodValidationPipe(createBankTransactionSchema))
    body: CreateBankTransactionDto,
  ) {
    return this.bankTransactionsService.create(orgId, body);
  }

  @Post('import')
  @ApiOperation({
    summary: 'Bulk import transactions from CSV data',
    description:
      'Bulk-creates bank transactions for one account from rows parsed client-side from a bank statement CSV. The import is idempotent on (date + amount + reference) so re-uploading the same statement does not duplicate rows. After import, call `POST /bank/reconciliation/auto-match` to pair the rows with existing payments and invoices.',
  })
  async importCsv(
    @OrgId() orgId: string,
    @Body()
    body: {
      bank_account_id: string;
      rows: Array<{
        date: string;
        description?: string;
        debit?: number;
        credit?: number;
        balance?: number;
        reference?: string;
      }>;
    },
  ) {
    return this.bankTransactionsService.importFromCsv(
      orgId,
      body.bank_account_id,
      body.rows,
    );
  }

  @Get('unreconciled')
  @ApiOperation({
    summary: 'Get unreconciled transactions',
    description:
      'Returns the open (not-yet-matched) bank transactions for the org, ordered by date. Used to power the manual matching UI and as the input set for the auto-match engine. Pass `bank_account_id` to restrict to one account.',
  })
  @ApiQuery({ name: 'bank_account_id', required: false })
  async getUnreconciled(
    @OrgId() orgId: string,
    @Query('bank_account_id') bankAccountId?: string,
  ) {
    return this.bankTransactionsService.getUnreconciled(orgId, bankAccountId);
  }

  @Patch(':id/reconcile')
  @ApiOperation({
    summary: 'Mark transaction as reconciled',
    description:
      'Confirms a bank transaction as matched to a payment, invoice or expense — flipping `is_reconciled` to true and recording the linked entity for the audit trail. Once reconciled, the row contributes to the reconciled total in the summary endpoint and is hidden from the unreconciled queue.',
  })
  async reconcile(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reconcileTransactionSchema))
    body: ReconcileTransactionDto,
  ) {
    return this.bankTransactionsService.reconcile(orgId, id, body);
  }
}
