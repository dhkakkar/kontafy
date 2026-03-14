import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { ReconciliationService } from './reconciliation.service';
import { OrgId } from '../../common/decorators/org-id.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { autoMatchSchema, AutoMatchDto } from '../dto/bank.dto';

@ApiTags('Bank')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('bank/reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get reconciliation summary' })
  @ApiQuery({ name: 'bank_account_id', required: false })
  async getSummary(
    @OrgId() orgId: string,
    @Query('bank_account_id') bankAccountId?: string,
  ) {
    return this.reconciliationService.getSummary(orgId, bankAccountId);
  }

  @Post('auto-match')
  @ApiOperation({ summary: 'Trigger auto-matching for a bank account' })
  async autoMatch(
    @OrgId() orgId: string,
    @Body(new ZodValidationPipe(autoMatchSchema)) body: AutoMatchDto,
  ) {
    return this.reconciliationService.autoMatch(orgId, body);
  }
}
