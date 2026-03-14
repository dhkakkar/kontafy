import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { Response } from 'express';
import { OrgId } from '../common/decorators/org-id.decorator';
import { ReportsService } from './reports.service';
import { ReportsExportService } from './reports-export.service';
import {
  GeneralLedgerQuery,
  DayBookQuery,
  AgingQuery,
  SalesRegisterQuery,
  PurchaseRegisterQuery,
  StockSummaryQuery,
  StockMovementQuery,
  GstSummaryQuery,
  TdsSummaryQuery,
  ExportReportDto,
} from './dto/reports.dto';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@ApiSecurity('org-id')
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly reportsExportService: ReportsExportService,
  ) {}

  @Get('general-ledger')
  @ApiOperation({ summary: 'General Ledger report' })
  async getGeneralLedger(
    @OrgId() orgId: string,
    @Query() query: GeneralLedgerQuery,
  ) {
    return this.reportsService.getGeneralLedger(orgId, query);
  }

  @Get('day-book')
  @ApiOperation({ summary: 'Day Book (journal register)' })
  async getDayBook(
    @OrgId() orgId: string,
    @Query() query: DayBookQuery,
  ) {
    return this.reportsService.getDayBook(orgId, query);
  }

  @Get('receivable-aging')
  @ApiOperation({ summary: 'Accounts Receivable aging report' })
  async getReceivableAging(
    @OrgId() orgId: string,
    @Query() query: AgingQuery,
  ) {
    return this.reportsService.getReceivableAging(orgId, query);
  }

  @Get('payable-aging')
  @ApiOperation({ summary: 'Accounts Payable aging report' })
  async getPayableAging(
    @OrgId() orgId: string,
    @Query() query: AgingQuery,
  ) {
    return this.reportsService.getPayableAging(orgId, query);
  }

  @Get('sales-register')
  @ApiOperation({ summary: 'Sales Register report' })
  async getSalesRegister(
    @OrgId() orgId: string,
    @Query() query: SalesRegisterQuery,
  ) {
    return this.reportsService.getSalesRegister(orgId, query);
  }

  @Get('purchase-register')
  @ApiOperation({ summary: 'Purchase Register report' })
  async getPurchaseRegister(
    @OrgId() orgId: string,
    @Query() query: PurchaseRegisterQuery,
  ) {
    return this.reportsService.getPurchaseRegister(orgId, query);
  }

  @Get('stock-summary')
  @ApiOperation({ summary: 'Stock Summary / Inventory Valuation' })
  async getStockSummary(
    @OrgId() orgId: string,
    @Query() query: StockSummaryQuery,
  ) {
    return this.reportsService.getStockSummary(orgId, query);
  }

  @Get('stock-movement')
  @ApiOperation({ summary: 'Stock Movement report' })
  async getStockMovement(
    @OrgId() orgId: string,
    @Query() query: StockMovementQuery,
  ) {
    return this.reportsService.getStockMovement(orgId, query);
  }

  @Get('gst-summary')
  @ApiOperation({ summary: 'GST Summary (output vs input tax)' })
  async getGstSummary(
    @OrgId() orgId: string,
    @Query() query: GstSummaryQuery,
  ) {
    return this.reportsService.getGstSummary(orgId, query);
  }

  @Get('tds-summary')
  @ApiOperation({ summary: 'TDS Summary report' })
  async getTdsSummary(
    @OrgId() orgId: string,
    @Query() query: TdsSummaryQuery,
  ) {
    return this.reportsService.getTdsSummary(orgId, query);
  }

  @Post('export')
  @ApiOperation({ summary: 'Export a report as PDF, Excel, or CSV' })
  async exportReport(
    @OrgId() orgId: string,
    @Body() dto: ExportReportDto,
    @Res() res: Response,
  ) {
    const { buffer, filename, contentType } =
      await this.reportsExportService.exportReport(orgId, dto);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
