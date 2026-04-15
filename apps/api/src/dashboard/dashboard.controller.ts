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
  @ApiOperation({ summary: 'All KPI stats for the dashboard' })
  async getStats(@OrgId() orgId: string) {
    return this.dashboardService.getStats(orgId);
  }

  @Get('revenue-chart')
  @ApiOperation({ summary: 'Monthly revenue vs expenses chart data' })
  @ApiQuery({ name: 'months', required: false, type: Number, description: 'Number of months (default 6)' })
  async getRevenueChart(
    @OrgId() orgId: string,
    @Query('months') months: number = 6,
  ) {
    return this.dashboardService.getRevenueChart(orgId, months);
  }

  @Get('cash-flow-chart')
  @ApiOperation({ summary: 'Monthly inflows vs outflows chart data' })
  @ApiQuery({ name: 'months', required: false, type: Number, description: 'Number of months (default 6)' })
  async getCashFlowChart(
    @OrgId() orgId: string,
    @Query('months') months: number = 6,
  ) {
    return this.dashboardService.getCashFlowChart(orgId, months);
  }

  @Get('recent-transactions')
  @ApiOperation({ summary: 'Recent journal entries with line details' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of transactions (default 10)' })
  async getRecentTransactions(
    @OrgId() orgId: string,
    @Query('limit') limit: number = 10,
  ) {
    return this.dashboardService.getRecentTransactions(orgId, limit);
  }

  @Get('overdue-invoices')
  @ApiOperation({ summary: 'Invoices past due date, ordered by days overdue' })
  async getOverdueInvoices(@OrgId() orgId: string) {
    return this.dashboardService.getOverdueInvoices(orgId);
  }

  @Get('top-customers')
  @ApiOperation({ summary: 'Top customers by revenue' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of customers (default 5)' })
  async getTopCustomers(
    @OrgId() orgId: string,
    @Query('limit') limit: number = 5,
  ) {
    return this.dashboardService.getTopCustomers(orgId, limit);
  }

  @Get('aging')
  @ApiOperation({ summary: 'Receivable/Payable aging breakdown by day buckets' })
  @ApiQuery({ name: 'type', required: true, description: 'receivable or payable' })
  async getAging(
    @OrgId() orgId: string,
    @Query('type') type: string,
  ) {
    return this.dashboardService.getAgingBreakdown(orgId, type as 'receivable' | 'payable');
  }

  @Get('aging/invoices')
  @ApiOperation({ summary: 'Invoices for a specific aging bucket' })
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
  @ApiOperation({ summary: 'Revenue vs expenses for a specific period' })
  @ApiQuery({ name: 'period', required: true, description: 'fiscal_year, prev_fiscal_year, last_12_months' })
  async getRevenueChartByPeriod(
    @OrgId() orgId: string,
    @Query('period') period: string,
  ) {
    return this.dashboardService.getRevenueChartByPeriod(orgId, period);
  }
}
