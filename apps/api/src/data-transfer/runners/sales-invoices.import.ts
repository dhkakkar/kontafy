import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoicesService } from '../../bill/invoices/invoices.service';
import {
  parseSheetToRows,
  groupRows,
  runGroupedImport,
  ImportRunResult,
} from './import-runner';

/**
 * Sales-invoice import handler. Reads a multi-line invoice template,
 * groups rows by Invoice No, looks up the customer per-group, and
 * delegates each grouped invoice to InvoicesService.create() so the
 * GST split + journal entry + sub-ledger updates remain the same as
 * a manually-created invoice.
 *
 * Template columns (case-insensitive, snake-cased internally):
 *   invoice_no, invoice_date, customer_name, customer_gstin,
 *   place_of_supply, due_date, item_service, hsn_sac, qty, unit,
 *   rate, disc, gst, status, notes
 */
@Injectable()
export class SalesInvoicesImport {
  private readonly logger = new Logger(SalesInvoicesImport.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoicesService: InvoicesService,
  ) {}

  async run(
    orgId: string,
    userId: string,
    buffer: Buffer,
    format: string,
  ): Promise<ImportRunResult> {
    const rows = await parseSheetToRows(buffer, format, {
      allowedKeys: [
        'invoice_no',
        'invoice_date',
        'customer_name',
        'customer_gstin',
        'place_of_supply',
        'due_date',
        'item_service',
        'hsn_sac',
        'qty',
        'unit',
        'rate',
        'disc',
        'gst',
        'status',
        'notes',
      ],
    });

    if (rows.length === 0) {
      return { total: 0, imported: 0, skipped: 0, errors: [] };
    }

    // Pre-load all org contacts once so per-group lookups are O(1)
    // hash hits, not N round trips to the DB. GSTIN match wins, then
    // case-insensitive name match.
    const contacts = await this.prisma.contact.findMany({
      where: { org_id: orgId, is_active: true },
      select: { id: true, name: true, gstin: true },
    });
    const byGstin = new Map<string, string>();
    const byName = new Map<string, string>();
    for (const c of contacts) {
      if (c.gstin) byGstin.set(c.gstin.toUpperCase(), c.id);
      if (c.name) byName.set(c.name.trim().toLowerCase(), c.id);
    }

    const resolveContact = (name: string, gstin: string): string | null => {
      const g = (gstin || '').trim().toUpperCase();
      if (g && byGstin.has(g)) return byGstin.get(g)!;
      const n = (name || '').trim().toLowerCase();
      if (n && byName.has(n)) return byName.get(n)!;
      return null;
    };

    const groups = groupRows(rows, 'invoice_no');

    return runGroupedImport(groups, async (invoiceNo, lines) => {
      const header = lines[0];

      const contactId = resolveContact(
        header.customer_name,
        header.customer_gstin,
      );
      if (!contactId) {
        throw new Error(
          `Customer not found for invoice ${invoiceNo} ("${header.customer_name || header.customer_gstin}"). Add the contact first, then re-import.`,
        );
      }

      const invoiceDate = this.parseDate(header.invoice_date);
      if (!invoiceDate) {
        throw new Error(
          `Invoice ${invoiceNo}: invoice_date is missing or unparseable (got "${header.invoice_date}"). Use YYYY-MM-DD or DD/MM/YYYY.`,
        );
      }
      const dueDate = header.due_date ? this.parseDate(header.due_date) : null;

      // Build items. Each row in this group becomes one InvoiceItem.
      // Tax split (CGST+SGST vs IGST) is delegated to InvoicesService
      // which derives is_igst from place_of_supply vs the org's
      // GSTIN — exactly what the manual form does.
      const items = lines
        .map((row, idx) => {
          const qty = this.parseNumber(row.qty);
          const rate = this.parseNumber(row.rate);
          if (!qty || qty <= 0) {
            throw new Error(
              `Invoice ${invoiceNo} line ${idx + 1}: qty must be > 0`,
            );
          }
          if (rate < 0) {
            throw new Error(
              `Invoice ${invoiceNo} line ${idx + 1}: rate cannot be negative`,
            );
          }
          const gst = this.parseNumber(row.gst);
          return {
            description: (row.item_service || 'Item').slice(0, 255),
            hsn_code: row.hsn_sac ? row.hsn_sac.slice(0, 8) : undefined,
            quantity: qty,
            unit: row.unit || undefined,
            rate,
            discount_pct: this.parseNumber(row.disc) || 0,
            // We send full GST as CGST+SGST split. The service will
            // re-split as IGST if it detects an inter-state invoice.
            cgst_rate: gst / 2,
            sgst_rate: gst / 2,
          };
        });

      const pos = (header.place_of_supply || '').toUpperCase().slice(0, 2);

      const invoice = await this.invoicesService.create(orgId, userId, {
        type: 'sale',
        contact_id: contactId,
        date: invoiceDate.toISOString().slice(0, 10),
        due_date: dueDate ? dueDate.toISOString().slice(0, 10) : undefined,
        place_of_supply: pos || undefined,
        notes: header.notes || undefined,
        items,
      } as any);

      return {
        invoice_id: (invoice as any).id,
        invoice_number: (invoice as any).invoice_number,
        source_invoice_no: invoiceNo,
      };
    });
  }

  /**
   * Build the .xlsx template a user downloads. Two sheets:
   *   - "Invoices": header row + 3 sample rows showing a multi-line
   *     invoice (lines 1 & 2 share the same invoice_no), an
   *     inter-state invoice, and a single-line consumer invoice.
   *   - "Instructions": short writeup so the user doesn't have to
   *     come back to the docs.
   */
  static async buildTemplate(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Invoices');
    ws.columns = [
      { header: 'Invoice No', key: 'invoice_no', width: 14 },
      { header: 'Invoice Date', key: 'invoice_date', width: 12 },
      { header: 'Customer Name', key: 'customer_name', width: 26 },
      { header: 'Customer GSTIN', key: 'customer_gstin', width: 18 },
      { header: 'Place of Supply', key: 'place_of_supply', width: 14 },
      { header: 'Due Date', key: 'due_date', width: 12 },
      { header: 'Item/Service', key: 'item_service', width: 28 },
      { header: 'HSN/SAC', key: 'hsn_sac', width: 10 },
      { header: 'Qty', key: 'qty', width: 8 },
      { header: 'Unit', key: 'unit', width: 8 },
      { header: 'Rate', key: 'rate', width: 12 },
      { header: 'Disc %', key: 'disc', width: 8 },
      { header: 'GST %', key: 'gst', width: 8 },
      { header: 'Status', key: 'status', width: 10 },
      { header: 'Notes', key: 'notes', width: 28 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };

    // Sample 1: multi-line intra-state invoice (Punjab → Punjab)
    ws.addRow({
      invoice_no: 'IMP/001',
      invoice_date: '2025-04-05',
      customer_name: 'Punjab Industries Ltd',
      customer_gstin: '03AABCP1234A1Z5',
      place_of_supply: 'PB',
      due_date: '2025-05-05',
      item_service: 'Web Development',
      hsn_sac: '998314',
      qty: 1,
      unit: 'PRJ',
      rate: 50000,
      disc: 0,
      gst: 18,
      status: 'sent',
      notes: '',
    });
    ws.addRow({
      invoice_no: 'IMP/001',
      invoice_date: '',
      customer_name: '',
      customer_gstin: '',
      place_of_supply: '',
      due_date: '',
      item_service: 'AMC - 1st Year',
      hsn_sac: '998599',
      qty: 12,
      unit: 'MON',
      rate: 5000,
      disc: 0,
      gst: 18,
      status: '',
      notes: '',
    });

    // Sample 2: inter-state invoice (Punjab supplier → Maharashtra customer)
    ws.addRow({
      invoice_no: 'IMP/002',
      invoice_date: '2025-04-10',
      customer_name: 'Mumbai Solutions Pvt Ltd',
      customer_gstin: '27AAFCM4567B1ZQ',
      place_of_supply: 'MH',
      due_date: '2025-05-25',
      item_service: 'SEO Monthly Retainer',
      hsn_sac: '998361',
      qty: 1,
      unit: 'MON',
      rate: 35000,
      disc: 0,
      gst: 18,
      status: 'sent',
      notes: 'Inter-state — IGST',
    });

    // Sample 3: B2C single-line
    ws.addRow({
      invoice_no: 'IMP/003',
      invoice_date: '2025-04-12',
      customer_name: 'Local Boutique House',
      customer_gstin: '',
      place_of_supply: 'PB',
      due_date: '2025-04-27',
      item_service: 'Logo Design',
      hsn_sac: '998391',
      qty: 1,
      unit: 'PRJ',
      rate: 15000,
      disc: 0,
      gst: 18,
      status: 'sent',
      notes: '',
    });

    // Instructions sheet
    const help = wb.addWorksheet('Instructions');
    const instructions = [
      ['Sales Invoices Import — How to use'],
      [],
      ['1. One row = one line item.'],
      ['   Multiple rows with the same Invoice No are grouped into a single invoice.'],
      ['   On rows 2…n of the same invoice you only need to fill the line columns'],
      ['   (Item, HSN/SAC, Qty, Unit, Rate, Disc, GST). Leave the header columns blank.'],
      [],
      ['2. Customer Name OR Customer GSTIN must match an existing contact in your books.'],
      ['   The contact must be created first (Contacts → Add Contact, or via Contacts import).'],
      [],
      ['3. Dates can be YYYY-MM-DD or DD/MM/YYYY.'],
      [],
      ['4. Place of Supply is the 2-letter state code (PB, MH, DL, KA…).'],
      ['   CGST+SGST vs IGST is decided automatically by comparing it to your org GSTIN.'],
      [],
      ['5. GST % is the *combined* rate (5, 12, 18, 28). Do NOT pre-split into CGST/SGST.'],
      ['   The system splits it correctly based on inter-state / intra-state.'],
      [],
      ['6. Status: leave blank or use "sent". "draft" is also accepted.'],
      [],
      ['7. Invoice numbers in this column are matching keys for line grouping.'],
      ['   The actual invoice_number stored is auto-generated by your org settings'],
      ['   (e.g. TD/01/2025-26). The source value is logged in audit trail.'],
    ];
    instructions.forEach((row) => help.addRow(row));
    help.getColumn(1).width = 100;
    help.getRow(1).font = { bold: true, size: 12 };

    const out = await wb.xlsx.writeBuffer();
    return Buffer.from(out as ArrayBuffer);
  }

  private parseDate(s: string): Date | null {
    if (!s) return null;
    const trimmed = s.trim();
    // ISO YYYY-MM-DD
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      const d = new Date(
        Number(iso[1]),
        Number(iso[2]) - 1,
        Number(iso[3]),
      );
      return isNaN(d.getTime()) ? null : d;
    }
    // DD/MM/YYYY or DD-MM-YYYY
    const dmy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmy) {
      const d = new Date(
        Number(dmy[3]),
        Number(dmy[2]) - 1,
        Number(dmy[1]),
      );
      return isNaN(d.getTime()) ? null : d;
    }
    const fallback = new Date(trimmed);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  private parseNumber(s: string): number {
    if (s == null || s === '') return 0;
    const n = Number(String(s).replace(/[,\s]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
}
