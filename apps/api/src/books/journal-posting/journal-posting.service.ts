import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Posts double-entry journal entries for invoicing & payment events.
 *
 * Accounts referenced by code (matches default chart of accounts seeded
 * by OrganizationService.createDefaultAccounts):
 *   1101 Cash in Hand
 *   1102 Bank Accounts
 *   1103 Accounts Receivable
 *   1105 GST Input Credit (CGST)
 *   1106 GST Input Credit (SGST)
 *   1107 GST Input Credit (IGST)
 *   2101 Accounts Payable
 *   2102 GST Payable (CGST)
 *   2103 GST Payable (SGST)
 *   2104 GST Payable (IGST)
 *   4001 Sales Revenue
 *   4010 Sales Returns
 *   5001 Cost of Goods Sold (used as default expense for purchase bills)
 *   5002 Purchase Returns
 */
@Injectable()
export class JournalPostingService {
  private readonly logger = new Logger(JournalPostingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Look up an account by code for a given org. Caches per-call so a single
   * post doesn't hammer the DB for every account it needs.
   */
  private async resolveAccountIds(
    orgId: string,
    codes: string[],
  ): Promise<Record<string, string>> {
    const accounts = await this.prisma.account.findMany({
      where: { org_id: orgId, code: { in: codes } },
      select: { id: true, code: true },
    });
    const map: Record<string, string> = {};
    for (const a of accounts) {
      if (a.code) map[a.code] = a.id;
    }
    return map;
  }

  private toNum(v: unknown): number {
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return v;
    return Number(v);
  }

  /**
   * Post a journal entry for a sales/purchase/credit-note/debit-note
   * invoice. Idempotent: if the invoice already has a journal_id, the
   * existing entry is replaced (delete + re-post) so totals stay in sync
   * after edits.
   */
  async postInvoice(invoiceId: string): Promise<string | null> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: true },
    });
    if (!invoice) return null;

    // Drafts and cancelled invoices don't post to books.
    if (['draft', 'cancelled'].includes(invoice.status)) {
      // If a journal was previously posted (e.g. invoice was sent then
      // moved back to draft / cancelled), reverse it by deleting.
      if (invoice.journal_id) {
        await this.deleteJournal(invoice.journal_id);
        await this.prisma.invoice.update({
          where: { id: invoiceId },
          data: { journal_id: null },
        });
      }
      return null;
    }

    const orgId = invoice.org_id;
    const subtotal = this.toNum(invoice.subtotal); // taxable
    const total = this.toNum(invoice.total);
    const totalCgst = invoice.items.reduce(
      (s, i) => s + this.toNum(i.cgst_amount),
      0,
    );
    const totalSgst = invoice.items.reduce(
      (s, i) => s + this.toNum(i.sgst_amount),
      0,
    );
    const totalIgst = invoice.items.reduce(
      (s, i) => s + this.toNum(i.igst_amount),
      0,
    );

    const codes = [
      '1103', '2101',
      '2102', '2103', '2104',
      '1105', '1106', '1107',
      '4001', '4010', '5001', '5002',
    ];
    const ids = await this.resolveAccountIds(orgId, codes);

    type Line = {
      account_id: string;
      debit: number;
      credit: number;
      description: string;
    };
    const lines: Line[] = [];

    if (invoice.type === 'sale') {
      // DR Accounts Receivable (total)
      // CR Sales Revenue (taxable)
      // CR GST Payable (CGST/SGST or IGST)
      if (ids['1103']) lines.push({ account_id: ids['1103'], debit: total, credit: 0, description: `Invoice ${invoice.invoice_number}` });
      if (ids['4001']) lines.push({ account_id: ids['4001'], debit: 0, credit: subtotal, description: `Invoice ${invoice.invoice_number}` });
      if (totalCgst > 0 && ids['2102']) lines.push({ account_id: ids['2102'], debit: 0, credit: totalCgst, description: 'CGST output' });
      if (totalSgst > 0 && ids['2103']) lines.push({ account_id: ids['2103'], debit: 0, credit: totalSgst, description: 'SGST output' });
      if (totalIgst > 0 && ids['2104']) lines.push({ account_id: ids['2104'], debit: 0, credit: totalIgst, description: 'IGST output' });
    } else if (invoice.type === 'purchase') {
      // DR Expense (default to COGS), DR GST Input
      // CR Accounts Payable
      if (ids['5001']) lines.push({ account_id: ids['5001'], debit: subtotal, credit: 0, description: `Bill ${invoice.invoice_number}` });
      if (totalCgst > 0 && ids['1105']) lines.push({ account_id: ids['1105'], debit: totalCgst, credit: 0, description: 'CGST input' });
      if (totalSgst > 0 && ids['1106']) lines.push({ account_id: ids['1106'], debit: totalSgst, credit: 0, description: 'SGST input' });
      if (totalIgst > 0 && ids['1107']) lines.push({ account_id: ids['1107'], debit: totalIgst, credit: 0, description: 'IGST input' });
      if (ids['2101']) lines.push({ account_id: ids['2101'], debit: 0, credit: total, description: `Bill ${invoice.invoice_number}` });
    } else if (invoice.type === 'credit_note') {
      // Reverses a sale: DR Sales Returns + DR GST Payable / CR AR
      if (ids['4010']) lines.push({ account_id: ids['4010'], debit: subtotal, credit: 0, description: `Credit Note ${invoice.invoice_number}` });
      if (totalCgst > 0 && ids['2102']) lines.push({ account_id: ids['2102'], debit: totalCgst, credit: 0, description: 'CGST reversal' });
      if (totalSgst > 0 && ids['2103']) lines.push({ account_id: ids['2103'], debit: totalSgst, credit: 0, description: 'SGST reversal' });
      if (totalIgst > 0 && ids['2104']) lines.push({ account_id: ids['2104'], debit: totalIgst, credit: 0, description: 'IGST reversal' });
      if (ids['1103']) lines.push({ account_id: ids['1103'], debit: 0, credit: total, description: `Credit Note ${invoice.invoice_number}` });
    } else if (invoice.type === 'debit_note') {
      // Reverses a purchase: DR Accounts Payable / CR Purchase Returns + CR GST Input
      if (ids['2101']) lines.push({ account_id: ids['2101'], debit: total, credit: 0, description: `Debit Note ${invoice.invoice_number}` });
      if (ids['5002']) lines.push({ account_id: ids['5002'], debit: 0, credit: subtotal, description: `Debit Note ${invoice.invoice_number}` });
      if (totalCgst > 0 && ids['1105']) lines.push({ account_id: ids['1105'], debit: 0, credit: totalCgst, description: 'CGST input reversal' });
      if (totalSgst > 0 && ids['1106']) lines.push({ account_id: ids['1106'], debit: 0, credit: totalSgst, description: 'SGST input reversal' });
      if (totalIgst > 0 && ids['1107']) lines.push({ account_id: ids['1107'], debit: 0, credit: totalIgst, description: 'IGST input reversal' });
    } else {
      this.logger.warn(`Unknown invoice type "${invoice.type}" — skipping journal post`);
      return null;
    }

    if (lines.length === 0) {
      this.logger.warn(
        `No journal lines built for invoice ${invoiceId} — required accounts may be missing in chart`,
      );
      return null;
    }

    return this.prisma.$transaction(async (tx) => {
      // Replace existing entry if invoice was already posted.
      if (invoice.journal_id) {
        await tx.journalLine.deleteMany({ where: { journal_id: invoice.journal_id } });
        await tx.journalEntry.delete({ where: { id: invoice.journal_id } }).catch(() => undefined);
      }

      const entry = await tx.journalEntry.create({
        data: {
          org_id: orgId,
          date: invoice.date,
          narration: `Auto-post: ${invoice.type} ${invoice.invoice_number}`,
          reference: invoice.invoice_number,
          reference_type: 'invoice',
          reference_id: invoice.id,
          is_posted: true,
          lines: {
            create: lines.map((l) => ({
              account_id: l.account_id,
              debit: l.debit,
              credit: l.credit,
              description: l.description,
            })),
          },
        },
      });

      await tx.invoice.update({
        where: { id: invoiceId },
        data: { journal_id: entry.id },
      });

      return entry.id;
    });
  }

  /**
   * Post a journal entry for a payment. For 'receive' (customer paid us):
   *   DR Bank/Cash, CR Accounts Receivable
   * For 'pay' (we paid a vendor):
   *   DR Accounts Payable, CR Bank/Cash
   */
  async postPayment(paymentId: string): Promise<string | null> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { allocations: true, bank_account: { select: { account_id: true } } },
    });
    if (!payment) return null;

    const orgId = payment.org_id;
    const amount = this.toNum(payment.amount);
    if (amount <= 0) return null;

    const codes = ['1101', '1102', '1103', '2101'];
    const ids = await this.resolveAccountIds(orgId, codes);

    // Pick the cash side. If a bank_account is linked, use its underlying
    // ledger account; else default to "Bank Accounts" (1102), or "Cash in
    // Hand" (1101) when method is explicitly cash.
    let cashAccountId: string | undefined;
    if (payment.bank_account?.account_id) {
      cashAccountId = payment.bank_account.account_id;
    } else if (payment.method === 'cash') {
      cashAccountId = ids['1101'];
    } else {
      cashAccountId = ids['1102'];
    }
    if (!cashAccountId) {
      this.logger.warn(`Cash account not found for payment ${paymentId}`);
      return null;
    }

    const isReceive = payment.type === 'receive';
    const counterCode = isReceive ? '1103' : '2101'; // AR or AP
    const counterId = ids[counterCode];
    if (!counterId) return null;

    type Line = { account_id: string; debit: number; credit: number; description: string };
    const lines: Line[] = isReceive
      ? [
          { account_id: cashAccountId, debit: amount, credit: 0, description: 'Payment received' },
          { account_id: counterId, debit: 0, credit: amount, description: 'AR settled' },
        ]
      : [
          { account_id: counterId, debit: amount, credit: 0, description: 'AP settled' },
          { account_id: cashAccountId, debit: 0, credit: amount, description: 'Payment made' },
        ];

    return this.prisma.$transaction(async (tx) => {
      if (payment.journal_id) {
        await tx.journalLine.deleteMany({ where: { journal_id: payment.journal_id } });
        await tx.journalEntry.delete({ where: { id: payment.journal_id } }).catch(() => undefined);
      }

      const entry = await tx.journalEntry.create({
        data: {
          org_id: orgId,
          date: payment.date,
          narration: `Auto-post: ${payment.type === 'receive' ? 'Payment received' : 'Payment made'}`,
          reference: payment.reference || null,
          reference_type: 'payment',
          reference_id: payment.id,
          is_posted: true,
          lines: {
            create: lines.map((l) => ({
              account_id: l.account_id,
              debit: l.debit,
              credit: l.credit,
              description: l.description,
            })),
          },
        },
      });

      await tx.payment.update({
        where: { id: paymentId },
        data: { journal_id: entry.id },
      });

      return entry.id;
    });
  }

  /** Delete a journal entry and its lines. Used when reversing a post. */
  async deleteJournal(journalId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.journalLine.deleteMany({ where: { journal_id: journalId } });
      await tx.journalEntry
        .delete({ where: { id: journalId } })
        .catch(() => undefined);
    });
  }

  /** Reverse the journal entry attached to an invoice (used on cancel). */
  async reverseInvoice(invoiceId: string): Promise<void> {
    const inv = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { journal_id: true },
    });
    if (inv?.journal_id) {
      await this.deleteJournal(inv.journal_id);
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { journal_id: null },
      });
    }
  }

  /** Reverse the journal entry attached to a payment (used on delete). */
  async reversePayment(paymentId: string): Promise<void> {
    const p = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { journal_id: true },
    });
    if (p?.journal_id) {
      await this.deleteJournal(p.journal_id);
      // Payment row may already be deleted by caller; ignore if missing.
      await this.prisma.payment
        .update({ where: { id: paymentId }, data: { journal_id: null } })
        .catch(() => undefined);
    }
  }

  /**
   * One-off backfill: post journals for every non-draft invoice and every
   * payment in an org that doesn't already have one. Returns counts.
   */
  async backfillOrg(orgId: string): Promise<{ invoices: number; payments: number }> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        org_id: orgId,
        journal_id: null,
        status: { notIn: ['draft', 'cancelled'] },
      },
      select: { id: true },
    });
    let invoiceCount = 0;
    for (const inv of invoices) {
      const id = await this.postInvoice(inv.id);
      if (id) invoiceCount++;
    }

    const payments = await this.prisma.payment.findMany({
      where: { org_id: orgId, journal_id: null },
      select: { id: true },
    });
    let paymentCount = 0;
    for (const p of payments) {
      const id = await this.postPayment(p.id);
      if (id) paymentCount++;
    }

    return { invoices: invoiceCount, payments: paymentCount };
  }
}
