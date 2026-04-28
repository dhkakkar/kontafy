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
  GeneralLedgerQuerySchema,
  DayBookQuery,
  DayBookQuerySchema,
  AgingQuery,
  AgingQuerySchema,
  SalesRegisterQuery,
  SalesRegisterQuerySchema,
  PurchaseRegisterQuery,
  PurchaseRegisterQuerySchema,
  StockSummaryQuery,
  StockSummaryQuerySchema,
  StockMovementQuery,
  StockMovementQuerySchema,
  GstSummaryQuery,
  GstSummaryQuerySchema,
  TdsSummaryQuery,
  TdsSummaryQuerySchema,
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

  // Query strings come in untyped from Express; running each one through
  // its Zod schema coerces page/limit to numbers and validates date
  // formats so the underlying Prisma calls don't blow up with "Expected
  // Int, provided String" errors.
  @Get('general-ledger')
  @ApiOperation({ summary: 'General Ledger report' })
  async getGeneralLedger(
    @OrgId() orgId: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.reportsService.getGeneralLedger(
      orgId,
      GeneralLedgerQuerySchema.parse(query),
    );
  }

  @Get('day-book')
  @ApiOperation({ summary: 'Day Book (journal register)' })
  async getDayBook(
    @OrgId() orgId: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.reportsService.getDayBook(
      orgId,
      DayBookQuerySchema.parse(query),
    );
  }

  @Get('receivable-aging')
  @ApiOperation({ summary: 'Accounts Receivable aging report' })
  async getReceivableAging(
    @OrgId() orgId: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.reportsService.getReceivableAging(
      orgId,
      AgingQuerySchema.parse(query),
    );
  }

  @Get('payable-aging')
  @ApiOperation({ summary: 'Accounts Payable aging report' })
  async getPayableAging(
    @OrgId() orgId: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.reportsService.getPayableAging(
      orgId,
      AgingQuerySchema.parse(query),
    );
  }

  @Get('sales-register')
  @ApiOperation({ summary: 'Sales Register report' })
  async getSalesRegister(
    @OrgId() orgId: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.reportsService.getSalesRegister(
      orgId,
      SalesRegisterQuerySchema.parse(query),
    );
  }

  @Get('purchase-register')
  @ApiOperation({ summary: 'Purchase Register report' })
  async getPurchaseRegister(
    @OrgId() orgId: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.reportsService.getPurchaseRegister(
      orgId,
      PurchaseRegisterQuerySchema.parse(query),
    );
  }

  @Get('stock-summary')
  @ApiOperation({ summary: 'Stock Summary / Inventory Valuation' })
  async getStockSummary(
    @OrgId() orgId: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.reportsService.getStockSummary(
      orgId,
      StockSummaryQuerySchema.parse(query),
    );
  }

  @Get('stock-movement')
  @ApiOperation({ summary: 'Stock Movement report' })
  async getStockMovement(
    @OrgId() orgId: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.reportsService.getStockMovement(
      orgId,
      StockMovementQuerySchema.parse(query),
    );
  }

  @Get('gst-summary')
  @ApiOperation({ summary: 'GST Summary (output vs input tax)' })
  async getGstSummary(
    @OrgId() orgId: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.reportsService.getGstSummary(
      orgId,
      GstSummaryQuerySchema.parse(query),
    );
  }

  @Get('tds-summary')
  @ApiOperation({ summary: 'TDS Summary report' })
  async getTdsSummary(
    @OrgId() orgId: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.reportsService.getTdsSummary(
      orgId,
      TdsSummaryQuerySchema.parse(query),
    );
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
