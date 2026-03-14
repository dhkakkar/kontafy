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
  @ApiOperation({ summary: 'List bank accounts for the organization' })
  async findAll(@OrgId() orgId: string) {
    return this.bankAccountsService.findAll(orgId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a new bank account' })
  async create(
    @OrgId() orgId: string,
    @Body(new ZodValidationPipe(createBankAccountSchema)) body: CreateBankAccountDto,
  ) {
    return this.bankAccountsService.create(orgId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a bank account' })
  async update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateBankAccountSchema)) body: UpdateBankAccountDto,
  ) {
    return this.bankAccountsService.update(orgId, id, body);
  }

  @Get(':id/balance')
  @ApiOperation({ summary: 'Get current balance (opening + all transactions)' })
  async getBalance(@OrgId() orgId: string, @Param('id') id: string) {
    return this.bankAccountsService.getBalance(orgId, id);
  }
}
