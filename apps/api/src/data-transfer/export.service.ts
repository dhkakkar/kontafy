import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import * as archiver from 'archiver';
import { PassThrough } from 'stream';

export type ExportFormat = 'csv' | 'xlsx';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ──────────────────────────────────────────────────

  private formatDate(date: Date | null | undefined): string {
    if (!date) return '';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private formatAmount(value: any): string {
    if (value === null || value === undefined) return '0.00';
    const num = typeof value === 'object' && 'toNumber' in value ? value.toNumber() : Number(value);
    return num.toFixed(2);
  }

  private async buildWorkbook(
    sheetName: string,
    columns: { header: string; key: string; width?: number }[],
    rows: Record<string, any>[],
  ): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Kontafy';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(sheetName);
    sheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || 18,
    }));

    // Style the header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8E0F0' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'left' };

    rows.forEach((row) => sheet.addRow(row));

    return workbook;
  }

  private async workbookToBuffer(workbook: ExcelJS.Workbook, format: ExportFormat): Promise<Buffer> {
    if (format === 'csv') {
      const csvBuffer = await workbook.csv.writeBuffer();
      return Buffer.from(csvBuffer);
    }
    const xlsxBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(xlsxBuffer);
  }

  // ─── Export: Contacts ─────────────────────────────────────────

  async exportContacts(orgId: string, format: ExportFormat): Promise<Buffer> {
    this.logger.log(`Exporting contacts for org ${orgId} as ${format}`);

    const contacts = await this.prisma.contact.findMany({
      where: { org_id: orgId },
      orderBy: { name: 'asc' },
    });

    const columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Company Name', key: 'company_name', width: 25 },
      { header: 'GSTIN', key: 'gstin', width: 18 },
      { header: 'PAN', key: 'pan', width: 14 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'WhatsApp', key: 'whatsapp', width: 16 },
      { header: 'Payment Terms (Days)', key: 'payment_terms', width: 20 },
      { header: 'Credit Limit (INR)', key: 'credit_limit', width: 18 },
      { header: 'Opening Balance (INR)', key: 'opening_balance', width: 20 },
      { header: 'Billing Address', key: 'billing_address', width: 30 },
      { header: 'Shipping Address', key: 'shipping_address', width: 30 },
      { header: 'Notes', key: 'notes', width: 30 },
      { header: 'Active', key: 'is_active', width: 10 },
      { header: 'Created Date', key: 'created_at', width: 14 },
    ];

    const rows = contacts.map((c) => ({
      name: c.name,
      type: c.type,
      company_name: c.company_name || '',
      gstin: c.gstin || '',
      pan: c.pan || '',
      email: c.email || '',
      phone: c.phone || '',
      whatsapp: c.whatsapp || '',
      payment_terms: c.payment_terms,
      credit_limit: this.formatAmount(c.credit_limit),
      opening_balance: this.formatAmount(c.opening_balance),
      billing_address: typeof c.billing_address === 'object' ? JSON.stringify(c.billing_address) : '',
      shipping_address: typeof c.shipping_address === 'object' ? JSON.stringify(c.shipping_address) : '',
      notes: c.notes || '',
      is_active: c.is_active ? 'Yes' : 'No',
      created_at: this.formatDate(c.created_at),
    }));

    const workbook = await this.buildWorkbook('Contacts', columns, rows);
    return this.workbookToBuffer(workbook, format);
  }

  // ─── Export: Invoices ─────────────────────────────────────────

  async exportInvoices(
    orgId: string,
    format: ExportFormat,
    dateRange?: { from?: string; to?: string },
  ): Promise<Buffer> {
    this.logger.log(`Exporting invoices for org ${orgId} as ${format}`);

    const where: any = { org_id: orgId };
    if (dateRange?.from || dateRange?.to) {
      where.date = {};
      if (dateRange.from) where.date.gte = new Date(dateRange.from);
      if (dateRange.to) where.date.lte = new Date(dateRange.to);
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        contact: { select: { name: true, gstin: true } },
        items: {
          include: {
            product: { select: { name: true, sku: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const columns = [
      { header: 'Invoice Number', key: 'invoice_number', width: 18 },
      { header: 'Type', key: 'type', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Due Date', key: 'due_date', width: 14 },
      { header: 'Contact Name', key: 'contact_name', width: 22 },
      { header: 'Contact GSTIN', key: 'contact_gstin', width: 18 },
      { header: 'Place of Supply', key: 'place_of_supply', width: 16 },
      { header: 'Item Description', key: 'item_description', width: 28 },
      { header: 'HSN/SAC', key: 'hsn_code', width: 12 },
      { header: 'Qty', key: 'quantity', width: 10 },
      { header: 'Unit', key: 'unit', width: 8 },
      { header: 'Rate (INR)', key: 'rate', width: 14 },
      { header: 'Discount %', key: 'discount_pct', width: 12 },
      { header: 'Taxable Amount (INR)', key: 'taxable_amount', width: 20 },
      { header: 'CGST %', key: 'cgst_rate', width: 10 },
      { header: 'CGST (INR)', key: 'cgst_amount', width: 14 },
      { header: 'SGST %', key: 'sgst_rate', width: 10 },
      { header: 'SGST (INR)', key: 'sgst_amount', width: 14 },
      { header: 'IGST %', key: 'igst_rate', width: 10 },
      { header: 'IGST (INR)', key: 'igst_amount', width: 14 },
      { header: 'Item Total (INR)', key: 'item_total', width: 16 },
      { header: 'Invoice Subtotal (INR)', key: 'subtotal', width: 20 },
      { header: 'Invoice Discount (INR)', key: 'discount_amount', width: 20 },
      { header: 'Invoice Tax (INR)', key: 'tax_amount', width: 18 },
      { header: 'Invoice Total (INR)', key: 'total', width: 18 },
      { header: 'Amount Paid (INR)', key: 'amount_paid', width: 18 },
      { header: 'Balance Due (INR)', key: 'balance_due', width: 18 },
    ];

    const rows: Record<string, any>[] = [];
    for (const inv of invoices) {
      if (inv.items.length === 0) {
        // Invoice with no line items
        rows.push({
          invoice_number: inv.invoice_number,
          type: inv.type,
          status: inv.status,
          date: this.formatDate(inv.date),
          due_date: this.formatDate(inv.due_date),
          contact_name: inv.contact?.name || '',
          contact_gstin: inv.contact?.gstin || '',
          place_of_supply: inv.place_of_supply || '',
          item_description: '',
          hsn_code: '',
          quantity: '',
          unit: '',
          rate: '',
          discount_pct: '',
          taxable_amount: '',
          cgst_rate: '',
          cgst_amount: '',
          sgst_rate: '',
          sgst_amount: '',
          igst_rate: '',
          igst_amount: '',
          item_total: '',
          subtotal: this.formatAmount(inv.subtotal),
          discount_amount: this.formatAmount(inv.discount_amount),
          tax_amount: this.formatAmount(inv.tax_amount),
          total: this.formatAmount(inv.total),
          amount_paid: this.formatAmount(inv.amount_paid),
          balance_due: this.formatAmount(inv.balance_due),
        });
      } else {
        for (const item of inv.items) {
          rows.push({
            invoice_number: inv.invoice_number,
            type: inv.type,
            status: inv.status,
            date: this.formatDate(inv.date),
            due_date: this.formatDate(inv.due_date),
            contact_name: inv.contact?.name || '',
            contact_gstin: inv.contact?.gstin || '',
            place_of_supply: inv.place_of_supply || '',
            item_description: item.description,
            hsn_code: item.hsn_code || '',
            quantity: this.formatAmount(item.quantity),
            unit: item.unit,
            rate: this.formatAmount(item.rate),
            discount_pct: this.formatAmount(item.discount_pct),
            taxable_amount: this.formatAmount(item.taxable_amount),
            cgst_rate: this.formatAmount(item.cgst_rate),
            cgst_amount: this.formatAmount(item.cgst_amount),
            sgst_rate: this.formatAmount(item.sgst_rate),
            sgst_amount: this.formatAmount(item.sgst_amount),
            igst_rate: this.formatAmount(item.igst_rate),
            igst_amount: this.formatAmount(item.igst_amount),
            item_total: this.formatAmount(item.total),
            subtotal: this.formatAmount(inv.subtotal),
            discount_amount: this.formatAmount(inv.discount_amount),
            tax_amount: this.formatAmount(inv.tax_amount),
            total: this.formatAmount(inv.total),
            amount_paid: this.formatAmount(inv.amount_paid),
            balance_due: this.formatAmount(inv.balance_due),
          });
        }
      }
    }

    const workbook = await this.buildWorkbook('Invoices', columns, rows);
    return this.workbookToBuffer(workbook, format);
  }

  // ─── Export: Products ─────────────────────────────────────────

  async exportProducts(orgId: string, format: ExportFormat): Promise<Buffer> {
    this.logger.log(`Exporting products for org ${orgId} as ${format}`);

    const products = await this.prisma.product.findMany({
      where: { org_id: orgId },
      orderBy: { name: 'asc' },
    });

    const columns = [
      { header: 'SKU', key: 'sku', width: 16 },
      { header: 'Name', key: 'name', width: 28 },
      { header: 'Description', key: 'description', width: 35 },
      { header: 'Type', key: 'type', width: 12 },
      { header: 'HSN/SAC Code', key: 'hsn_code', width: 14 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Purchase Price (INR)', key: 'purchase_price', width: 20 },
      { header: 'Selling Price (INR)', key: 'selling_price', width: 18 },
      { header: 'Tax Rate %', key: 'tax_rate', width: 12 },
      { header: 'Track Inventory', key: 'track_inventory', width: 16 },
      { header: 'Reorder Level', key: 'reorder_level', width: 14 },
      { header: 'Active', key: 'is_active', width: 10 },
      { header: 'Created Date', key: 'created_at', width: 14 },
    ];

    const rows = products.map((p) => ({
      sku: p.sku || '',
      name: p.name,
      description: p.description || '',
      type: p.type,
      hsn_code: p.hsn_code || '',
      unit: p.unit,
      purchase_price: this.formatAmount(p.purchase_price),
      selling_price: this.formatAmount(p.selling_price),
      tax_rate: this.formatAmount(p.tax_rate),
      track_inventory: p.track_inventory ? 'Yes' : 'No',
      reorder_level: p.reorder_level ? this.formatAmount(p.reorder_level) : '',
      is_active: p.is_active ? 'Yes' : 'No',
      created_at: this.formatDate(p.created_at),
    }));

    const workbook = await this.buildWorkbook('Products', columns, rows);
    return this.workbookToBuffer(workbook, format);
  }

  // ─── Export: Journal Entries ───────────────────────────────────

  async exportJournalEntries(
    orgId: string,
    format: ExportFormat,
    dateRange?: { from?: string; to?: string },
  ): Promise<Buffer> {
    this.logger.log(`Exporting journal entries for org ${orgId} as ${format}`);

    const where: any = { org_id: orgId };
    if (dateRange?.from || dateRange?.to) {
      where.date = {};
      if (dateRange.from) where.date.gte = new Date(dateRange.from);
      if (dateRange.to) where.date.lte = new Date(dateRange.to);
    }

    const entries = await this.prisma.journalEntry.findMany({
      where,
      include: {
        lines: {
          include: {
            account: { select: { name: true, code: true, type: true } },
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    const columns = [
      { header: 'Entry Number', key: 'entry_number', width: 14 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Narration', key: 'narration', width: 35 },
      { header: 'Reference', key: 'reference', width: 20 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Account Code', key: 'account_code', width: 14 },
      { header: 'Account Name', key: 'account_name', width: 25 },
      { header: 'Account Type', key: 'account_type', width: 16 },
      { header: 'Debit (INR)', key: 'debit', width: 16 },
      { header: 'Credit (INR)', key: 'credit', width: 16 },
      { header: 'Line Description', key: 'line_description', width: 30 },
    ];

    const rows: Record<string, any>[] = [];
    for (const entry of entries) {
      for (const line of entry.lines) {
        rows.push({
          entry_number: entry.entry_number,
          date: this.formatDate(entry.date),
          narration: entry.narration || '',
          reference: entry.reference || '',
          status: entry.is_posted ? 'Posted' : 'Draft',
          account_code: line.account?.code || '',
          account_name: line.account?.name || '',
          account_type: line.account?.type || '',
          debit: this.formatAmount(line.debit),
          credit: this.formatAmount(line.credit),
          line_description: line.description || '',
        });
      }
    }

    const workbook = await this.buildWorkbook('Journal Entries', columns, rows);
    return this.workbookToBuffer(workbook, format);
  }

  // ─── Export: Chart of Accounts ────────────────────────────────

  async exportChartOfAccounts(orgId: string, format: ExportFormat): Promise<Buffer> {
    this.logger.log(`Exporting chart of accounts for org ${orgId} as ${format}`);

    const accounts = await this.prisma.account.findMany({
      where: { org_id: orgId },
      include: {
        parent: { select: { name: true, code: true } },
      },
      orderBy: [{ type: 'asc' }, { code: 'asc' }],
    });

    const columns = [
      { header: 'Account Code', key: 'code', width: 14 },
      { header: 'Account Name', key: 'name', width: 28 },
      { header: 'Type', key: 'type', width: 16 },
      { header: 'Sub-Type', key: 'sub_type', width: 18 },
      { header: 'Parent Account', key: 'parent_name', width: 22 },
      { header: 'Parent Code', key: 'parent_code', width: 14 },
      { header: 'Opening Balance (INR)', key: 'opening_balance', width: 22 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'System Account', key: 'is_system', width: 16 },
      { header: 'Active', key: 'is_active', width: 10 },
    ];

    const rows = accounts.map((a) => ({
      code: a.code || '',
      name: a.name,
      type: a.type,
      sub_type: a.sub_type || '',
      parent_name: a.parent?.name || '',
      parent_code: a.parent?.code || '',
      opening_balance: this.formatAmount(a.opening_balance),
      description: a.description || '',
      is_system: a.is_system ? 'Yes' : 'No',
      is_active: a.is_active ? 'Yes' : 'No',
    }));

    const workbook = await this.buildWorkbook('Chart of Accounts', columns, rows);
    return this.workbookToBuffer(workbook, format);
  }

  // ─── Export: Full Backup (ZIP) ────────────────────────────────

  async exportAll(orgId: string): Promise<Buffer> {
    this.logger.log(`Exporting full backup for org ${orgId}`);

    const [contactsBuf, invoicesBuf, productsBuf, journalBuf, coaBuf] = await Promise.all([
      this.exportContacts(orgId, 'xlsx'),
      this.exportInvoices(orgId, 'xlsx'),
      this.exportProducts(orgId, 'xlsx'),
      this.exportJournalEntries(orgId, 'xlsx'),
      this.exportChartOfAccounts(orgId, 'xlsx'),
    ]);

    return new Promise<Buffer>((resolve, reject) => {
      const passthrough = new PassThrough();
      const chunks: Buffer[] = [];

      passthrough.on('data', (chunk) => chunks.push(chunk));
      passthrough.on('end', () => resolve(Buffer.concat(chunks)));
      passthrough.on('error', reject);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', reject);
      archive.pipe(passthrough);

      const timestamp = new Date().toISOString().slice(0, 10);
      archive.append(contactsBuf, { name: `contacts_${timestamp}.xlsx` });
      archive.append(invoicesBuf, { name: `invoices_${timestamp}.xlsx` });
      archive.append(productsBuf, { name: `products_${timestamp}.xlsx` });
      archive.append(journalBuf, { name: `journal_entries_${timestamp}.xlsx` });
      archive.append(coaBuf, { name: `chart_of_accounts_${timestamp}.xlsx` });

      archive.finalize();
    });
  }
}
