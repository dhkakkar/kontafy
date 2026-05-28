import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { PurchasesService } from '../../bill/purchases/purchases.service';
import {
  parseSheetToRows,
  groupRows,
  runGroupedImport,
  ImportRunResult,
} from './import-runner';

/**
 * Purchase-bills (vendor-bills) import handler. Mirrors the sales
 * invoice handler — groups multi-line rows by Bill No, resolves the
 * vendor, and delegates each bill to PurchasesService.create() so the
 * GST split, A/P sub-ledger update, and journal posting stay
 * identical to a manually-entered bill.
 *
 * Template columns (snake_cased after normalisation):
 *   bill_no, bill_date, vendor_name, vendor_gstin, place_of_supply,
 *   due_date, vendor_invoice_number, item_expense, hsn_sac, qty,
 *   unit, rate, disc, gst, tds_section, tds_pct, notes
 *
 * TDS columns are accepted but not yet wired into the create call —
 * the backend's PurchaseDto doesn't take per-bill TDS yet; vendor-
 * master TDS config (Contact.metadata.tds) is the source of truth
 * for now. The columns ride along so the template matches what
 * accountants expect to see; we'll consume them once the bill-level
 * TDS path lands.
 */
@Injectable()
export class PurchaseBillsImport {
  private readonly logger = new Logger(PurchaseBillsImport.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly purchasesService: PurchasesService,
  ) {}

  async run(
    orgId: string,
    userId: string,
    buffer: Buffer,
    format: string,
  ): Promise<ImportRunResult> {
    const rows = await parseSheetToRows(buffer, format, {
      allowedKeys: [
        'bill_no',
        'bill_date',
        'vendor_name',
        'vendor_gstin',
        'place_of_supply',
        'due_date',
        'vendor_invoice_number',
        'item_expense',
        'hsn_sac',
        'qty',
        'unit',
        'rate',
        'disc',
        'gst',
        'tds_section',
        'tds_pct',
        'notes',
      ],
    });

    if (rows.length === 0) {
      return { total: 0, imported: 0, skipped: 0, errors: [] };
    }

    // Pre-load vendor + both-type contacts. Same lookup pattern as
    // the sales-invoice handler: GSTIN preferred, name as fallback.
    const contacts = await this.prisma.contact.findMany({
      where: {
        org_id: orgId,
        is_active: true,
        type: { in: ['vendor', 'both'] },
      },
      select: { id: true, name: true, gstin: true },
    });
    const byGstin = new Map<string, string>();
    const byName = new Map<string, string>();
    for (const c of contacts) {
      if (c.gstin) byGstin.set(c.gstin.toUpperCase(), c.id);
      if (c.name) byName.set(c.name.trim().toLowerCase(), c.id);
    }

    const resolveVendor = (name: string, gstin: string): string | null => {
      const g = (gstin || '').trim().toUpperCase();
      if (g && byGstin.has(g)) return byGstin.get(g)!;
      const n = (name || '').trim().toLowerCase();
      if (n && byName.has(n)) return byName.get(n)!;
      return null;
    };

    // Read the org's supplier state once. Inter-state detection
    // mirrors the sales-side logic — POS != supplier state ⇒ IGST.
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { gstin: true },
    });
    const supplierStateCode = org?.gstin?.slice(0, 2) || '';
    const STATE_CODES: Record<string, string> = {
      JK: '01', HP: '02', PB: '03', CH: '04', UK: '05', HR: '06',
      DL: '07', RJ: '08', UP: '09', BR: '10', SK: '11', AR: '12',
      NL: '13', MN: '14', MZ: '15', TR: '16', ML: '17', AS: '18',
      WB: '19', JH: '20', OD: '21', CT: '22', MP: '23', GJ: '24',
      DN: '26', MH: '27', AP: '37', KA: '29', GA: '30', LA: '38',
      KL: '32', TN: '33', PY: '34', AN: '35', TG: '36',
    };

    const groups = groupRows(rows, 'bill_no');

    return runGroupedImport(groups, async (billNo, lines) => {
      const header = lines[0];

      const contactId = resolveVendor(
        header.vendor_name,
        header.vendor_gstin,
      );
      if (!contactId) {
        throw new Error(
          `Vendor not found for bill ${billNo} ("${header.vendor_name || header.vendor_gstin}"). Add the vendor first, then re-import.`,
        );
      }

      const billDate = this.parseDate(header.bill_date);
      if (!billDate) {
        throw new Error(
          `Bill ${billNo}: bill_date is missing or unparseable (got "${header.bill_date}"). Use YYYY-MM-DD or DD/MM/YYYY.`,
        );
      }
      const dueDate = header.due_date ? this.parseDate(header.due_date) : null;

      const pos = (header.place_of_supply || '').toUpperCase().slice(0, 2);
      // PurchaseDto requires the caller to declare is_igst — without
      // it the service falls through to intra-state (CGST+SGST).
      const posCode = pos ? STATE_CODES[pos] : '';
      const isIgst = !!supplierStateCode && !!posCode && posCode !== supplierStateCode;

      const items = lines.map((row, idx) => {
        const qty = this.parseNumber(row.qty);
        const rate = this.parseNumber(row.rate);
        if (!qty || qty <= 0) {
          throw new Error(
            `Bill ${billNo} line ${idx + 1}: qty must be > 0`,
          );
        }
        if (rate < 0) {
          throw new Error(
            `Bill ${billNo} line ${idx + 1}: rate cannot be negative`,
          );
        }
        const gst = this.parseNumber(row.gst);
        return {
          description: (row.item_expense || 'Item').slice(0, 255),
          hsn_code: row.hsn_sac ? row.hsn_sac.slice(0, 8) : undefined,
          quantity: qty,
          unit: row.unit || undefined,
          rate,
          discount_pct: this.parseNumber(row.disc) || 0,
          // Send rates on the right side of the split; backend will
          // re-validate against is_igst.
          cgst_rate: isIgst ? 0 : gst / 2,
          sgst_rate: isIgst ? 0 : gst / 2,
          igst_rate: isIgst ? gst : 0,
        };
      });

      const bill = await this.purchasesService.create(orgId, userId, {
        contact_id: contactId,
        date: billDate.toISOString().slice(0, 10),
        due_date: dueDate ? dueDate.toISOString().slice(0, 10) : undefined,
        place_of_supply: pos || undefined,
        is_igst: isIgst,
        vendor_invoice_number: header.vendor_invoice_number || undefined,
        notes: header.notes || undefined,
        items,
      } as any);

      return {
        bill_id: (bill as any).id,
        bill_number: (bill as any).invoice_number,
        source_bill_no: billNo,
      };
    });
  }

  /**
   * Build the .xlsx template. Sheet 1 has the column layout + sample
   * rows; sheet 2 has usage notes covering the TDS-from-vendor-master
   * caveat.
   */
  static async buildTemplate(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Purchase Bills');
    ws.columns = [
      { header: 'Bill No', key: 'bill_no', width: 14 },
      { header: 'Bill Date', key: 'bill_date', width: 12 },
      { header: 'Vendor Name', key: 'vendor_name', width: 26 },
      { header: 'Vendor GSTIN', key: 'vendor_gstin', width: 18 },
      { header: 'Place of Supply', key: 'place_of_supply', width: 14 },
      { header: 'Due Date', key: 'due_date', width: 12 },
      { header: 'Vendor Invoice No', key: 'vendor_invoice_number', width: 18 },
      { header: 'Item/Expense', key: 'item_expense', width: 28 },
      { header: 'HSN/SAC', key: 'hsn_sac', width: 10 },
      { header: 'Qty', key: 'qty', width: 8 },
      { header: 'Unit', key: 'unit', width: 8 },
      { header: 'Rate', key: 'rate', width: 12 },
      { header: 'Disc %', key: 'disc', width: 8 },
      { header: 'GST %', key: 'gst', width: 8 },
      { header: 'TDS Section', key: 'tds_section', width: 12 },
      { header: 'TDS %', key: 'tds_pct', width: 8 },
      { header: 'Notes', key: 'notes', width: 28 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };

    // Sample 1: multi-line intra-state bill (Punjab vendor)
    ws.addRow({
      bill_no: 'IMP/B/001',
      bill_date: '2025-04-08',
      vendor_name: 'Patiala Print Works',
      vendor_gstin: '03ABCDP1234A1Z9',
      place_of_supply: 'PB',
      due_date: '2025-05-08',
      vendor_invoice_number: 'PPW-2025-117',
      item_expense: 'Letterhead Printing',
      hsn_sac: '4901',
      qty: 1000,
      unit: 'NOS',
      rate: 12,
      disc: 0,
      gst: 12,
      tds_section: '',
      tds_pct: '',
      notes: '',
    });
    ws.addRow({
      bill_no: 'IMP/B/001',
      bill_date: '',
      vendor_name: '',
      vendor_gstin: '',
      place_of_supply: '',
      due_date: '',
      vendor_invoice_number: '',
      item_expense: 'Visiting Cards',
      hsn_sac: '4901',
      qty: 500,
      unit: 'NOS',
      rate: 4,
      disc: 0,
      gst: 12,
      tds_section: '',
      tds_pct: '',
      notes: '',
    });

    // Sample 2: inter-state professional services with TDS hint
    ws.addRow({
      bill_no: 'IMP/B/002',
      bill_date: '2025-04-12',
      vendor_name: 'Bangalore Consultants LLP',
      vendor_gstin: '29AAAFC1234A1Z9',
      place_of_supply: 'KA',
      due_date: '2025-05-12',
      vendor_invoice_number: 'BCL/PRO/0033',
      item_expense: 'Tax Audit Services',
      hsn_sac: '998222',
      qty: 1,
      unit: 'PRJ',
      rate: 75000,
      disc: 0,
      gst: 18,
      tds_section: '194J',
      tds_pct: 10,
      notes: 'Inter-state — IGST',
    });

    // Sample 3: single-line small expense
    ws.addRow({
      bill_no: 'IMP/B/003',
      bill_date: '2025-04-15',
      vendor_name: 'Local Stationers',
      vendor_gstin: '',
      place_of_supply: 'PB',
      due_date: '2025-04-30',
      vendor_invoice_number: 'INV-0419',
      item_expense: 'Office Stationery',
      hsn_sac: '4820',
      qty: 1,
      unit: 'LS',
      rate: 2400,
      disc: 0,
      gst: 12,
      tds_section: '',
      tds_pct: '',
      notes: '',
    });

    const help = wb.addWorksheet('Instructions');
    const lines = [
      ['Purchase Bills Import — How to use'],
      [],
      ['1. One row = one bill line. Multiple rows with the same Bill No are'],
      ['   grouped into a single bill. On rows 2…n you only need to fill the'],
      ['   line columns (Item, HSN/SAC, Qty, Unit, Rate, Disc, GST).'],
      [],
      ['2. Vendor Name OR Vendor GSTIN must match an existing contact of'],
      ['   type Vendor or Both. Create the vendor first if it does not exist.'],
      [],
      ['3. Dates accept YYYY-MM-DD or DD/MM/YYYY.'],
      [],
      ['4. Place of Supply is the 2-letter state code (PB, KA, MH, …).'],
      ['   Inter-state vs intra-state is decided automatically based on'],
      ['   your org GSTIN — IGST on inter-state, CGST+SGST on intra-state.'],
      [],
      ['5. GST % is the *combined* rate (5, 12, 18, 28). Do NOT pre-split'],
      ['   into CGST/SGST — the system splits it correctly.'],
      [],
      ['6. TDS Section and TDS % columns are accepted but are currently'],
      ['   informational only — TDS deduction is driven by the vendor master'],
      ['   (Contacts → Vendor → TDS Configuration). Bill-level TDS override'],
      ['   will read these columns once that path lands.'],
      [],
      ['7. Vendor Invoice No is the supplier-side number printed on their'],
      ['   invoice — gets stored as a reference but the bill number stored'],
      ['   in Kontafy is auto-generated per your settings.'],
    ];
    lines.forEach((row) => help.addRow(row));
    help.getColumn(1).width = 100;
    help.getRow(1).font = { bold: true, size: 12 };

    const out = await wb.xlsx.writeBuffer();
    return Buffer.from(out as ArrayBuffer);
  }

  private parseDate(s: string): Date | null {
    if (!s) return null;
    const t = s.trim();
    const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
      return isNaN(d.getTime()) ? null : d;
    }
    const dmy = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmy) {
      const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
      return isNaN(d.getTime()) ? null : d;
    }
    const fallback = new Date(t);
    return isNaN(fallback.getTime()) ? null : fallback;
  }

  private parseNumber(s: string): number {
    if (s == null || s === '') return 0;
    const n = Number(String(s).replace(/[,\s]/g, ''));
    return Number.isFinite(n) ? n : 0;
  }
}
