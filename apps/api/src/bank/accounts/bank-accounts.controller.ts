import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { BankAccountsService } from './bank-accounts.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createBankAccountSchema,
  CreateBankAccountDto,
  updateBankAccountSchema,
  UpdateBankAccountDto,
} from '../dto/bank.dto';

@ApiTags('Bank')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('bank/accounts')
export class BankAccountsController {
  constructor(private readonly bankAccountsService: BankAccountsService) {}

  @Get()
  @ApiOperation({
    summary: 'List bank accounts for the organization',
    description:
      'Returns every bank, cash and wallet account configured for the org along with each one\'s metadata (account number, IFSC, opening balance, currency). The list is unpaginated and used to populate account pickers in payments, expenses and transfers.',
  })
  async findAll(@OrgId() orgId: string) {
    return this.bankAccountsService.findAll(orgId);
  }

  @Post()
  @ApiOperation({
    summary: 'Add a new bank account',
    description:
      'Creates a bank, cash or wallet account and auto-provisions the matching ledger account in the chart of accounts. Any non-zero `opening_balance` is posted as an opening-balance journal entry so the books reconcile from day one.',
  })
  async create(
    @OrgId() orgId: string,
    @Body(new ZodValidationPipe(createBankAccountSchema)) body: CreateBankAccountDto,
  ) {
    return this.bankAccountsService.create(orgId, body);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a bank account',
    description:
      'Patches the editable fields of a bank account (name, branch, IFSC, currency, etc.). The opening balance can be adjusted here — the linked opening-balance journal entry is rewritten in lock-step so the ledger stays consistent.',
  })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateBankAccountSchema)) body: UpdateBankAccountDto,
  ) {
    return this.bankAccountsService.update(orgId, id, body);
  }

  @Get(':id/balance')
  @ApiOperation({
    summary: 'Get current balance (opening + all transactions)',
    description:
      'Computes the live running balance for a single account: opening balance plus the net of every recorded credit and debit transaction. Use this on the bank account detail page header rather than the books-side ledger total, which lags slightly during background journal posting.',
  })
  async getBalance(@OrgId() orgId: string, @Param('id') id: string) {
    return this.bankAccountsService.getBalance(orgId, id);
  }
}
