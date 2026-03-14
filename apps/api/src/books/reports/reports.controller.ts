import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiSecurity,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { OrgId } from '../../common/decorators/org-id.decorator';

@ApiTags('Books')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('books/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('trial-balance')
  @ApiOperation({ summary: 'Trial balance as of a date' })
  @ApiQuery({ name: 'asOfDate', required: false, description: 'As-of date (YYYY-MM-DD)' })
  async getTrialBalance(
    @OrgId() orgId: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.reportsService.getTrialBalance(orgId, asOfDate);
  }

  @Get('profit-loss')
  @ApiOperation({ summary: 'Profit & Loss statement for a date range' })
  @ApiQuery({ name: 'fromDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'toDate', required: true, description: 'End date (YYYY-MM-DD)' })
  async getProfitAndLoss(
    @OrgId() orgId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.reportsService.getProfitAndLoss(orgId, fromDate, toDate);
  }

  @Get('balance-sheet')
  @ApiOperation({ summary: 'Balance sheet as of a date' })
  @ApiQuery({ name: 'asOfDate', required: false, description: 'As-of date (YYYY-MM-DD)' })
  async getBalanceSheet(
    @OrgId() orgId: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.reportsService.getBalanceSheet(orgId, asOfDate);
  }

  @Get('cash-flow')
  @ApiOperation({ summary: 'Cash flow statement (indirect method)' })
  @ApiQuery({ name: 'fromDate', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'toDate', required: true, description: 'End date (YYYY-MM-DD)' })
  async getCashFlow(
    @OrgId() orgId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.reportsService.getCashFlow(orgId, fromDate, toDate);
  }

  @Get('day-book')
  @ApiOperation({ summary: 'All transactions for a specific day' })
  @ApiQuery({ name: 'date', required: true, description: 'Date (YYYY-MM-DD)' })
  async getDayBook(
    @OrgId() orgId: string,
    @Query('date') date: string,
  ) {
    return this.reportsService.getDayBook(orgId, date);
  }

  @Get('general-ledger')
  @ApiOperation({ summary: 'Detailed ledger for a specific account' })
  @ApiQuery({ name: 'accountId', required: true, description: 'Account UUID' })
  @ApiQuery({ name: 'fromDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'toDate', required: false, description: 'End date (YYYY-MM-DD)' })
  async getGeneralLedger(
    @OrgId() orgId: string,
    @Query('accountId') accountId: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.reportsService.getGeneralLedger(
      orgId,
      accountId,
      fromDate,
      toDate,
    );
  }
}
