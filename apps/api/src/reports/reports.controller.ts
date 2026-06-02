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
  @ApiOperation({
    summary: 'General Ledger report',
    description:
      'Returns account-wise debit/credit movements with opening and closing balances for a date range. Supports filters via `account_id`, `from_date`, `to_date`, `page` and `limit`. The same data drives the General Ledger drill-down screen.',
  })
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
  @ApiOperation({
    summary: 'Day Book (journal register)',
    description:
      'Chronological list of every journal entry posted in the window, mirroring the traditional Tally Day Book. Filters: `from_date`, `to_date`, `page`, `limit`. Each row carries narration, source document reference and the full ledger line items.',
  })
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
  @ApiOperation({
    summary: 'Accounts Receivable aging report',
    description:
      'Buckets unpaid customer invoices by age (0-30 / 31-60 / 61-90 / 90+ days) as of the supplied `as_of_date`. Optional `customer_id` filter narrows to a single party. Used to identify slow-paying customers and prioritise collection calls.',
  })
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
  @ApiOperation({
    summary: 'Accounts Payable aging report',
    description:
      'Buckets unpaid vendor bills by age (0-30 / 31-60 / 61-90 / 90+ days) as of `as_of_date`. Optional `vendor_id` filter restricts to a single supplier. Use this to plan outgoing payments and avoid penalty interest on overdue bills.',
  })
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
  @ApiOperation({
    summary: 'Sales Register report',
    description:
      'Itemised list of every sales invoice in the date range with taxable value, GST split and total. Filters: `from_date`, `to_date`, `customer_id`, `page`, `limit`. Forms the basis of GSTR-1 outward supply reconciliation.',
  })
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
  @ApiOperation({
    summary: 'Purchase Register report',
    description:
      'Itemised list of every purchase bill in the date range with taxable value, input GST split and total. Filters: `from_date`, `to_date`, `vendor_id`, `page`, `limit`. Used to reconcile input tax credit against GSTR-2B.',
  })
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
  @ApiOperation({
    summary: 'Stock Summary / Inventory Valuation',
    description:
      'Closing quantity and valuation per product as of `as_of_date`, with optional `warehouse_id` and `product_id` filters. Valuation uses the org\'s configured costing method (weighted average by default).',
  })
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
  @ApiOperation({
    summary: 'Stock Movement report',
    description:
      'Inwards/outwards/transfer ledger per product across the date range. Filters: `product_id`, `warehouse_id`, `from_date`, `to_date`, `movement_type`. Each row links back to its source document (invoice / purchase / adjustment).',
  })
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
  @ApiOperation({
    summary: 'GST Summary (output vs input tax)',
    description:
      'Aggregates output GST from sales and input GST from purchases for the period, broken down by CGST / SGST / IGST / Cess, and shows the net liability. Filters: `from_date`, `to_date`. Useful as a quick pre-filing sanity check before pulling the full GSTR-3B from `GET /tax/gst/returns/gstr3b/compute`.',
  })
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
  @ApiOperation({
    summary: 'TDS Summary report',
    description:
      'TDS deducted grouped by section (194C, 194J, 194I, etc.) for the period, with vendor counts and total deduction. Filters: `from_date`, `to_date`, optional `section`. Used to assemble quarterly TDS returns (24Q/26Q).',
  })
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
  @ApiOperation({
    summary: 'Export a report as PDF, Excel, or CSV',
    description:
      'Generates a file for any of the reports above. The body specifies `report` (one of `general-ledger`, `day-book`, `receivable-aging`, etc.), `format` (`pdf` | `xlsx` | `csv`) and the same filter fields the corresponding GET endpoint accepts. Returns the binary file with a `Content-Disposition: attachment` header.',
  })
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
