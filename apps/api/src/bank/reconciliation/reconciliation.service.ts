import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AutoMatchDto } from '../dto/bank.dto';

interface MatchResult {
  transaction_id: string;
  matched_to: 'payment' | 'invoice';
  matched_id: string;
  matched_reference: string;
  amount: number;
  confidence: number; // 0-100
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get reconciliation summary for an organization.
   */
  async getSummary(orgId: string, bankAccountId?: string) {
    const where: any = { org_id: orgId };
    if (bankAccountId) {
      where.bank_account_id = bankAccountId;
    }

    const [total, reconciled, unreconciled] = await Promise.all([
      this.prisma.bankTransaction.count({ where }),
      this.prisma.bankTransaction.count({ where: { ...where, is_reconciled: true } }),
      this.prisma.bankTransaction.count({ where: { ...where, is_reconciled: false } }),
    ]);

    // Sum amounts by reconciled status
    const reconciledTxns = await this.prisma.bankTransaction.findMany({
      where: { ...where, is_reconciled: true },
      select: { amount: true, type: true },
    });

    const unreconciledTxns = await this.prisma.bankTransaction.findMany({
      where: { ...where, is_reconciled: false },
      select: { amount: true, type: true },
    });

    const sumAmount = (txns: Array<{ amount: any; type: string }>) => {
      return txns.reduce((sum, t) => {
        const amt = Number(t.amount);
        return sum + (t.type === 'credit' ? amt : -amt);
      }, 0);
    };

    return {
      total_transactions: total,
      reconciled_count: reconciled,
      unreconciled_count: unreconciled,
      reconciled_pct: total > 0 ? Math.round((reconciled / total) * 100) : 0,
      reconciled_net_amount: sumAmount(reconciledTxns),
      unreconciled_net_amount: sumAmount(unreconciledTxns),
    };
  }

  /**
   * Auto-match unreconciled bank transactions against payments and invoices.
   *
   * Matching criteria:
   * 1. Amount must match (within tolerance)
   * 2. Date must be within tolerance range
   * 3. Credit transactions match to received payments / sales invoices
   * 4. Debit transactions match to made payments / purchase invoices
   */
  async autoMatch(orgId: string, data: AutoMatchDto): Promise<{
    matches: MatchResult[];
    auto_reconciled: number;
  }> {
    const { bank_account_id, date_tolerance_days, amount_tolerance_pct } = data;

    // Verify bank account
    const bankAccount = await this.prisma.bankAccount.findFirst({
      where: { id: bank_account_id, org_id: orgId },
    });
    if (!bankAccount) {
      throw new NotFoundException('Bank account not found');
    }

    // Get unreconciled transactions
    const unreconciledTxns = await this.prisma.bankTransaction.findMany({
      where: {
        org_id: orgId,
        bank_account_id,
        is_reconciled: false,
      },
      orderBy: { date: 'asc' },
    });

    if (unreconciledTxns.length === 0) {
      return { matches: [], auto_reconciled: 0 };
    }

    // Get unlinked payments for this bank account
    const payments = await this.prisma.payment.findMany({
      where: {
        org_id: orgId,
        bank_account_id,
      },
      include: {
        contact: { select: { name: true } },
      },
    });

    // Get unpaid/partially-paid invoices
    const invoices = await this.prisma.invoice.findMany({
      where: {
        org_id: orgId,
        status: { in: ['sent', 'overdue', 'partial'] },
      },
      include: {
        contact: { select: { name: true } },
      },
    });

    const matches: MatchResult[] = [];
    const matchedTxnIds = new Set<string>();
    const matchedPaymentIds = new Set<string>();
    const matchedInvoiceIds = new Set<string>();

    for (const txn of unreconciledTxns) {
      if (matchedTxnIds.has(txn.id)) continue;

      const txnAmount = Number(txn.amount);
      const txnDate = new Date(txn.date);
      const toleranceAmount = txnAmount * (amount_tolerance_pct / 100);

      // Try matching against payments
      for (const payment of payments) {
        if (matchedPaymentIds.has(payment.id)) continue;

        const paymentAmount = Number(payment.amount);
        const paymentDate = new Date(payment.date);

        const amountDiff = Math.abs(txnAmount - paymentAmount);
        const dateDiffMs = Math.abs(txnDate.getTime() - paymentDate.getTime());
        const dateDiffDays = dateDiffMs / (1000 * 60 * 60 * 24);

        // Check type alignment: credit txn = received payment, debit txn = made payment
        const typeMatch =
          (txn.type === 'credit' && payment.type === 'received') ||
          (txn.type === 'debit' && payment.type === 'made');

        if (
          typeMatch &&
          amountDiff <= toleranceAmount &&
          dateDiffDays <= date_tolerance_days
        ) {
          const confidence = this.calculateConfidence(
            amountDiff,
            toleranceAmount,
            dateDiffDays,
            date_tolerance_days,
            txn.description,
            payment.reference || payment.contact?.name,
          );

          matches.push({
            transaction_id: txn.id,
            matched_to: 'payment',
            matched_id: payment.id,
            matched_reference: payment.reference || `Payment to ${payment.contact?.name || 'unknown'}`,
            amount: txnAmount,
            confidence,
          });

          matchedTxnIds.add(txn.id);
          matchedPaymentIds.add(payment.id);
          break;
        }
      }

      if (matchedTxnIds.has(txn.id)) continue;

      // Try matching against invoices (by balance_due)
      for (const invoice of invoices) {
        if (matchedInvoiceIds.has(invoice.id)) continue;

        const invoiceBalance = Number(invoice.balance_due ?? invoice.total ?? 0);
        const invoiceDate = new Date(invoice.due_date || invoice.date);

        const amountDiff = Math.abs(txnAmount - invoiceBalance);
        const dateDiffMs = Math.abs(txnDate.getTime() - invoiceDate.getTime());
        const dateDiffDays = dateDiffMs / (1000 * 60 * 60 * 24);

        // credit txn = sales invoice paid, debit txn = purchase invoice paid
        const typeMatch =
          (txn.type === 'credit' && invoice.type === 'sales') ||
          (txn.type === 'debit' && invoice.type === 'purchase');

        if (
          typeMatch &&
          amountDiff <= toleranceAmount &&
          dateDiffDays <= date_tolerance_days
        ) {
          const confidence = this.calculateConfidence(
            amountDiff,
            toleranceAmount,
            dateDiffDays,
            date_tolerance_days,
            txn.description,
            invoice.invoice_number || invoice.contact?.name,
          );

          matches.push({
            transaction_id: txn.id,
            matched_to: 'invoice',
            matched_id: invoice.id,
            matched_reference: `Invoice ${invoice.invoice_number}`,
            amount: txnAmount,
            confidence,
          });

          matchedTxnIds.add(txn.id);
          matchedInvoiceIds.add(invoice.id);
          break;
        }
      }
    }

    // Auto-reconcile high-confidence matches (>= 90%)
    let autoReconciled = 0;
    for (const match of matches) {
      if (match.confidence >= 90) {
        const updateData: any = { is_reconciled: true };

        if (match.matched_to === 'payment') {
          const payment = await this.prisma.payment.findUnique({
            where: { id: match.matched_id },
          });
          if (payment?.journal_id) {
            updateData.matched_entry_id = payment.journal_id;
          }
        } else if (match.matched_to === 'invoice') {
          const invoice = await this.prisma.invoice.findUnique({
            where: { id: match.matched_id },
          });
          if (invoice?.journal_id) {
            updateData.matched_entry_id = invoice.journal_id;
          }
        }

        updateData.ai_suggestion = {
          matched_to: match.matched_to,
          matched_id: match.matched_id,
          confidence: match.confidence,
          auto_reconciled: true,
        };

        await this.prisma.bankTransaction.update({
          where: { id: match.transaction_id },
          data: updateData,
        });

        autoReconciled++;
      } else {
        // Store as suggestion only
        await this.prisma.bankTransaction.update({
          where: { id: match.transaction_id },
          data: {
            ai_suggestion: {
              matched_to: match.matched_to,
              matched_id: match.matched_id,
              confidence: match.confidence,
              auto_reconciled: false,
            },
          },
        });
      }
    }

    this.logger.log(
      `Auto-match complete: ${matches.length} matches found, ${autoReconciled} auto-reconciled`,
    );

    return {
      matches,
      auto_reconciled: autoReconciled,
    };
  }

  /**
   * Calculate confidence score for a match.
   */
  private calculateConfidence(
    amountDiff: number,
    amountTolerance: number,
    dateDiffDays: number,
    dateTolerance: number,
    txnDescription?: string | null,
    matchReference?: string | null,
  ): number {
    let score = 0;

    // Amount match (0-50 points)
    if (amountDiff === 0) {
      score += 50;
    } else if (amountTolerance > 0) {
      score += Math.round(50 * (1 - amountDiff / amountTolerance));
    }

    // Date proximity (0-30 points)
    if (dateDiffDays === 0) {
      score += 30;
    } else if (dateTolerance > 0) {
      score += Math.round(30 * (1 - dateDiffDays / dateTolerance));
    }

    // Description/reference match (0-20 points)
    if (txnDescription && matchReference) {
      const descLower = txnDescription.toLowerCase();
      const refLower = matchReference.toLowerCase();
      if (descLower.includes(refLower) || refLower.includes(descLower)) {
        score += 20;
      } else {
        // Check for partial word matches
        const refWords = refLower.split(/\s+/).filter((w) => w.length > 2);
        const matchedWords = refWords.filter((w) => descLower.includes(w));
        if (refWords.length > 0) {
          score += Math.round(20 * (matchedWords.length / refWords.length));
        }
      }
    }

    return Math.min(100, Math.max(0, score));
  }
}
