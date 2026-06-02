import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiSecurity,
  ApiQuery,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { OrgId } from '../common/decorators/org-id.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'All KPI stats for the dashboard',
    description:
      'Returns the headline KPI cards for the main dashboard in a single call: total revenue, expenses, net profit, receivables, payables, cash balance, and month-over-month deltas. Period defaults to the current fiscal year so the response is cacheable.',
  })
  async getStats(@OrgId() orgId: string) {
    return this.dashboardService.getStats(orgId);
  }

  @Get('revenue-chart')
  @ApiOperation({
    summary: 'Monthly revenue vs expenses chart data',
    description:
      'Returns one data point per month for the last `months` (default 6) with revenue, expenses, and net profit. Feeds the bar / line chart on the main dashboard.',
  })
  @ApiQuery({ name: 'months', required: false, type: Number, description: 'Number of months (default 6)' })
  async getRevenueChart(
    @OrgId() orgId: string,
    @Query('months') months: number = 6,
  ) {
    return this.dashboardService.getRevenueChart(orgId, months);
  }

  @Get('cash-flow-chart')
  @ApiOperation({
    summary: 'Monthly inflows vs outflows chart data',
    description:
      'Returns monthly cash inflow and outflow figures for the last `months` (default 6), computed from posted bank/cash account movements. Feeds the cash-flow visualization on the dashboard.',
  })
  @ApiQuery({ name: 'months', required: false, type: Number, description: 'Number of months (default 6)' })
  async getCashFlowChart(
    @OrgId() orgId: string,
    @Query('months') months: number = 6,
  ) {
    return this.dashboardService.getCashFlowChart(orgId, months);
  }

  @Get('recent-transactions')
  @ApiOperation({
    summary: 'Recent journal entries with line details',
    description:
      'Returns the most recent posted journal entries (newest first) with their line items expanded. Use `limit` (default 10) to control the page size — used to populate the "Recent activity" card on the dashboard.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of transactions (default 10)' })
  async getRecentTransactions(
    @OrgId() orgId: string,
    @Query('limit') limit: number = 10,
  ) {
    return this.dashboardService.getRecentTransactions(orgId, limit);
  }

  @Get('overdue-invoices')
  @ApiOperation({
    summary: 'Invoices past due date, ordered by days overdue',
    description:
      'Returns every issued sales invoice whose due date has passed without full payment, sorted most-overdue first. Each row carries customer, outstanding amount, and the days-overdue count for the collections worklist on the dashboard.',
  })
  async getOverdueInvoices(@OrgId() orgId: string) {
    return this.dashboardService.getOverdueInvoices(orgId);
  }

  @Get('top-customers')
  @ApiOperation({
    summary: 'Top customers by revenue',
    description:
      'Returns the top `limit` (default 5) customers by total invoiced revenue in the current fiscal year, with name, total billed, and number of invoices. Used as a leaderboard card on the dashboard.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of customers (default 5)' })
  async getTopCustomers(
    @OrgId() orgId: string,
    @Query('limit') limit: number = 5,
  ) {
    return this.dashboardService.getTopCustomers(orgId, limit);
  }

  @Get('aging')
  @ApiOperation({
    summary: 'Receivable/Payable aging breakdown by day buckets',
    description:
      'Returns outstanding amounts bucketed by age (0, 1-15, 16-30, 31-45, 45+ days) for either receivables (sales invoices) or payables (purchase bills) based on the `type` query parameter. Drives the aging summary widget; drill into a bucket via `GET /dashboard/aging/invoices`.',
  })
  @ApiQuery({ name: 'type', required: true, description: 'receivable or payable' })
  async getAging(
    @OrgId() orgId: string,
    @Query('type') type: string,
  ) {
    return this.dashboardService.getAgingBreakdown(orgId, type as 'receivable' | 'payable');
  }

  @Get('aging/invoices')
  @ApiOperation({
    summary: 'Invoices for a specific aging bucket',
    description:
      'Returns the individual receivable or payable documents (depending on `type`) that fall within the supplied `bucket` (e.g. "1-15", "16-30", "31-45", "45+"). Used as the drill-down companion to `GET /dashboard/aging`.',
  })
  @ApiQuery({ name: 'type', required: true })
  @ApiQuery({ name: 'bucket', required: true, description: 'e.g. 1-15, 16-30, 31-45, 45+' })
  async getAgingInvoices(
    @OrgId() orgId: string,
    @Query('type') type: string,
    @Query('bucket') bucket: string,
  ) {
    return this.dashboardService.getAgingInvoices(orgId, type as 'receivable' | 'payable', bucket);
  }

  @Get('revenue-chart-period')
  @ApiOperation({
    summary: 'Revenue vs expenses for a specific period',
    description:
      'Like `/revenue-chart` but the time window is selected by a named `period`: `fiscal_year` (current FY), `prev_fiscal_year`, or `last_12_months`. Returns monthly buckets across that window so the chart can swap range without computing dates client-side.',
  })
  @ApiQuery({ name: 'period', required: true, description: 'fiscal_year, prev_fiscal_year, last_12_months' })
  async getRevenueChartByPeriod(
    @OrgId() orgId: string,
    @Query('period') period: string,
  ) {
    return this.dashboardService.getRevenueChartByPeriod(orgId, period);
  }
}
