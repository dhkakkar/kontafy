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
}
