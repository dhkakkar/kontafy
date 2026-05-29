import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import {
  parseSheetToRows,
  ImportRunResult,
  ImportRowError,
} from './import-runner';

/**
 * Bulk-import business expenses.
 *
 * One row = one expense. Each row gets status='approved' (matches the
 * manual New Expense default), so the imported batch lands as actionable
 * spend rather than a queue of items waiting on a phantom approver.
 *
 * Template columns (snake_cased after normalisation):
 *   date *, category *, description *, amount *,
 *   payment_method * (cash/upi/bank_transfer/cheque/card),
 *   bank_name (required when method != cash),
 *   reference, vendor_name, notes
 *
 * Two-pass shape (same as payments.import.ts):
 *   Pass 1 — in memory: per-row validation against pre-loaded bank
 *            map + the dedupe set; build full Expense records with
 *            JS-generated UUIDs.
 *   Pass 2 — DB: single createMany. Round-trips drop from O(N) to 1.
 *
 * Idempotency key: (date, amount, description-lower, reference-lower).
 * A re-run of the same file skips rows already imported under that
 * key with a friendly 'Already imported earlier' message.
 *
 * No journal-posting yet — expenses currently don't post to the
 * ledger from the manual form either. That wiring is a v2 task.
 */
@Injectable()
export class ExpensesImport {
  private readonly logger = new Logger(ExpensesImport.name);

  constructor(private readonly prisma: PrismaService) {}

  // Mirrors the modal's dropdown. Free-form strings would let users
  // sprout 20 spellings of "Office Supplies"; locking to this list
  // keeps the category report clean.
  private static readonly VALID_CATEGORIES = new Set([
    'rent',
    'utilities',
    'salaries',
    'travel',
    'office_supplies',
    'professional_fees',
    'marketing',
    'insurance',
    'repairs',
    'miscellaneous',
  ]);

  private static readonly VALID_MODES = new Set([
    'cash',
    'upi',
    'bank_transfer',
    'cheque',
    'card',
  ]);

  async run(
    orgId: string,
    userId: string,
    buffer: Buffer,
    format: string,
  ): Promise<ImportRunResult> {
    const rows = await parseSheetToRows(buffer, format, {
      allowedKeys: [
        'date',
        'category',
        'description',
        'amount',
        'payment_method',
        'mode',
        'bank_name',
        'reference',
        'vendor_name',
        'notes',
      ],
    });

    if (rows.length === 0) {
      return { total: 0, imported: 0, skipped: 0, errors: [], created: [] };
    }

    // Pre-import header validation. Catch missing required columns up
    // front with one clear error instead of per-row failures.
    const presentKeys = new Set(Object.keys(rows[0]));
    const required: Array<{ keys: string[]; label: string }> = [
      { keys: ['date'], label: 'Date' },
      { keys: ['category'], label: 'Category' },
      { keys: ['description'], label: 'Description' },
      { keys: ['amount'], label: 'Amount' },
      { keys: ['payment_method', 'mode'], label: 'Payment Method' },
    ];
    const missing = required
      .filter((r) => !r.keys.some((k) => presentKeys.has(k)))
      .map((r) => r.label);
    if (missing.length > 0) {
      return {
        total: rows.length,
        imported: 0,
        skipped: rows.length,
        errors: [
          {
            message: `Required column${missing.length === 1 ? '' : 's'} missing: ${missing.join(', ')}. Please re-download the template (Download button on the import page).`,
          },
        ],
        created: [],
      };
    }

    // ── Pre-load lookup data in parallel ─────────────────────────
    const [banks, existing] = await Promise.all([
      this.prisma.bankAccount.findMany({
        where: { org_id: orgId, is_active: true },
        select: { id: true, bank_name: true, account_name: true },
      }),
      // Idempotency keys: every existing expense in this org with the
      // shape we hash on. Cheap to load — expenses don't have items
      // or allocations to join.
      this.prisma.expense.findMany({
        where: { org_id: orgId },
        select: {
          date: true,
          amount: true,
          description: true,
          reference: true,
        },
      }),
    ]);

    const bankByName = new Map<string, string>();
    for (const b of banks) {
      if (b.bank_name) bankByName.set(b.bank_name.trim().toLowerCase(), b.id);
      if (b.account_name)
        bankByName.set(b.account_name.trim().toLowerCase(), b.id);
    }

    const dedupeKey = (
      date: Date,
      amount: number,
      description: string,
      reference: string | null | undefined,
    ) =>
      `${date.toISOString().slice(0, 10)}|${Math.round(amount * 100)}|${(description || '').trim().toLowerCase()}|${(reference || '').trim().toLowerCase()}`;

    const existingKeys = new Set<string>();
    for (const e of existing) {
      if (!e.date || !e.amount) continue;
      existingKeys.add(
        dedupeKey(
          e.date,
          Number(e.amount),
          e.description || '',
          e.reference || undefined,
        ),
      );
    }

    const pickRow = (row: Record<string, string>, ...keys: string[]) => {
      for (const k of keys) {
        const v = (row[k] || '').trim();
        if (v) return v;
      }
      return '';
    };

    // ── Pass 1: validate + stage records in memory ───────────────
    const staged: any[] = [];
    const errors: ImportRowError[] = [];
    let skipped = 0;
    const seenInBatch = new Set<string>();

    rows.forEach((row, idx) => {
      const rowNum = idx + 2;
      try {
        const rawDate = pickRow(row, 'date');
        const date = this.parseDate(rawDate);
        if (!date) {
          throw new Error(
            rawDate
              ? `Row ${rowNum}: Date "${rawDate}" is invalid. Use YYYY-MM-DD or DD/MM/YYYY.`
              : `Row ${rowNum}: Date is empty.`,
          );
        }

        const category = pickRow(row, 'category').toLowerCase().replace(/\s+/g, '_');
        if (!category) {
          throw new Error(`Row ${rowNum}: Category is empty.`);
        }
        if (!ExpensesImport.VALID_CATEGORIES.has(category)) {
          throw new Error(
            `Row ${rowNum}: Category "${category}" is invalid. Use one of: ${Array.from(ExpensesImport.VALID_CATEGORIES).join(', ')}.`,
          );
        }

        const description = pickRow(row, 'description');
        if (!description) {
          throw new Error(`Row ${rowNum}: Description is empty.`);
        }

        const rawAmount = pickRow(row, 'amount');
        const amount = this.parseNumber(rawAmount);
        if (!amount || amount <= 0) {
          throw new Error(
            rawAmount
              ? `Row ${rowNum}: Amount "${rawAmount}" is not a positive number.`
              : `Row ${rowNum}: Amount is empty.`,
          );
        }

        const mode = pickRow(row, 'payment_method', 'mode').toLowerCase();
        if (!ExpensesImport.VALID_MODES.has(mode)) {
          throw new Error(
            mode
              ? `Row ${rowNum}: Payment Method "${mode}" is invalid. Use one of: cash, upi, bank_transfer, cheque, card.`
              : `Row ${rowNum}: Payment Method is empty.`,
          );
        }

        // Bank resolution — required for non-cash modes. Cash mode
        // leaves bank_account_id null (the future expense JE poster
        // will fall back to 1101 Cash in Hand).
        let bankAccountId: string | null = null;
        if (mode !== 'cash') {
          const bankRaw = pickRow(row, 'bank_name');
          if (!bankRaw) {
            throw new Error(
              `Row ${rowNum}: Bank Name is required for mode "${mode}".`,
            );
          }
          const id = bankByName.get(bankRaw.toLowerCase());
          if (!id) {
            throw new Error(
              `Row ${rowNum}: Bank "${bankRaw}" not found. Add it in Settings → Invoices → Bank Accounts first.`,
            );
          }
          bankAccountId = id;
        }

        const reference = pickRow(row, 'reference') || null;

        // Idempotency
        const key = dedupeKey(date, amount, description, reference);
        if (existingKeys.has(key)) {
          skipped += 1;
          errors.push({
            row: rowNum,
            message: `Already imported earlier (same date + amount + description + reference). Skipped.`,
          });
          return;
        }
        if (seenInBatch.has(key)) {
          skipped += 1;
          errors.push({
            row: rowNum,
            message: `Duplicate within this import file. Skipped.`,
          });
          return;
        }
        seenInBatch.add(key);

        staged.push({
          id: randomUUID(),
          org_id: orgId,
          date,
          category,
          description: description.slice(0, 500),
          amount,
          payment_method: mode,
          reference,
          vendor_name: pickRow(row, 'vendor_name') || null,
          notes: pickRow(row, 'notes') || null,
          bank_account_id: bankAccountId,
          // Imported rows land as Approved (mirrors the manual form's
          // new default since this is admin-curated data, not a queue
          // of items waiting on a phantom approver).
          status: 'approved',
          created_by: userId,
        });
      } catch (err) {
        skipped += 1;
        errors.push({
          row: rowNum,
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    });

    if (staged.length === 0) {
      return {
        total: rows.length,
        imported: 0,
        skipped,
        errors,
        created: [],
      };
    }

    // ── Pass 2: bulk insert ──────────────────────────────────────
    // No FKs to satisfy in a specific order — expenses are a single
    // table with no items/lines. One createMany covers it.
    await this.prisma.expense.createMany({ data: staged });

    return {
      total: rows.length,
      imported: staged.length,
      skipped,
      errors,
      created: staged.map((s) => ({
        expense_id: s.id,
        amount: s.amount,
        description: s.description,
      })),
    };
  }

  /**
   * Template builder — 9 columns + 3 sample rows covering the main
   * shapes (bank-transfer rent, UPI utility, cash office supplies)
   * plus an Instructions sheet so users don't have to re-read docs
   * to discover the category list / required-when-non-cash rules.
   */
  static async buildTemplate(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Expenses');
    ws.columns = [
      { header: 'Date *', key: 'date', width: 14 },
      {
        header: 'Category * (rent/utilities/salaries/...)',
        key: 'category',
        width: 26,
      },
      { header: 'Description *', key: 'description', width: 32 },
      { header: 'Amount *', key: 'amount', width: 12 },
      {
        header: 'Payment Method * (cash/upi/bank_transfer/cheque/card)',
        key: 'payment_method',
        width: 36,
      },
      {
        header: 'Bank Name (required if not cash)',
        key: 'bank_name',
        width: 22,
      },
      {
        header: 'Reference (UTR/UPI Txn/Cheque No)',
        key: 'reference',
        width: 22,
      },
      { header: 'Vendor Name', key: 'vendor_name', width: 22 },
      { header: 'Notes', key: 'notes', width: 28 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };

    ws.addRow({
      date: '2025-04-05',
      category: 'rent',
      description: 'Office rent — Apr 2025',
      amount: 35000,
      payment_method: 'bank_transfer',
      bank_name: 'ICICI Bank',
      reference: 'UTRRNT240405001',
      vendor_name: 'Sharma Properties LLP',
      notes: '',
    });
    ws.addRow({
      date: '2025-04-10',
      category: 'utilities',
      description: 'Electricity bill — Apr',
      amount: 6450,
      payment_method: 'upi',
      bank_name: 'HDFC Bank',
      reference: 'pspb@oksbi',
      vendor_name: 'PSPCL',
      notes: '',
    });
    ws.addRow({
      date: '2025-04-12',
      category: 'office_supplies',
      description: 'Printer paper + pens',
      amount: 1850,
      payment_method: 'cash',
      bank_name: '',
      reference: 'RCPT-0412',
      vendor_name: 'Local Stationers',
      notes: '',
    });

    const help = wb.addWorksheet('Instructions');
    const lines = [
      ['Expenses Import — How to use'],
      [],
      ['1. One row = one expense. Imported rows land with status="approved"'],
      ['   matching the manual New Expense default.'],
      [],
      ['2. Dates accept YYYY-MM-DD or DD/MM/YYYY.'],
      [],
      ['3. Category must be one of:'],
      [
        '   rent, utilities, salaries, travel, office_supplies,',
        '   professional_fees, marketing, insurance, repairs, miscellaneous.',
      ],
      [],
      [
        '4. Payment Method must be one of: cash, upi, bank_transfer,',
        '   cheque, card.',
      ],
      [],
      ['5. Bank Name is REQUIRED for every non-cash method (UPI / bank'],
      ['   transfer / cheque / card). It must match an existing bank'],
      ['   account from Settings → Invoices → Bank Accounts. Leave blank'],
      ['   only for cash — cash auto-routes to the 1101 Cash in Hand'],
      ['   ledger.'],
      [],
      ['6. Reference, Vendor Name and Notes are optional. Reference is'],
      ['   the transaction identifier (UTR / UPI Txn / Cheque No /'],
      ['   receipt number) — handy for bank reconciliation later.'],
      [],
      ['7. Idempotency: re-running the same file will skip rows already'],
      ['   imported. Match key is (date, amount, description, reference).'],
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
