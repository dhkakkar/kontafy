import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ExportReportDto } from './dto/reports.dto';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ReportsExportService {
  private readonly logger = new Logger(ReportsExportService.name);

  constructor(private readonly reportsService: ReportsService) {}

  async exportReport(
    orgId: string,
    dto: ExportReportDto,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const filters = dto.filters || {};

    // Fetch report data
    const data = await this.getReportData(orgId, dto.reportType, filters);

    if (dto.format === 'excel') {
      return this.generateExcel(dto.reportType, data, filters);
    } else if (dto.format === 'csv') {
      return this.generateCsv(dto.reportType, data, filters);
    } else if (dto.format === 'pdf') {
      return this.generatePdfFallback(dto.reportType, data, filters);
    }

    throw new BadRequestException('Unsupported export format');
  }

  private async getReportData(
    orgId: string,
    reportType: string,
    filters: Record<string, string>,
  ): Promise<any> {
    switch (reportType) {
      case 'general-ledger':
        return this.reportsService.getGeneralLedger(orgId, {
          fromDate: filters.fromDate,
          toDate: filters.toDate,
          accountId: filters.accountId,
          accountType: filters.accountType,
        });
      case 'day-book':
        return this.reportsService.getDayBook(orgId, {
          fromDate: filters.fromDate || new Date().toISOString().split('T')[0],
          toDate: filters.toDate || new Date().toISOString().split('T')[0],
          page: 1,
          limit: 10000,
        });
      case 'receivable-aging':
        return this.reportsService.getReceivableAging(orgId, {
          asOfDate: filters.asOfDate,
          contactId: filters.contactId,
        });
      case 'payable-aging':
        return this.reportsService.getPayableAging(orgId, {
          asOfDate: filters.asOfDate,
          contactId: filters.contactId,
        });
      case 'sales-register':
        return this.reportsService.getSalesRegister(orgId, {
          fromDate: filters.fromDate || '',
          toDate: filters.toDate || '',
          contactId: filters.contactId,
          groupBy: (filters.groupBy as any) || 'customer',
        });
      case 'purchase-register':
        return this.reportsService.getPurchaseRegister(orgId, {
          fromDate: filters.fromDate || '',
          toDate: filters.toDate || '',
          contactId: filters.contactId,
          groupBy: (filters.groupBy as any) || 'vendor',
        });
      case 'stock-summary':
        return this.reportsService.getStockSummary(orgId, {
          warehouseId: filters.warehouseId,
          productId: filters.productId,
        });
      case 'stock-movement':
        return this.reportsService.getStockMovement(orgId, {
          fromDate: filters.fromDate || '',
          toDate: filters.toDate || '',
          productId: filters.productId,
          warehouseId: filters.warehouseId,
          type: filters.type,
        });
      case 'gst-summary':
        return this.reportsService.getGstSummary(orgId, {
          fromDate: filters.fromDate || '',
          toDate: filters.toDate || '',
        });
      case 'tds-summary':
        return this.reportsService.getTdsSummary(orgId, {
          fromDate: filters.fromDate || '',
          toDate: filters.toDate || '',
          section: filters.section,
        });
      default:
        throw new BadRequestException(`Unknown report type: ${reportType}`);
    }
  }

  // ── Excel Export ──────────────────────────────────────────────

  private async generateExcel(
    reportType: string,
    data: any,
    filters: Record<string, string>,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Kontafy';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(this.formatReportName(reportType));

    // Style header
    const headerStyle: Partial<ExcelJS.Style> = {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
      font: { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' },
        bottom: { style: 'thin' },
        left: { style: 'thin' },
        right: { style: 'thin' },
      },
    };

    switch (reportType) {
      case 'receivable-aging':
      case 'payable-aging':
        this.buildAgingExcel(sheet, data, headerStyle);
        break;
      case 'sales-register':
      case 'purchase-register':
        this.buildRegisterExcel(sheet, data, headerStyle, reportType);
        break;
      case 'stock-summary':
        this.buildStockSummaryExcel(sheet, data, headerStyle);
        break;
      case 'stock-movement':
        this.buildStockMovementExcel(sheet, data, headerStyle);
        break;
      case 'gst-summary':
        this.buildGstSummaryExcel(sheet, data, headerStyle);
        break;
      case 'tds-summary':
        this.buildTdsSummaryExcel(sheet, data, headerStyle);
        break;
      case 'general-ledger':
        this.buildGeneralLedgerExcel(sheet, data, headerStyle);
        break;
      case 'day-book':
        this.buildDayBookExcel(sheet, data, headerStyle);
        break;
      default:
        sheet.addRow(['Report data exported']);
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const dateSuffix = new Date().toISOString().split('T')[0];

    return {
      buffer,
      filename: `${reportType}-${dateSuffix}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  private buildAgingExcel(sheet: ExcelJS.Worksheet, data: any, headerStyle: any) {
    const headers = ['Contact', 'Company', 'Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days', 'Total'];
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => { cell.style = headerStyle; });

    for (const bucket of data.buckets) {
      sheet.addRow([
        bucket.contact_name,
        bucket.company_name || '',
        bucket.current,
        bucket.days_1_30,
        bucket.days_31_60,
        bucket.days_61_90,
        bucket.days_90_plus,
        bucket.total,
      ]);
    }

    // Totals row
    const totalsRow = sheet.addRow([
      'TOTAL', '', data.totals.current, data.totals.days_1_30,
      data.totals.days_31_60, data.totals.days_61_90, data.totals.days_90_plus, data.totals.total,
    ]);
    totalsRow.font = { bold: true };

    // Auto-width
    sheet.columns.forEach((col) => { col.width = 18; });
  }

  private buildRegisterExcel(sheet: ExcelJS.Worksheet, data: any, headerStyle: any, type: string) {
    const headers = ['Date', 'Invoice #', 'Contact', 'Subtotal', 'Tax', 'Total', 'Paid', 'Balance'];
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => { cell.style = headerStyle; });

    for (const entry of data.entries) {
      sheet.addRow([
        new Date(entry.date).toISOString().split('T')[0],
        entry.invoice_number,
        entry.contact?.name || '',
        entry.subtotal,
        entry.tax_amount,
        entry.total,
        entry.amount_paid,
        entry.balance_due,
      ]);
    }

    const totalsRow = sheet.addRow([
      'TOTAL', '', `${data.totals.invoice_count} invoices`,
      data.totals.subtotal, data.totals.tax_amount, data.totals.total,
      data.totals.amount_paid, data.totals.balance_due,
    ]);
    totalsRow.font = { bold: true };
    sheet.columns.forEach((col) => { col.width = 18; });
  }

  private buildStockSummaryExcel(sheet: ExcelJS.Worksheet, data: any, headerStyle: any) {
    const headers = ['Product', 'SKU', 'Unit', 'Quantity', 'Purchase Price', 'Stock Value', 'Selling Value', 'Below Reorder'];
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => { cell.style = headerStyle; });

    for (const item of data.items) {
      sheet.addRow([
        item.name,
        item.sku || '',
        item.unit,
        item.total_quantity,
        item.purchase_price,
        item.total_stock_value,
        item.total_selling_value,
        item.below_reorder ? 'Yes' : 'No',
      ]);
    }

    const totalsRow = sheet.addRow([
      'TOTAL', '', '', data.totals.total_quantity, '', data.totals.total_stock_value, data.totals.total_selling_value, '',
    ]);
    totalsRow.font = { bold: true };
    sheet.columns.forEach((col) => { col.width = 18; });
  }

  private buildStockMovementExcel(sheet: ExcelJS.Worksheet, data: any, headerStyle: any) {
    const headers = ['Date', 'Product', 'Warehouse', 'Type', 'Quantity', 'Cost Price', 'Notes'];
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => { cell.style = headerStyle; });

    for (const entry of data.entries) {
      sheet.addRow([
        new Date(entry.date).toISOString().split('T')[0],
        entry.product.name,
        entry.warehouse.name,
        entry.type,
        entry.quantity,
        entry.cost_price,
        entry.notes || '',
      ]);
    }
    sheet.columns.forEach((col) => { col.width = 18; });
  }

  private buildGstSummaryExcel(sheet: ExcelJS.Worksheet, data: any, headerStyle: any) {
    // Output Tax section
    sheet.addRow(['OUTPUT TAX (Sales)']).font = { bold: true, size: 12 };
    const outHeaders = ['Rate %', 'Taxable Amount', 'CGST', 'SGST', 'IGST', 'Cess', 'Total Tax'];
    const outHeaderRow = sheet.addRow(outHeaders);
    outHeaderRow.eachCell((cell) => { cell.style = headerStyle; });

    for (const r of data.output_tax.rate_wise) {
      sheet.addRow([r.rate, r.taxable_amount, r.cgst, r.sgst, r.igst, r.cess, r.total_tax]);
    }
    const outTotals = sheet.addRow([
      'Total', data.output_tax.taxable_amount, data.output_tax.cgst,
      data.output_tax.sgst, data.output_tax.igst, data.output_tax.cess, data.output_tax.total_tax,
    ]);
    outTotals.font = { bold: true };

    sheet.addRow([]); // blank row

    // Input Tax section
    sheet.addRow(['INPUT TAX (Purchases)']).font = { bold: true, size: 12 };
    const inHeaderRow = sheet.addRow(outHeaders);
    inHeaderRow.eachCell((cell) => { cell.style = headerStyle; });

    for (const r of data.input_tax.rate_wise) {
      sheet.addRow([r.rate, r.taxable_amount, r.cgst, r.sgst, r.igst, r.cess, r.total_tax]);
    }
    const inTotals = sheet.addRow([
      'Total', data.input_tax.taxable_amount, data.input_tax.cgst,
      data.input_tax.sgst, data.input_tax.igst, data.input_tax.cess, data.input_tax.total_tax,
    ]);
    inTotals.font = { bold: true };

    sheet.addRow([]);

    // Net Liability
    sheet.addRow(['NET GST LIABILITY']).font = { bold: true, size: 12 };
    sheet.addRow(['CGST', data.net_liability.cgst]);
    sheet.addRow(['SGST', data.net_liability.sgst]);
    sheet.addRow(['IGST', data.net_liability.igst]);
    sheet.addRow(['Cess', data.net_liability.cess]);
    const netRow = sheet.addRow(['Total Net Liability', data.net_liability.total]);
    netRow.font = { bold: true };

    sheet.columns.forEach((col) => { col.width = 18; });
  }

  private buildTdsSummaryExcel(sheet: ExcelJS.Worksheet, data: any, headerStyle: any) {
    const headers = ['Date', 'Section', 'Deductee', 'PAN', 'Gross Amount', 'TDS Rate', 'TDS Amount', 'Status'];
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => { cell.style = headerStyle; });

    for (const entry of data.entries) {
      sheet.addRow([
        new Date(entry.date).toISOString().split('T')[0],
        entry.section,
        entry.contact?.name || '',
        entry.contact?.pan || '',
        entry.gross_amount,
        entry.tds_rate,
        entry.tds_amount,
        entry.status,
      ]);
    }

    const totalsRow = sheet.addRow([
      'TOTAL', '', '', '', data.totals.total_gross_amount, '', data.totals.total_tds_amount, '',
    ]);
    totalsRow.font = { bold: true };
    sheet.columns.forEach((col) => { col.width = 18; });
  }

  private buildGeneralLedgerExcel(sheet: ExcelJS.Worksheet, data: any, headerStyle: any) {
    for (const account of data.accounts) {
      sheet.addRow([`${account.account.code || ''} - ${account.account.name} (${account.account.type})`]).font = { bold: true, size: 12 };
      const headerRow = sheet.addRow(['Date', 'Entry #', 'Narration', 'Debit', 'Credit', 'Balance']);
      headerRow.eachCell((cell) => { cell.style = headerStyle; });

      sheet.addRow(['', '', 'Opening Balance', '', '', account.opening_balance]).font = { italic: true };

      for (const txn of account.transactions) {
        sheet.addRow([
          new Date(txn.date).toISOString().split('T')[0],
          txn.entry_number,
          txn.narration || txn.description || '',
          txn.debit || '',
          txn.credit || '',
          txn.balance,
        ]);
      }

      const closingRow = sheet.addRow([
        '', '', 'Closing Balance', account.total_debit, account.total_credit, account.closing_balance,
      ]);
      closingRow.font = { bold: true };
      sheet.addRow([]);
    }
    sheet.columns.forEach((col) => { col.width = 18; });
  }

  private buildDayBookExcel(sheet: ExcelJS.Worksheet, data: any, headerStyle: any) {
    const headers = ['Date', 'Entry #', 'Narration', 'Account', 'Debit', 'Credit'];
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell((cell) => { cell.style = headerStyle; });

    for (const entry of data.entries) {
      for (const line of entry.lines) {
        sheet.addRow([
          new Date(entry.date).toISOString().split('T')[0],
          entry.entry_number,
          entry.narration || '',
          `${line.account_code || ''} ${line.account_name}`,
          line.debit || '',
          line.credit || '',
        ]);
      }
    }

    const totalsRow = sheet.addRow(['TOTAL', '', '', '', data.totals.debit, data.totals.credit]);
    totalsRow.font = { bold: true };
    sheet.columns.forEach((col) => { col.width = 20; });
  }

  // ── CSV Export ────────────────────────────────────────────────

  private async generateCsv(
    reportType: string,
    data: any,
    filters: Record<string, string>,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    let csvContent = '';

    switch (reportType) {
      case 'receivable-aging':
      case 'payable-aging':
        csvContent = this.buildAgingCsv(data);
        break;
      case 'sales-register':
      case 'purchase-register':
        csvContent = this.buildRegisterCsv(data);
        break;
      case 'stock-summary':
        csvContent = this.buildStockSummaryCsv(data);
        break;
      default:
        csvContent = JSON.stringify(data, null, 2);
    }

    const dateSuffix = new Date().toISOString().split('T')[0];
    return {
      buffer: Buffer.from(csvContent, 'utf-8'),
      filename: `${reportType}-${dateSuffix}.csv`,
      contentType: 'text/csv',
    };
  }

  private buildAgingCsv(data: any): string {
    const header = 'Contact,Company,Current,1-30 Days,31-60 Days,61-90 Days,90+ Days,Total\n';
    const rows = data.buckets
      .map(
        (b: any) =>
          `"${b.contact_name}","${b.company_name || ''}",${b.current},${b.days_1_30},${b.days_31_60},${b.days_61_90},${b.days_90_plus},${b.total}`,
      )
      .join('\n');
    return header + rows;
  }

  private buildRegisterCsv(data: any): string {
    const header = 'Date,Invoice #,Contact,Subtotal,Tax,Total,Paid,Balance\n';
    const rows = data.entries
      .map(
        (e: any) =>
          `${new Date(e.date).toISOString().split('T')[0]},"${e.invoice_number}","${e.contact?.name || ''}",${e.subtotal},${e.tax_amount},${e.total},${e.amount_paid},${e.balance_due}`,
      )
      .join('\n');
    return header + rows;
  }

  private buildStockSummaryCsv(data: any): string {
    const header = 'Product,SKU,Unit,Quantity,Purchase Price,Stock Value,Selling Value,Below Reorder\n';
    const rows = data.items
      .map(
        (i: any) =>
          `"${i.name}","${i.sku || ''}","${i.unit}",${i.total_quantity},${i.purchase_price},${i.total_stock_value},${i.total_selling_value},${i.below_reorder ? 'Yes' : 'No'}`,
      )
      .join('\n');
    return header + rows;
  }

  // ── PDF Fallback (JSON response with print instructions) ─────

  private async generatePdfFallback(
    reportType: string,
    data: any,
    filters: Record<string, string>,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    // For PDF generation, we return the data as JSON with a note.
    // Production: use Puppeteer to render HTML template to PDF.
    // For now, generate a simple HTML that can be printed.
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${this.formatReportName(reportType)}</title>
        <style>
          body { font-family: -apple-system, sans-serif; margin: 40px; color: #333; }
          h1 { font-size: 24px; margin-bottom: 8px; }
          .meta { color: #666; font-size: 14px; margin-bottom: 24px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #f8f9fa; text-align: left; padding: 8px 12px; border-bottom: 2px solid #dee2e6; font-weight: 600; }
          td { padding: 6px 12px; border-bottom: 1px solid #f0f0f0; }
          .text-right { text-align: right; }
          .total-row { font-weight: bold; background: #f8f9fa; border-top: 2px solid #333; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <h1>${this.formatReportName(reportType)}</h1>
        <div class="meta">Generated on ${new Date().toISOString().split('T')[0]}</div>
        <pre>${JSON.stringify(data, null, 2)}</pre>
      </body>
      </html>
    `;

    const dateSuffix = new Date().toISOString().split('T')[0];
    return {
      buffer: Buffer.from(html, 'utf-8'),
      filename: `${reportType}-${dateSuffix}.html`,
      contentType: 'text/html',
    };
  }

  private formatReportName(type: string): string {
    return type
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
}
