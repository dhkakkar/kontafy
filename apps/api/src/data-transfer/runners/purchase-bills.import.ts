import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { PurchasesService } from '../../bill/purchases/purchases.service';
import { computeLineItemGst } from '../../common/utils/gst.util';
import { formatFyShort, getFyBounds } from '../../common/utils/fy.util';
import {
  parseSheetToRows,
  groupRows,
  ImportRunResult,
  ImportRowError,
} from './import-runner';

/**
 * Purchase-bills (vendor-bills) import handler.
 *
 * Previously this called PurchasesService.create() once per group. On
 * a remote Neon DB that's 6–8 round-trips × ~150 ms each ≈ 2 s per
 * bill — 65 bills ran for ~130 s and Cloudflare cut the connection
 * at its 100 s upstream timeout, leaving the user staring at a
 * "Failed to fetch" error even though bills had partially landed.
 *
 * The handler now runs in two passes:
 *
 *   Pass 1 — in-memory: per-group validation, contact lookup,
 *            duplicate detection (against the DB and within the
 *            file), GST split, line totals. Build full InvoiceCreate
 *            + InvoiceItemCreate rows. Generate UUIDs in JS so we
 *            don't need a round-trip to get them back from Postgres.
 *
 *   Pass 2 — DB: a single `$transaction` with two `createMany`
 *            calls — bulk-insert invoices, then bulk-insert items.
 *            Total DB round-trips drop from O(N×8) to O(distinct FYs + 2),
 *            so 65 bills finish in seconds rather than minutes.
 *
 * Journal posting is deliberately skipped at import time: every row
 * lands as `draft`, and `JournalPostingService.postInvoice` is a no-op
 * for drafts anyway. Users approve bills individually (or in bulk
 * later) to push to the ledger.
 *
 * Idempotency: `(contact_id, vendor_invoice_number)` is the natural
 * dedupe key. A re-run of the same file is safe — already-imported
 * bills are skipped with an explanatory entry in the error list.
 *
 * Template columns (snake_cased after header normalisation):
 *   bill_no, bill_date, vendor_name, vendor_gstin, place_of_supply,
 *   due_date, vendor_invoice_number, item_expense, hsn_sac, qty,
 *   unit, rate, disc, gst, tds_section, tds_pct, notes
 *
 * TDS columns are accepted but informational only — vendor-master
 * TDS config is the source of truth until bill-level overrides land.
 */
@Injectable()
export class PurchaseBillsImport {
  private readonly logger = new Logger(PurchaseBillsImport.name);

  constructor(
    private readonly prisma: PrismaService,
    // Kept for DI compatibility; the handler no longer routes per-bill
    // creation through PurchasesService.create() since that's exactly
    // the slow path we're moving away from. The service stays the
    // canonical entry point for the manual form.
    private readonly purchasesService: PurchasesService,
  ) {}

  // 2-letter state code → numeric GST state code. Required because
  // Indian GSTINs encode state as the first two digits, but our
  // place_of_supply field stores the alpha code (PB, KA, etc).
  private static readonly STATE_CODES: Record<string, string> = {
    JK: '01', HP: '02', PB: '03', CH: '04', UK: '05', HR: '06',
    DL: '07', RJ: '08', UP: '09', BR: '10', SK: '11', AR: '12',
    NL: '13', MN: '14', MZ: '15', TR: '16', ML: '17', AS: '18',
    WB: '19', JH: '20', OD: '21', CT: '22', MP: '23', GJ: '24',
    DN: '26', MH: '27', AP: '37', KA: '29', GA: '30', LA: '38',
    KL: '32', TN: '33', PY: '34', AN: '35', TG: '36',
  };

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
      return { total: 0, imported: 0, skipped: 0, errors: [], created: [] };
    }

    // ── Pre-load lookup data in three parallel queries ────────────
    const [contacts, org, existing] = await Promise.all([
      this.prisma.contact.findMany({
        where: {
          org_id: orgId,
          is_active: true,
          type: { in: ['vendor', 'both'] },
        },
        select: { id: true, name: true, gstin: true },
      }),
      this.prisma.organization.findUnique({
        where: { id: orgId },
        select: { gstin: true },
      }),
      // For idempotency: every existing purchase bill with a vendor
      // invoice number stored. Re-running the same import won't
      // create duplicates — the (contact_id, vendor_invoice_number)
      // pair is the natural key.
      this.prisma.invoice.findMany({
        where: {
          org_id: orgId,
          type: 'purchase',
          e_invoice_irn: { not: null },
        },
        select: { contact_id: true, e_invoice_irn: true },
      }),
    ]);

    const byGstin = new Map<string, string>();
    const byName = new Map<string, string>();
    for (const c of contacts) {
      if (c.gstin) byGstin.set(c.gstin.toUpperCase(), c.id);
      if (c.name) byName.set(c.name.trim().toLowerCase(), c.id);
    }

    const supplierStateCode = org?.gstin?.slice(0, 2) || '';

    const dedupeKey = (contactId: string, vendorNo: string) =>
      `${contactId}||${vendorNo.toLowerCase()}`;
    const existingKeys = new Set<string>();
    for (const e of existing) {
      if (e.contact_id && e.e_invoice_irn) {
        existingKeys.add(dedupeKey(e.contact_id, e.e_invoice_irn));
      }
    }

    const groups = groupRows(rows, 'bill_no');

    // ── Pass 1: validate + build records in memory ────────────────
    type StagedBill = {
      invoiceId: string;
      data: any;
      items: any[];
      fyShort: string;
      billDate: Date;
    };
    const staged: StagedBill[] = [];
    const errors: ImportRowError[] = [];
    let skipped = 0;
    // Tracks (contact, vendor_invoice_no) seen earlier in *this* file
    // so the same row appearing twice doesn't get inserted twice. The
    // DB-side check handles cross-import idempotency; this handles
    // within-import.
    const seenInBatch = new Set<string>();

    for (const [billNo, lines] of groups.entries()) {
      try {
        const header = lines[0];

        const contactId = this.resolveVendor(
          header.vendor_name,
          header.vendor_gstin,
          byGstin,
          byName,
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

        const vendorInvoiceNo = (header.vendor_invoice_number || '').trim();

        // Idempotency — skip with a friendly error message instead
        // of failing the whole batch.
        if (vendorInvoiceNo) {
          const key = dedupeKey(contactId, vendorInvoiceNo);
          if (existingKeys.has(key)) {
            skipped += 1;
            errors.push({
              group: billNo,
              message: `Already imported earlier (vendor invoice "${vendorInvoiceNo}" for this vendor exists). Skipped.`,
            });
            continue;
          }
          if (seenInBatch.has(key)) {
            skipped += 1;
            errors.push({
              group: billNo,
              message: `Duplicate within this import file (vendor invoice "${vendorInvoiceNo}" appears for the same vendor twice). Skipped.`,
            });
            continue;
          }
          seenInBatch.add(key);
        }

        const pos = (header.place_of_supply || '').toUpperCase().slice(0, 2);
        const posCode = pos ? PurchaseBillsImport.STATE_CODES[pos] : '';
        const isIgst =
          !!supplierStateCode && !!posCode && posCode !== supplierStateCode;

        // Compute line items + roll up invoice-level totals so the
        // bulk insert has fully-resolved rows.
        let subtotal = 0;
        let totalDiscount = 0;
        let totalTax = 0;

        const invoiceId = randomUUID();
        const items = lines.map((row, idx) => {
          const qty = this.parseNumber(row.qty);
          const rate = this.parseNumber(row.rate);
          if (!qty || qty <= 0) {
            throw new Error(`Bill ${billNo} line ${idx + 1}: qty must be > 0`);
          }
          if (rate < 0) {
            throw new Error(
              `Bill ${billNo} line ${idx + 1}: rate cannot be negative`,
            );
          }
          const gst = this.parseNumber(row.gst);
          const discPct = this.parseNumber(row.disc) || 0;
          const computed = computeLineItemGst(qty, rate, discPct, gst, 0, isIgst);

          subtotal += computed.subtotal;
          totalDiscount += computed.discountAmount;
          totalTax += computed.totalTax;

          return {
            id: randomUUID(),
            invoice_id: invoiceId,
            description: (row.item_expense || 'Item').slice(0, 255),
            hsn_code: row.hsn_sac ? row.hsn_sac.slice(0, 8) : null,
            quantity: qty,
            unit: row.unit || 'pcs',
            rate,
            discount_pct: discPct,
            taxable_amount: computed.taxableAmount,
            cgst_rate: computed.cgstRate,
            cgst_amount: computed.cgstAmount,
            sgst_rate: computed.sgstRate,
            sgst_amount: computed.sgstAmount,
            igst_rate: computed.igstRate,
            igst_amount: computed.igstAmount,
            cess_rate: computed.cessRate,
            cess_amount: computed.cessAmount,
            total: computed.totalWithTax,
          };
        });

        const grandTotal =
          Math.round((subtotal - totalDiscount + totalTax) * 100) / 100;

        staged.push({
          invoiceId,
          data: {
            id: invoiceId,
            org_id: orgId,
            invoice_number: '', // assigned after FY counts are known
            type: 'purchase',
            status: 'draft',
            contact_id: contactId,
            date: billDate,
            due_date: dueDate,
            place_of_supply: pos || null,
            is_igst: isIgst,
            subtotal,
            discount_amount: totalDiscount,
            tax_amount: totalTax,
            total: grandTotal,
            amount_paid: 0,
            balance_due: grandTotal,
            notes: header.notes || null,
            // Supplier-side invoice number lives on the e_invoice_irn
            // column (legacy reuse — Invoice has no dedicated field).
            e_invoice_irn: vendorInvoiceNo || null,
            created_by: userId,
          },
          items,
          fyShort: formatFyShort(billDate),
          billDate,
        });
      } catch (err) {
        skipped += 1;
        errors.push({
          group: billNo,
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    if (staged.length === 0) {
      return {
        total: groups.size,
        imported: 0,
        skipped,
        errors,
        created: [],
      };
    }

    // ── FY sequence pre-fetch ─────────────────────────────────────
    // One count() query per distinct FY in the batch — usually 1–2.
    // Each new bill in the FY increments the counter in memory so
    // we don't hit the DB again. Sequence stays gap-free as long as
    // nothing else writes a purchase bill concurrently (acceptable
    // for an import: it's an admin action, not user traffic).
    const fyBuckets = new Map<string, Date>();
    for (const s of staged) {
      if (!fyBuckets.has(s.fyShort)) fyBuckets.set(s.fyShort, s.billDate);
    }
    const fyCounts = new Map<string, number>();
    await Promise.all(
      Array.from(fyBuckets.entries()).map(async ([fy, sampleDate]) => {
        const { fyStartDate, fyEndDate } = getFyBounds(sampleDate);
        const count = await this.prisma.invoice.count({
          where: {
            org_id: orgId,
            type: 'purchase',
            date: { gte: fyStartDate, lte: fyEndDate },
          },
        });
        fyCounts.set(fy, count);
      }),
    );

    // Sort by bill date so the lowest dates get the lowest sequence
    // numbers within an FY — matches what a clerk would do if they
    // entered the bills manually in chronological order.
    staged.sort((a, b) => a.billDate.getTime() - b.billDate.getTime());
    for (const s of staged) {
      const next = (fyCounts.get(s.fyShort) || 0) + 1;
      fyCounts.set(s.fyShort, next);
      s.data.invoice_number = `BILL/${s.fyShort}/${String(next).padStart(4, '0')}`;
    }

    // ── Pass 2: bulk insert in one transaction ────────────────────
    // Two createMany calls. The transaction guarantees we don't end
    // up with orphan invoices if items fail (or orphan items if
    // invoices fail). On Neon/PgBouncer the array form of
    // $transaction is the fast path — no transaction-mode session
    // hold between queries.
    await this.prisma.$transaction([
      this.prisma.invoice.createMany({ data: staged.map((s) => s.data) }),
      this.prisma.invoiceItem.createMany({ data: staged.flatMap((s) => s.items) }),
    ]);

    return {
      total: groups.size,
      imported: staged.length,
      skipped,
      errors,
      created: staged.map((s) => ({
        bill_id: s.invoiceId,
        bill_number: s.data.invoice_number,
      })),
    };
  }

  private resolveVendor(
    name: string,
    gstin: string,
    byGstin: Map<string, string>,
    byName: Map<string, string>,
  ): string | null {
    const g = (gstin || '').trim().toUpperCase();
    if (g && byGstin.has(g)) return byGstin.get(g)!;
    const n = (name || '').trim().toLowerCase();
    if (n && byName.has(n)) return byName.get(n)!;
    return null;
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

    // Sample 3: single-line small expense (B2C vendor, no GSTIN)
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
      ['   invoice — also acts as the import idempotency key. Re-running'],
      ['   the same file will skip rows that were imported before for the'],
      ['   same (vendor, vendor invoice no) pair, so no duplicates.'],
      [],
      ['8. All imported bills land as Draft. Approve them individually'],
      ['   (or in bulk from the Bills list) to post the journal entries'],
      ['   and update the trial balance.'],
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
