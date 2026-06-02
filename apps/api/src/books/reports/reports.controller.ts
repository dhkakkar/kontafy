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
  @ApiOperation({
    summary: 'Trial balance as of a date',
    description:
      'Returns the trial balance grouped by account type with each account\'s closing debit/credit balance as of `asOfDate` (defaults to today). Total debits should equal total credits — if they do not, the books are out of balance and the response includes a diagnostic flag.',
  })
  @ApiQuery({ name: 'asOfDate', required: false, description: 'As-of date (YYYY-MM-DD)' })
  async getTrialBalance(
    @OrgId() orgId: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.reportsService.getTrialBalance(orgId, asOfDate);
  }

  @Get('profit-loss')
  @ApiOperation({
    summary: 'Profit & Loss statement for a date range',
    description:
      'Returns the P&L grouped into Income, Direct Expenses (cost of goods), Gross Profit, Indirect Expenses, and Net Profit, computed from posted journal lines between `fromDate` and `toDate` inclusive. Both date params are required.',
  })
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
  @ApiOperation({
    summary: 'Balance sheet as of a date',
    description:
      'Returns the balance sheet at the close of `asOfDate` (defaults to today) — Assets, Liabilities, and Equity sections with sub-totals. Retained earnings are computed by rolling up P&L from the start of the fiscal year through `asOfDate`. Total Assets should equal Total Liabilities + Equity.',
  })
  @ApiQuery({ name: 'asOfDate', required: false, description: 'As-of date (YYYY-MM-DD)' })
  async getBalanceSheet(
    @OrgId() orgId: string,
    @Query('asOfDate') asOfDate?: string,
  ) {
    return this.reportsService.getBalanceSheet(orgId, asOfDate);
  }

  @Get('cash-flow')
  @ApiOperation({
    summary: 'Cash flow statement (indirect method)',
    description:
      'Returns a cash-flow statement for `fromDate` to `toDate` using the indirect method: starts from Net Profit and adjusts for non-cash items and working-capital movements, broken into Operating, Investing, and Financing activities.',
  })
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
  @ApiOperation({
    summary: 'All transactions for a specific day',
    description:
      'Returns every posted journal entry dated `date` with its full line breakdown — useful as a chronological audit log of "what happened today". `date` is required and must be a single YYYY-MM-DD value.',
  })
  @ApiQuery({ name: 'date', required: true, description: 'Date (YYYY-MM-DD)' })
  async getDayBook(
    @OrgId() orgId: string,
    @Query('date') date: string,
  ) {
    return this.reportsService.getDayBook(orgId, date);
  }

  @Get('general-ledger')
  @ApiOperation({
    summary: 'Detailed ledger for a specific account',
    description:
      'Returns the full general ledger for the supplied `accountId`: opening balance, every dated debit/credit movement in `fromDate`-`toDate` with the contra account and narration, and the closing balance. The dates are optional — omit them to get the lifetime ledger of the account.',
  })
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
