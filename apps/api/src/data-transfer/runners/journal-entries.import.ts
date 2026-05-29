import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import {
  parseSheetToRows,
  groupRows,
  ImportRunResult,
  ImportRowError,
} from './import-runner';

/**
 * Bulk-import manual journal entries.
 *
 * Multi-line shape — like sales-invoices / purchase-bills. Rows are
 * grouped by Entry No; each group becomes one JournalEntry with N
 * JournalLine records. Header fields (date, narration) are read from
 * the first row of each group; subsequent rows only need the line
 * columns (Account Code, Debit, Credit, Description).
 *
 * Template columns (snake_cased after normalisation):
 *   entry_no *, date *, narration, reference,
 *   account_code *, debit, credit, description
 *
 * Validation per group:
 *   - At least 2 lines.
 *   - Σ debits == Σ credits (double-entry).
 *   - Each line has EITHER debit OR credit (not both, not neither).
 *   - Every account_code resolves to an active account in this org.
 *
 * Imported entries land with is_posted=true (matches the new-entry
 * form's default after we dropped the Save-as-Draft button).
 *
 * Idempotency: (date, reference=entry_no) is the natural dedup key.
 * A re-run of the same file skips groups already imported with a
 * 'Already imported earlier' message rather than double-posting.
 *
 * Two-pass shape (same as the other transaction runners):
 *   Pass 1 — in memory: per-group validation, account lookup,
 *            balance check, build full JournalEntry + JournalLine
 *            records with JS-generated UUIDs.
 *   Pass 2 — DB: single $transaction with two createMany calls
 *            (entries first so lines' entry_id FK is satisfied).
 */
@Injectable()
export class JournalEntriesImport {
  private readonly logger = new Logger(JournalEntriesImport.name);

  constructor(private readonly prisma: PrismaService) {}

  async run(
    orgId: string,
    userId: string,
    buffer: Buffer,
    format: string,
  ): Promise<ImportRunResult> {
    const rows = await parseSheetToRows(buffer, format, {
      allowedKeys: [
        'entry_no',
        'date',
        'narration',
        'reference',
        'account_code',
        'debit',
        'credit',
        'description',
      ],
    });

    if (rows.length === 0) {
      return { total: 0, imported: 0, skipped: 0, errors: [], created: [] };
    }

    // Pre-import header validation — surface missing required
    // columns as ONE clear error before per-row processing.
    const presentKeys = new Set(Object.keys(rows[0]));
    const required = [
      { key: 'entry_no', label: 'Entry No' },
      { key: 'date', label: 'Date' },
      { key: 'account_code', label: 'Account Code' },
    ];
    const missing = required.filter((r) => !presentKeys.has(r.key)).map((r) => r.label);
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

    // ── Pre-load lookup data ─────────────────────────────────────
    const [accounts, existing] = await Promise.all([
      this.prisma.account.findMany({
        where: { org_id: orgId, is_active: true },
        select: { id: true, code: true, name: true },
      }),
      // Idempotency keys: every existing JE in this org with a
      // non-null reference + date. Re-running the same file skips
      // groups whose (date, entry_no) was already imported.
      this.prisma.journalEntry.findMany({
        where: { org_id: orgId, reference: { not: null } },
        select: { date: true, reference: true },
      }),
    ]);

    const accountByCode = new Map<string, { id: string; name: string }>();
    for (const a of accounts) {
      if (a.code) {
        accountByCode.set(a.code.trim().toLowerCase(), { id: a.id, name: a.name });
      }
    }

    const dedupeKey = (date: Date, reference: string) =>
      `${date.toISOString().slice(0, 10)}|${reference.toLowerCase()}`;
    const existingKeys = new Set<string>();
    for (const e of existing) {
      if (e.date && e.reference) {
        existingKeys.add(dedupeKey(e.date, e.reference));
      }
    }

    const groups = groupRows(rows, 'entry_no');
    if (groups.size === 0) {
      return {
        total: rows.length,
        imported: 0,
        skipped: rows.length,
        errors: [
          {
            message: `No groups found — every row needs an Entry No to group its lines under. (Use any string per logical entry, e.g. "OB-001", "JE-2025-04-01-A".)`,
          },
        ],
        created: [],
      };
    }

    // ── Pass 1: validate + build records in memory ───────────────
    const stagedEntries: any[] = [];
    const stagedLines: any[] = [];
    const errors: ImportRowError[] = [];
    let skipped = 0;
    const seenInBatch = new Set<string>();

    for (const [entryNo, lines] of groups.entries()) {
      try {
        const header = lines[0];

        const rawDate = (header.date || '').trim();
        const date = this.parseDate(rawDate);
        if (!date) {
          throw new Error(
            rawDate
              ? `Date "${rawDate}" is invalid. Use YYYY-MM-DD or DD/MM/YYYY.`
              : `Date is empty on the first line.`,
          );
        }

        // Idempotency
        const key = dedupeKey(date, entryNo);
        if (existingKeys.has(key)) {
          skipped += 1;
          errors.push({
            group: entryNo,
            message: `Already imported earlier (Entry No "${entryNo}" on ${rawDate}). Skipped.`,
          });
          continue;
        }
        if (seenInBatch.has(key)) {
          skipped += 1;
          errors.push({
            group: entryNo,
            message: `Duplicate Entry No "${entryNo}" within this import file. Skipped.`,
          });
          continue;
        }
        seenInBatch.add(key);

        if (lines.length < 2) {
          throw new Error(
            `Entry has only ${lines.length} line. A journal entry must have at least 2 lines (one debit + one credit).`,
          );
        }

        // Build line records + validate each
        let totalDebit = 0;
        let totalCredit = 0;
        const entryId = randomUUID();
        const builtLines: any[] = [];

        lines.forEach((row, idx) => {
          const lineNum = idx + 1;
          const code = (row.account_code || '').trim();
          if (!code) {
            throw new Error(`Line ${lineNum}: Account Code is empty.`);
          }
          const acct = accountByCode.get(code.toLowerCase());
          if (!acct) {
            throw new Error(
              `Line ${lineNum}: Account "${code}" not found in the chart of accounts.`,
            );
          }
          const debit = this.parseNumber(row.debit);
          const credit = this.parseNumber(row.credit);
          if (debit > 0 && credit > 0) {
            throw new Error(
              `Line ${lineNum}: Cannot have both Debit (${debit}) and Credit (${credit}). Use one column per line.`,
            );
          }
          if (debit === 0 && credit === 0) {
            throw new Error(
              `Line ${lineNum}: Both Debit and Credit are zero. Each line needs an amount.`,
            );
          }
          totalDebit += debit;
          totalCredit += credit;
          builtLines.push({
            id: randomUUID(),
            entry_id: entryId,
            account_id: acct.id,
            debit,
            credit,
            description: (row.description || '').trim() || null,
          });
        });

        // Balance check — 0.005 tolerance for Decimal residue.
        if (Math.abs(totalDebit - totalCredit) > 0.005) {
          throw new Error(
            `Debits (${totalDebit.toFixed(2)}) must equal Credits (${totalCredit.toFixed(2)}).`,
          );
        }

        stagedEntries.push({
          id: entryId,
          org_id: orgId,
          date,
          narration: (header.narration || '').trim() || null,
          // Reference doubles as the dedupe key AND the user-visible
          // external identifier on the JE list — entry_no IS the
          // most natural choice here (it's what they typed in the
          // template), so store it directly. If they also provided
          // their own `reference` column we honour that too.
          reference: (header.reference || '').trim() || entryNo,
          reference_type: 'manual',
          is_posted: true,
          created_by: userId,
        });
        stagedLines.push(...builtLines);
      } catch (err) {
        skipped += 1;
        errors.push({
          group: entryNo,
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    if (stagedEntries.length === 0) {
      return {
        total: groups.size,
        imported: 0,
        skipped,
        errors,
        created: [],
      };
    }

    // ── Pass 2: bulk insert in one transaction ──────────────────
    // Order matters because of FKs:
    //   1. journal_entries — referenced by journal_lines.entry_id
    //   2. journal_lines
    await this.prisma.$transaction([
      this.prisma.journalEntry.createMany({ data: stagedEntries }),
      this.prisma.journalLine.createMany({ data: stagedLines }),
    ]);

    return {
      total: groups.size,
      imported: stagedEntries.length,
      skipped,
      errors,
      created: stagedEntries.map((e) => ({
        entry_id: e.id,
        reference: e.reference,
        date: e.date,
      })),
    };
  }

  /**
   * Template builder — 8 columns + 3 sample entries (each 2 lines)
   * showing the multi-line group shape, plus an Instructions sheet.
   */
  static async buildTemplate(): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Journal Entries');
    ws.columns = [
      { header: 'Entry No *', key: 'entry_no', width: 14 },
      { header: 'Date *', key: 'date', width: 12 },
      { header: 'Narration', key: 'narration', width: 32 },
      { header: 'Reference', key: 'reference', width: 18 },
      { header: 'Account Code *', key: 'account_code', width: 14 },
      { header: 'Debit', key: 'debit', width: 12 },
      { header: 'Credit', key: 'credit', width: 12 },
      { header: 'Line Description', key: 'description', width: 30 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };

    // Sample 1: depreciation entry (Dr Depreciation Expense, Cr Accumulated Depreciation)
    ws.addRow({
      entry_no: 'JE-OB-001',
      date: '2025-04-01',
      narration: 'Depreciation for April 2025 — office equipment',
      reference: '',
      account_code: '5301',
      debit: 8500,
      credit: 0,
      description: 'Apr depreciation',
    });
    ws.addRow({
      entry_no: 'JE-OB-001',
      date: '',
      narration: '',
      reference: '',
      account_code: '1209',
      debit: 0,
      credit: 8500,
      description: 'Accumulated depreciation — office equipment',
    });

    // Sample 2: accrual (Dr Expense, Cr Accrued Liabilities)
    ws.addRow({
      entry_no: 'JE-OB-002',
      date: '2025-04-30',
      narration: 'Accrued audit fees — Apr 2025',
      reference: '',
      account_code: '5202',
      debit: 25000,
      credit: 0,
      description: '',
    });
    ws.addRow({
      entry_no: 'JE-OB-002',
      date: '',
      narration: '',
      reference: '',
      account_code: '2115',
      debit: 0,
      credit: 25000,
      description: '',
    });

    // Sample 3: 3-line entry (transfer with bank charges)
    ws.addRow({
      entry_no: 'JE-OB-003',
      date: '2025-05-05',
      narration: 'Inter-bank transfer ICICI → HDFC less charges',
      reference: 'UTRTXF240505',
      account_code: '1102.002',
      debit: 99850,
      credit: 0,
      description: 'HDFC current — credit',
    });
    ws.addRow({
      entry_no: 'JE-OB-003',
      date: '',
      narration: '',
      reference: '',
      account_code: '5103',
      debit: 150,
      credit: 0,
      description: 'Bank charges',
    });
    ws.addRow({
      entry_no: 'JE-OB-003',
      date: '',
      narration: '',
      reference: '',
      account_code: '1102.001',
      debit: 0,
      credit: 100000,
      description: 'ICICI current — debit',
    });

    const help = wb.addWorksheet('Instructions');
    const lines = [
      ['Journal Entries Import — How to use'],
      [],
      ['1. One row = one journal LINE. Multiple rows with the same Entry No'],
      ['   are grouped into a single journal entry. On rows 2…N of a group,'],
      ['   you only need to fill: Account Code, Debit OR Credit, and'],
      ['   (optionally) Line Description.'],
      [],
      ['2. Dates accept YYYY-MM-DD or DD/MM/YYYY. The date on the FIRST'],
      ['   row of a group sets the journal entry date; subsequent rows'],
      ['   inside the same group ignore date / narration / reference.'],
      [],
      ['3. Account Code must exist in your Chart of Accounts. The match'],
      ['   is case-insensitive but the code itself must be exact'],
      ['   (e.g. "1102.001" not "1102"). See /books/accounts for the list.'],
      [],
      ['4. Each line must have EITHER a Debit OR a Credit amount (not'],
      ['   both, not neither). Standard double-entry — Sum(Debits)'],
      ['   must equal Sum(Credits) within each entry group.'],
      [],
      ['5. Narration is optional. Reference is also optional; if you'],
      ['   leave it blank we use the Entry No itself as the reference.'],
      [],
      ['6. Imported entries land as POSTED (matches the new manual'],
      ['   entry form, which no longer offers a Draft option).'],
      [],
      ['7. Idempotency: re-running the same file skips entries already'],
      ['   imported. Match key is (date, Entry No).'],
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
