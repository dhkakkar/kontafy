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
 * Bulk-import customer receipts ('received') or vendor payments ('made').
 *
 * One row = one payment, optionally allocated against a single invoice.
 * Multi-bill allocation isn't supported in the template (kept simple
 * for an admin one-shot import) — users who need to split a single
 * payment across several invoices do it from the Record Payment UI
 * where the full allocation table lives.
 *
 * Template columns (snake_cased after normalisation):
 *   payment_date *, contact_name *, contact_gstin, amount *, mode *
 *     (cash | upi | bank_transfer | cheque | card),
 *   reference, bank_name (required when mode != cash),
 *   against_invoice (invoice/bill number; empty = advance),
 *   notes
 *
 * Two-pass architecture (same shape as purchase-bills.import.ts):
 *   Pass 1 — in memory: per-row validation, contact/bank/invoice
 *            lookups against pre-loaded maps, build full Payment +
 *            PaymentAllocation + JournalEntry + JournalLine records.
 *   Pass 2 — DB: one $transaction with bulk createMany calls + an
 *            updateMany per affected invoice. Avoids the per-row
 *            round-trip storm that would otherwise blow past
 *            Cloudflare's 100s upstream timeout on 40+ payment imports.
 *
 * Idempotency: (contact_id, date, amount, reference) is the natural
 * dedupe key. A re-run skips rows already imported under that key
 * with a friendly "already imported" message rather than creating
 * duplicate payments + double-posting JEs.
 */
@Injectable()
export class PaymentsImport {
  private readonly logger = new Logger(PaymentsImport.name);

  constructor(private readonly prisma: PrismaService) {}

  private static readonly VALID_MODES = new Set([
    'cash',
    'upi',
    'bank_transfer',
    'cheque',
    'card',
  ]);

  async run(
    orgId: string,
    _userId: string,
    buffer: Buffer,
    format: string,
    direction: 'received' | 'made',
  ): Promise<ImportRunResult> {
    // Accept both the direction-specific header keys (`customer_*`
    // for receipts, `vendor_*` for payments) AND the legacy
    // `contact_*` aliases. The downloaded template uses the direction-
    // specific labels ("Customer Name *" / "Vendor Name *") which
    // normalise to `customer_name` / `vendor_name` — handlers used to
    // look up `contact_name`, returning undefined and emitting the
    // famous "Customer not found ('undefined')" error per row.
    // Similarly for `against_invoice` vs `against_bill`.
    const rows = await parseSheetToRows(buffer, format, {
      allowedKeys: [
        'payment_date',
        'contact_name',
        'customer_name',
        'vendor_name',
        'contact_gstin',
        'customer_gstin',
        'vendor_gstin',
        'amount',
        'mode',
        'reference',
        'bank_name',
        'against_invoice',
        'against_bill',
        'notes',
      ],
    });

    if (rows.length === 0) {
      return { total: 0, imported: 0, skipped: 0, errors: [], created: [] };
    }

    // Pre-import header validation: catch missing required columns
    // before per-row processing so the user gets one clear error
    // instead of N copies of "amount must be > 0". The first row
    // tells us which keys made it through normalisation.
    const presentKeys = new Set(Object.keys(rows[0]));
    const hasContactCol =
      presentKeys.has('contact_name') ||
      (direction === 'received' && presentKeys.has('customer_name')) ||
      (direction === 'made' && presentKeys.has('vendor_name'));
    const requiredChecks: Array<{ key: string; label: string; present: boolean }> = [
      { key: 'payment_date', label: 'Payment Date', present: presentKeys.has('payment_date') },
      {
        key: direction === 'received' ? 'customer_name' : 'vendor_name',
        label: direction === 'received' ? 'Customer Name' : 'Vendor Name',
        present: hasContactCol,
      },
      { key: 'amount', label: 'Amount', present: presentKeys.has('amount') },
      { key: 'mode', label: 'Mode', present: presentKeys.has('mode') },
    ];
    const missing = requiredChecks.filter((c) => !c.present).map((c) => c.label);
    if (missing.length > 0) {
      return {
        total: rows.length,
        imported: 0,
        skipped: rows.length,
        errors: [
          {
            message: `Required column${missing.length === 1 ? '' : 's'} missing: ${missing.join(', ')}. Please re-download the template (Download button on the import page) and use that file.`,
          },
        ],
        created: [],
      };
    }

    // ── Pre-load lookup data in parallel ─────────────────────────
    // Customers/both for received, vendors/both for made. The
    // contact filter mirrors the manual record-payment flow so
    // imported rows can't accidentally settle a vendor payment
    // against a customer record (or vice versa).
    const contactTypes =
      direction === 'received' ? ['customer', 'both'] : ['vendor', 'both'];

    const [contacts, banks, accounts, existing, openInvoices] =
      await Promise.all([
        this.prisma.contact.findMany({
          where: {
            org_id: orgId,
            is_active: true,
            type: { in: contactTypes },
          },
          select: { id: true, name: true, gstin: true },
        }),
        this.prisma.bankAccount.findMany({
          where: { org_id: orgId, is_active: true },
          select: {
            id: true,
            bank_name: true,
            account_name: true,
            account_id: true,
          },
        }),
        // COA accounts needed for JE posting. 1101 only matters for
        // cash-mode rows but cheap to fetch in the same round trip.
        this.prisma.account.findMany({
          where: {
            org_id: orgId,
            code: { in: ['1101', '1102', '1103', '2101', '2116', '1112'] },
          },
          select: { id: true, code: true },
        }),
        // Idempotency keys. Existing payments in this org with a
        // matching (contact, date, amount, reference) tuple are
        // skipped on re-import.
        this.prisma.payment.findMany({
          where: {
            org_id: orgId,
            type: direction,
          },
          select: {
            contact_id: true,
            date: true,
            amount: true,
            reference: true,
          },
        }),
        // Outstanding invoices/bills — used to validate the
        // "against_invoice" column. Pre-loading once is much faster
        // than a per-row findFirst, especially for the 40+ receipts
        // common in opening-data imports.
        this.prisma.invoice.findMany({
          where: {
            org_id: orgId,
            type: direction === 'received' ? 'sale' : 'purchase',
            status: { in: ['sent', 'partially_paid', 'overdue'] },
          },
          select: {
            id: true,
            invoice_number: true,
            contact_id: true,
            total: true,
            amount_paid: true,
            balance_due: true,
            status: true,
          },
        }),
      ]);

    // ── Build lookup maps ────────────────────────────────────────

    const byGstin = new Map<string, string>();
    const byName = new Map<string, string>();
    for (const c of contacts) {
      if (c.gstin) byGstin.set(c.gstin.toUpperCase(), c.id);
      if (c.name) byName.set(c.name.trim().toLowerCase(), c.id);
    }

    const bankByName = new Map<
      string,
      { id: string; account_id: string | null }
    >();
    for (const b of banks) {
      // Both "ICICI Bank" and the long form "ICICI Bank — Tech Flow"
      // should match the user's typed input. Index by both bank_name
      // alone (most common) and by full account_name.
      if (b.bank_name) {
        bankByName.set(b.bank_name.trim().toLowerCase(), {
          id: b.id,
          account_id: b.account_id,
        });
      }
      if (b.account_name) {
        bankByName.set(b.account_name.trim().toLowerCase(), {
          id: b.id,
          account_id: b.account_id,
        });
      }
    }

    const acctId: Record<string, string | undefined> = {};
    for (const a of accounts) {
      if (a.code) acctId[a.code] = a.id;
    }

    // ISO-date-only natural key for the dedupe set (so a Date object
    // and a string-parsed Date hash to the same key).
    const dedupeKey = (
      contactId: string,
      date: Date,
      amount: number,
      reference: string | null | undefined,
    ) =>
      `${contactId}|${date.toISOString().slice(0, 10)}|${Math.round(amount * 100)}|${(reference || '').trim().toLowerCase()}`;

    const existingKeys = new Set<string>();
    for (const e of existing) {
      if (!e.contact_id || !e.amount || !e.date) continue;
      existingKeys.add(
        dedupeKey(
          e.contact_id,
          e.date,
          Number(e.amount),
          e.reference || undefined,
        ),
      );
    }

    const invoiceByNumber = new Map<string, (typeof openInvoices)[number]>();
    for (const inv of openInvoices) {
      invoiceByNumber.set(inv.invoice_number.toLowerCase(), inv);
    }

    // Mutable per-invoice tally so multiple rows allocated against the
    // same bill correctly compound (a customer who paid 2x ₹10k
    // against a ₹25k invoice should land partial — not overpay then
    // throw on the second row). Keys: invoice.id, values: running
    // {amount_paid, status}. Initialised from the DB row.
    type InvoiceTally = {
      id: string;
      total: number;
      amount_paid: number;
      balance_due: number;
      status: string;
    };
    const invoiceTallies = new Map<string, InvoiceTally>();
    for (const inv of openInvoices) {
      invoiceTallies.set(inv.id, {
        id: inv.id,
        total: inv.total ? Number(inv.total) : 0,
        amount_paid: inv.amount_paid ? Number(inv.amount_paid) : 0,
        balance_due: inv.balance_due ? Number(inv.balance_due) : 0,
        status: inv.status,
      });
    }

    // ── Pass 1: validate + stage records in memory ───────────────
    type StagedPayment = {
      paymentId: string;
      data: any;
      allocation: { id: string; payment_id: string; invoice_id: string; amount: number } | null;
      journal: { entry: any; lines: any[] } | null;
      invoiceUpdate: InvoiceTally | null;
    };
    const staged: StagedPayment[] = [];
    const errors: ImportRowError[] = [];
    let skipped = 0;
    const seenInBatch = new Set<string>();

    // Helper: read a cell value tolerantly across the legacy
    // contact_* alias and the direction-specific customer_* /
    // vendor_* keys. The first non-empty wins. Templates we
    // generate emit only the direction-specific labels, but a
    // user could hand-edit the headers — either spelling works.
    const pickRow = (row: Record<string, string>, ...keys: string[]) => {
      for (const k of keys) {
        const v = (row[k] || '').trim();
        if (v) return v;
      }
      return '';
    };

    rows.forEach((row, idx) => {
      const rowNum = idx + 2; // +2: 1 for the header row, 1 for 1-indexing
      try {
        const rawDate = pickRow(row, 'payment_date');
        const date = this.parseDate(rawDate);
        if (!date) {
          throw new Error(
            rawDate
              ? `Row ${rowNum}: Date "${rawDate}" is invalid. Use YYYY-MM-DD or DD/MM/YYYY.`
              : `Row ${rowNum}: Payment Date is empty.`,
          );
        }

        const contactName = pickRow(
          row,
          'contact_name',
          direction === 'received' ? 'customer_name' : 'vendor_name',
        );
        const contactGstin = pickRow(
          row,
          'contact_gstin',
          direction === 'received' ? 'customer_gstin' : 'vendor_gstin',
        );

        if (!contactName && !contactGstin) {
          throw new Error(
            `Row ${rowNum}: ${direction === 'received' ? 'Customer Name' : 'Vendor Name'} is empty.`,
          );
        }

        const contactId = this.resolveContact(
          contactName,
          contactGstin,
          byGstin,
          byName,
        );
        if (!contactId) {
          const label = contactName || contactGstin;
          throw new Error(
            `Row ${rowNum}: ${direction === 'received' ? 'Customer' : 'Vendor'} "${label}" not found. Create the contact in /contacts first, then re-import.`,
          );
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

        const mode = pickRow(row, 'mode').toLowerCase();
        if (!PaymentsImport.VALID_MODES.has(mode)) {
          throw new Error(
            mode
              ? `Row ${rowNum}: Mode "${mode}" is invalid. Use one of: cash, upi, bank_transfer, cheque, card.`
              : `Row ${rowNum}: Mode is empty. Use one of: cash, upi, bank_transfer, cheque, card.`,
          );
        }

        const reference = pickRow(row, 'reference') || null;

        // Idempotency check — DB + within-file dedupe.
        const key = dedupeKey(contactId, date, amount, reference);
        if (existingKeys.has(key)) {
          skipped += 1;
          errors.push({
            row: rowNum,
            message: `Already imported earlier (same contact + date + amount + reference). Skipped.`,
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

        // Bank account resolution. Required for every non-cash mode
        // because the JE poster needs a specific 1102.NNN ledger to
        // debit/credit. Cash mode falls through to ledger 1101 via
        // the cash branch in postPayment(), so bank_account_id stays
        // null.
        let bankAccountId: string | null = null;
        let bankLedgerId: string | undefined;
        if (mode !== 'cash') {
          const bankRaw = pickRow(row, 'bank_name');
          if (!bankRaw) {
            throw new Error(
              `Row ${rowNum}: Bank Name is required for mode "${mode}". (Only cash works without a bank.)`,
            );
          }
          const bank = bankByName.get(bankRaw.toLowerCase());
          if (!bank) {
            throw new Error(
              `Row ${rowNum}: Bank "${bankRaw}" not found. Add it in Settings → Invoices → Bank Accounts first.`,
            );
          }
          bankAccountId = bank.id;
          bankLedgerId = bank.account_id || undefined;
        } else {
          bankLedgerId = acctId['1101'];
          if (!bankLedgerId) {
            throw new Error(
              `Row ${rowNum}: Cash ledger (1101 Cash in Hand) missing from chart of accounts.`,
            );
          }
        }

        // Allocation against a specific invoice/bill (optional).
        // Empty → pure advance (whole amount → 2116/1112). Accept
        // both `against_invoice` (receipts template) and
        // `against_bill` (vendor-payments template) — the parser
        // emits whichever the user's template uses.
        const againstRaw = pickRow(row, 'against_invoice', 'against_bill');
        let allocation: StagedPayment['allocation'] = null;
        let invoiceUpdate: InvoiceTally | null = null;
        const paymentId = randomUUID();

        if (againstRaw) {
          const inv = invoiceByNumber.get(againstRaw.toLowerCase());
          if (!inv) {
            throw new Error(
              `Row ${rowNum}: ${direction === 'received' ? 'Invoice' : 'Bill'} "${againstRaw}" not found among outstanding ${direction === 'received' ? 'invoices' : 'bills'}. It may already be fully paid, cancelled, or still in draft.`,
            );
          }
          if (inv.contact_id !== contactId) {
            throw new Error(
              `Row ${rowNum}: ${direction === 'received' ? 'Invoice' : 'Bill'} "${againstRaw}" belongs to a different ${direction === 'received' ? 'customer' : 'vendor'} than the one on this row.`,
            );
          }
          const tally = invoiceTallies.get(inv.id)!;
          if (amount > tally.balance_due + 0.005) {
            throw new Error(
              `Row ${rowNum}: Allocation ${amount} exceeds remaining balance ${tally.balance_due.toFixed(2)} on ${direction === 'received' ? 'invoice' : 'bill'} ${inv.invoice_number}.`,
            );
          }
          // Compound the running tally so the NEXT row that targets
          // the same invoice sees the reduced balance.
          tally.amount_paid = round2(tally.amount_paid + amount);
          tally.balance_due = round2(tally.balance_due - amount);
          tally.status =
            tally.balance_due <= 0
              ? 'paid'
              : tally.amount_paid > 0
                ? 'partially_paid'
                : tally.status;
          invoiceTallies.set(inv.id, tally);

          allocation = {
            id: randomUUID(),
            payment_id: paymentId,
            invoice_id: inv.id,
            amount,
          };
          invoiceUpdate = tally;
        }

        // Build the JE — needs the counter account (1103 AR for
        // received, 2101 AP for made) and, when there's an unallocated
        // remainder, 2116/1112. Imports can't (yet) carry an advance
        // remainder in a single row because the template caps each row
        // to a single allocation; so the JE here is simpler than the
        // service version — exactly one of (allocated against bill)
        // or (full advance). Mixed splits aren't expressible in the
        // template; users who need that should record via the UI.
        let journal: StagedPayment['journal'] = null;
        const isReceive = direction === 'received';
        const counterCode = isReceive ? '1103' : '2101';
        const counterId = acctId[counterCode];
        const advanceCode = isReceive ? '2116' : '1112';
        const advanceId = acctId[advanceCode];

        if (!counterId) {
          // Without 1103/2101 we can't post — surface a clear warning
          // (the payment itself still imports) and skip the JE.
          errors.push({
            row: rowNum,
            message: `Payment imported but JE skipped — missing account ${counterCode}. Seed it in /books/accounts.`,
          });
        } else if (!allocation && !advanceId) {
          errors.push({
            row: rowNum,
            message: `Payment imported but JE skipped — advance account ${advanceCode} missing. Seed it in /books/accounts.`,
          });
        } else {
          const entryId = randomUUID();
          const jeLines: any[] = [];
          if (isReceive) {
            // Receive: Dr bank | Cr (counter | advance)
            jeLines.push({
              id: randomUUID(),
              entry_id: entryId,
              account_id: bankLedgerId!,
              debit: amount,
              credit: 0,
              description: 'Payment received',
            });
            if (allocation) {
              jeLines.push({
                id: randomUUID(),
                entry_id: entryId,
                account_id: counterId,
                debit: 0,
                credit: amount,
                description: 'AR settled',
              });
            } else {
              jeLines.push({
                id: randomUUID(),
                entry_id: entryId,
                account_id: advanceId!,
                debit: 0,
                credit: amount,
                description: 'Advance from customer',
              });
            }
          } else {
            // Pay: Dr (counter | advance) | Cr bank
            if (allocation) {
              jeLines.push({
                id: randomUUID(),
                entry_id: entryId,
                account_id: counterId,
                debit: amount,
                credit: 0,
                description: 'AP settled',
              });
            } else {
              jeLines.push({
                id: randomUUID(),
                entry_id: entryId,
                account_id: advanceId!,
                debit: amount,
                credit: 0,
                description: 'Advance to vendor',
              });
            }
            jeLines.push({
              id: randomUUID(),
              entry_id: entryId,
              account_id: bankLedgerId!,
              debit: 0,
              credit: amount,
              description: 'Payment made',
            });
          }

          journal = {
            entry: {
              id: entryId,
              org_id: orgId,
              date,
              narration: `Auto-post: ${isReceive ? 'Payment received' : 'Payment made'}${allocation ? '' : ' (advance)'}`,
              reference: reference || null,
              reference_type: 'payment',
              reference_id: paymentId,
              is_posted: true,
            },
            lines: jeLines,
          };
        }

        staged.push({
          paymentId,
          data: {
            id: paymentId,
            org_id: orgId,
            type: direction,
            contact_id: contactId,
            amount,
            date,
            method: mode,
            reference,
            bank_account_id: bankAccountId,
            notes: pickRow(row, 'notes') || null,
            journal_id: journal?.entry.id ?? null,
          },
          allocation,
          journal,
          invoiceUpdate,
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

    // ── Pass 2: bulk-write in one transaction ────────────────────
    // Order:
    //  1. journal_entries (so payments.journal_id FK is satisfied)
    //  2. payments        (so payment_allocations.payment_id FK works)
    //  3. journal_lines   (FK → journal_entries)
    //  4. payment_allocations  (FK → payments + invoices)
    //  5. invoice updates (per affected invoice — small, sequential)
    const allJournalEntries = staged
      .filter((s) => s.journal)
      .map((s) => s.journal!.entry);
    const allJournalLines = staged
      .filter((s) => s.journal)
      .flatMap((s) => s.journal!.lines);
    const allAllocations = staged
      .filter((s) => s.allocation)
      .map((s) => s.allocation!);

    const txOps: any[] = [];
    if (allJournalEntries.length > 0) {
      txOps.push(this.prisma.journalEntry.createMany({ data: allJournalEntries }));
    }
    txOps.push(this.prisma.payment.createMany({ data: staged.map((s) => s.data) }));
    if (allJournalLines.length > 0) {
      txOps.push(this.prisma.journalLine.createMany({ data: allJournalLines }));
    }
    if (allAllocations.length > 0) {
      txOps.push(this.prisma.paymentAllocation.createMany({ data: allAllocations }));
    }
    await this.prisma.$transaction(txOps);

    // Invoice updates — done outside the bulk transaction since
    // they're typically few (one per affected invoice). updateMany
    // would only work if we wanted to set every row to the same
    // value, which we don't — each invoice gets its own running
    // amount_paid / balance_due / status.
    const affectedInvoices = new Map<string, InvoiceTally>();
    for (const s of staged) {
      if (s.invoiceUpdate) affectedInvoices.set(s.invoiceUpdate.id, s.invoiceUpdate);
    }
    for (const tally of affectedInvoices.values()) {
      try {
        await this.prisma.invoice.update({
          where: { id: tally.id },
          data: {
            amount_paid: tally.amount_paid,
            balance_due: Math.max(0, tally.balance_due),
            status: tally.status,
            pdf_url: null, // bust cached PDF so amounts re-render
            updated_at: new Date(),
          },
        });
      } catch (err) {
        this.logger.warn(
          `Invoice ${tally.id} update failed after payments import: ${(err as Error).message}`,
        );
      }
    }

    return {
      total: rows.length,
      imported: staged.length,
      skipped,
      errors,
      created: staged.map((s) => ({
        payment_id: s.paymentId,
        amount: s.data.amount,
        contact_id: s.data.contact_id,
      })),
    };
  }

  /**
   * Template builder — same column layout for both directions, the
   * direction is captured in the caller (received vs made) so the
   * sample rows reference customers/invoices vs vendors/bills.
   */
  static async buildTemplate(direction: 'received' | 'made'): Promise<Buffer> {
    const isReceive = direction === 'received';
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(
      isReceive ? 'Payments Received' : 'Payments Made',
    );
    ws.columns = [
      { header: 'Payment Date *', key: 'payment_date', width: 14 },
      {
        header: isReceive ? 'Customer Name *' : 'Vendor Name *',
        key: 'contact_name',
        width: 26,
      },
      {
        header: isReceive ? 'Customer GSTIN' : 'Vendor GSTIN',
        key: 'contact_gstin',
        width: 18,
      },
      { header: 'Amount *', key: 'amount', width: 12 },
      {
        header: 'Mode * (cash/upi/bank_transfer/cheque/card)',
        key: 'mode',
        width: 34,
      },
      { header: 'Reference (UTR/UPI Txn/Cheque No)', key: 'reference', width: 22 },
      {
        header: 'Bank Name (required if not cash)',
        key: 'bank_name',
        width: 22,
      },
      {
        header: isReceive
          ? 'Against Invoice (blank = advance)'
          : 'Against Bill (blank = advance)',
        key: 'against_invoice',
        width: 22,
      },
      { header: 'Notes', key: 'notes', width: 28 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };

    if (isReceive) {
      // Sample 1: bank transfer settling a specific invoice
      ws.addRow({
        payment_date: '2025-04-10',
        contact_name: 'Mumbai Solutions Pvt Ltd',
        contact_gstin: '',
        amount: 41300,
        mode: 'bank_transfer',
        reference: 'UTRMUM240410001',
        bank_name: 'ICICI Bank',
        against_invoice: 'TD/01/2025-26',
        notes: '',
      });
      // Sample 2: UPI partial against another invoice
      ws.addRow({
        payment_date: '2025-04-15',
        contact_name: 'Mumbai Solutions Pvt Ltd',
        contact_gstin: '',
        amount: 20000,
        mode: 'upi',
        reference: '4239xxxxxx@oksbi',
        bank_name: 'ICICI Bank',
        against_invoice: 'TD/05/2025-26',
        notes: 'Part payment',
      });
      // Sample 3: cash advance, no specific invoice
      ws.addRow({
        payment_date: '2025-04-20',
        contact_name: 'Walk-in Customer',
        contact_gstin: '',
        amount: 5000,
        mode: 'cash',
        reference: 'RCPT-0420',
        bank_name: '',
        against_invoice: '',
        notes: 'Advance for upcoming order',
      });
    } else {
      // Sample 1: vendor bill payment via bank transfer
      ws.addRow({
        payment_date: '2025-04-12',
        contact_name: 'Patiala Print Works',
        contact_gstin: '03ABCDP1234A1Z9',
        amount: 13440,
        mode: 'bank_transfer',
        reference: 'UTROUT240412009',
        bank_name: 'ICICI Bank',
        against_invoice: 'BILL/25-26/0001',
        notes: '',
      });
      // Sample 2: cheque to vendor
      ws.addRow({
        payment_date: '2025-04-25',
        contact_name: 'Bangalore Consultants LLP',
        contact_gstin: '29AAAFC1234A1Z9',
        amount: 75000,
        mode: 'cheque',
        reference: '123456',
        bank_name: 'HDFC Bank',
        against_invoice: 'BILL/25-26/0002',
        notes: '',
      });
      // Sample 3: cash to local vendor, advance
      ws.addRow({
        payment_date: '2025-04-28',
        contact_name: 'Local Stationers',
        contact_gstin: '',
        amount: 2000,
        mode: 'cash',
        reference: 'OUT-0428',
        bank_name: '',
        against_invoice: '',
        notes: 'Advance against future bill',
      });
    }

    const help = wb.addWorksheet('Instructions');
    const lines = [
      [`${isReceive ? 'Receipts' : 'Payments Made'} Import — How to use`],
      [],
      ['1. One row = one payment. Multi-invoice allocation isn’t supported'],
      ['   in the template — split such payments via the Record Payment'],
      ['   UI which has the full allocation table.'],
      [],
      [
        `2. ${isReceive ? 'Customer Name' : 'Vendor Name'} OR ${isReceive ? 'Customer' : 'Vendor'} GSTIN must match an existing`,
      ],
      [
        `   contact of type ${isReceive ? 'Customer' : 'Vendor'} or Both. Create the contact first if it`,
      ],
      ['   does not exist, then re-import.'],
      [],
      ['3. Dates accept YYYY-MM-DD or DD/MM/YYYY.'],
      [],
      ['4. Mode is one of: cash, upi, bank_transfer, cheque, card.'],
      [],
      ['5. Bank Name is REQUIRED for every non-cash mode (UPI/bank transfer/'],
      ['   cheque/card). It must match an existing bank account from'],
      ['   Settings → Invoices → Bank Accounts. Leave blank only for cash —'],
      ['   cash auto-routes to the 1101 Cash in Hand ledger.'],
      [],
      [
        `6. ${isReceive ? 'Against Invoice' : 'Against Bill'} is the invoice/bill number this payment`,
      ],
      [
        '   settles. Leave blank to record the full amount as an advance',
      ],
      [
        `   (${isReceive ? 'posted to 2116 Advance from Customers' : 'posted to 1112 Advance to Vendors'}). The`,
      ],
      ['   invoice must belong to the same contact and be unpaid.'],
      [],
      ['7. Idempotency: re-running the same file will skip rows already'],
      ['   imported. Match key is (contact, date, amount, reference).'],
    ];
    lines.forEach((row) => help.addRow(row));
    help.getColumn(1).width = 100;
    help.getRow(1).font = { bold: true, size: 12 };

    const out = await wb.xlsx.writeBuffer();
    return Buffer.from(out as ArrayBuffer);
  }

  private resolveContact(
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

const round2 = (n: number) => Math.round(n * 100) / 100;
