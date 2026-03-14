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
  @ApiOperation({ summary: 'List bank transactions with filters' })
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
  @ApiOperation({ summary: 'Add a manual bank transaction' })
  async create(
    @OrgId() orgId: string,
    @Body(new ZodValidationPipe(createBankTransactionSchema))
    body: CreateBankTransactionDto,
  ) {
    return this.bankTransactionsService.create(orgId, body);
  }

  @Post('import')
  @ApiOperation({ summary: 'Bulk import transactions from CSV data' })
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
  @ApiOperation({ summary: 'Get unreconciled transactions' })
  @ApiQuery({ name: 'bank_account_id', required: false })
  async getUnreconciled(
    @OrgId() orgId: string,
    @Query('bank_account_id') bankAccountId?: string,
  ) {
    return this.bankTransactionsService.getUnreconciled(orgId, bankAccountId);
  }

  @Patch(':id/reconcile')
  @ApiOperation({ summary: 'Mark transaction as reconciled' })
  async reconcile(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reconcileTransactionSchema))
    body: ReconcileTransactionDto,
  ) {
    return this.bankTransactionsService.reconcile(orgId, id, body);
  }
}
