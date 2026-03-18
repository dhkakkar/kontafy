import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Accounting Glossary — Kontafy",
  description:
    "40+ accounting and tax terms explained in plain language for Indian business owners. From Accounts Payable to Trial Balance.",
};

/* ------------------------------------------------------------------ */
/*  Glossary data                                                       */
/* ------------------------------------------------------------------ */

const glossary: { term: string; definition: string }[] = [
  { term: "Accounts Payable (AP)", definition: "Money your business owes to suppliers for goods or services received but not yet paid for. Appears as a current liability on your balance sheet." },
  { term: "Accounts Receivable (AR)", definition: "Money owed to your business by customers for goods or services delivered but not yet collected. Appears as a current asset on your balance sheet." },
  { term: "Accrual Accounting", definition: "An accounting method where revenue and expenses are recorded when they are earned or incurred, regardless of when cash is actually received or paid." },
  { term: "Balance Sheet", definition: "A financial statement showing your business's assets, liabilities, and equity at a specific point in time. The formula: Assets = Liabilities + Equity." },
  { term: "Bank Reconciliation", definition: "The process of matching your accounting records with your bank statement to identify discrepancies, missing entries, or errors." },
  { term: "Capital", definition: "The total investment made by the owner(s) in the business, plus retained earnings. Also called owner's equity or net worth." },
  { term: "Cash Accounting", definition: "An accounting method where revenue and expenses are recorded only when cash is received or paid. Simpler than accrual accounting but gives a less complete picture." },
  { term: "Cash Flow Statement", definition: "A financial report showing how cash moves in and out of your business over a period, categorized into operating, investing, and financing activities." },
  { term: "CGST", definition: "Central Goods and Services Tax — the portion of GST collected by the Central Government on intra-state supplies of goods or services." },
  { term: "Chart of Accounts", definition: "A structured list of all accounts used by your business to record transactions, organized by category: assets, liabilities, equity, revenue, and expenses." },
  { term: "Credit Note", definition: "A document issued by a seller to a buyer to reduce the amount owed, typically due to returned goods, pricing errors, or post-sale discounts." },
  { term: "Debit Note", definition: "A document issued by a buyer to a seller requesting a reduction in the amount payable, or by a seller to indicate additional charges." },
  { term: "Depreciation", definition: "The systematic allocation of the cost of a tangible asset over its useful life. Common methods include straight-line and written-down value (WDV) under Indian tax law." },
  { term: "Double-Entry Bookkeeping", definition: "An accounting system where every transaction is recorded in at least two accounts — a debit in one and a credit in another — ensuring the books always balance." },
  { term: "E-invoicing", definition: "A system mandated by the GST Council where B2B invoices are reported to the Invoice Registration Portal (IRP) to receive an Invoice Reference Number (IRN) and QR code." },
  { term: "E-way Bill", definition: "An electronic document required for transporting goods worth more than Rs 50,000 within or between states. Generated on the e-way bill portal before the goods are dispatched." },
  { term: "Equity", definition: "The owner's residual interest in the business after all liabilities are deducted from assets. Equity = Assets minus Liabilities." },
  { term: "FIFO (First In, First Out)", definition: "An inventory valuation method where the oldest stock is assumed to be sold first. Common in businesses dealing with perishable goods." },
  { term: "Fixed Assets", definition: "Long-term tangible assets used in business operations, such as machinery, vehicles, land, and buildings. Not intended for resale." },
  { term: "General Ledger", definition: "The master record of all financial transactions in a business, organized by accounts. Every journal entry eventually posts to the general ledger." },
  { term: "GST (Goods and Services Tax)", definition: "A comprehensive indirect tax on the supply of goods and services in India, replacing multiple earlier taxes. Has rate slabs of 0%, 5%, 12%, 18%, and 28%." },
  { term: "GSTR-1", definition: "A monthly or quarterly GST return detailing all outward supplies (sales). Filed by the 11th of the following month (13th for quarterly filers)." },
  { term: "GSTR-3B", definition: "A monthly summary GST return showing outward supplies, input tax credit claimed, and net tax payable. Filed by the 20th of the following month." },
  { term: "GSTR-9", definition: "The annual GST return consolidating all monthly/quarterly return data for the financial year. Due by 31st December." },
  { term: "HSN Code", definition: "Harmonised System of Nomenclature — a standardized numerical code used to classify goods for GST purposes. Determines the applicable tax rate." },
  { term: "IGST", definition: "Integrated Goods and Services Tax — GST collected by the Central Government on inter-state supplies and imports." },
  { term: "Input Tax Credit (ITC)", definition: "Credit available to a GST-registered business for the tax paid on purchases, which can be set off against the GST collected on sales." },
  { term: "Invoice", definition: "A commercial document issued by a seller to a buyer detailing goods/services supplied, quantities, prices, tax amounts, and payment terms." },
  { term: "Journal Entry", definition: "The fundamental accounting record that captures a transaction with its date, accounts affected, amounts, and narration. Every entry must have equal debits and credits." },
  { term: "Ledger", definition: "A record of all transactions related to a specific account (e.g., cash ledger, customer ledger). Derived from journal entries." },
  { term: "Liability", definition: "A financial obligation your business owes to external parties. Current liabilities are due within one year; long-term liabilities are due beyond one year." },
  { term: "LIFO (Last In, First Out)", definition: "An inventory valuation method where the most recently purchased stock is assumed to be sold first. Not commonly used under Indian accounting standards." },
  { term: "P&L (Profit & Loss Statement)", definition: "Also called the Income Statement. Shows revenue, expenses, and net profit or loss over a specific period. Tells you whether your business is making money." },
  { term: "Purchase Order (PO)", definition: "A formal document sent by a buyer to a supplier indicating the type, quantity, and agreed price for goods or services to be purchased." },
  { term: "Reconciliation", definition: "The process of comparing two sets of records (e.g., your books vs. bank statement, or your GSTR-2B vs. purchase register) to ensure they match." },
  { term: "Revenue", definition: "Income earned from the primary business activities — selling goods or providing services. Also called sales or turnover." },
  { term: "SAC Code", definition: "Services Accounting Code — a 6-digit code starting with '99' used to classify services under GST. Similar to HSN for goods." },
  { term: "SGST", definition: "State Goods and Services Tax — the portion of GST collected by the State Government on intra-state supplies." },
  { term: "TCS (Tax Collected at Source)", definition: "Tax collected by the seller from the buyer at the time of sale for specified goods. E-commerce operators must collect TCS under GST at 1%." },
  { term: "TDS (Tax Deducted at Source)", definition: "Tax deducted by the payer before making a payment for specified services (e.g., professional fees, rent, contract payments). Rates vary by section under the Income Tax Act." },
  { term: "Trial Balance", definition: "A report listing all ledger account balances at a point in time to verify that total debits equal total credits. Used as a preliminary check before preparing financial statements." },
  { term: "Turnover", definition: "The total revenue generated by a business from its operations during a specific period, before deducting expenses. Used as a threshold for GST registration and audit requirements." },
  { term: "Working Capital", definition: "The difference between current assets and current liabilities. Measures your business's ability to meet short-term obligations. Positive working capital indicates financial health." },
];

/* Group by first letter */
const grouped = glossary.reduce<Record<string, typeof glossary>>((acc, item) => {
  const letter = item.term[0].toUpperCase();
  if (!acc[letter]) acc[letter] = [];
  acc[letter].push(item);
  return acc;
}, {});

const letters = Object.keys(grouped).sort();

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function AccountingGlossaryPage() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
        {/* Back */}
        <Link
          href="/resources"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Resources
        </Link>

        {/* Header */}
        <div className="mb-12">
          <span className="mb-4 inline-block rounded-full bg-green/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-green">
            Reference
          </span>
          <h1 className="font-heading text-4xl font-extrabold text-ink md:text-5xl">
            Accounting Glossary
          </h1>
          <p className="mt-4 text-lg text-muted">
            40+ accounting and tax terms explained in plain language for Indian
            business owners. Bookmark this page for quick reference.
          </p>
        </div>

        {/* Alphabet nav */}
        <nav className="mb-10 flex flex-wrap gap-2">
          {letters.map((letter) => (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-sm font-semibold text-ink transition hover:border-green hover:bg-green/10 hover:text-green"
            >
              {letter}
            </a>
          ))}
        </nav>

        {/* Terms */}
        <div className="space-y-12">
          {letters.map((letter) => (
            <section key={letter} id={`letter-${letter}`} className="scroll-mt-24">
              <h2 className="mb-4 font-heading text-3xl font-extrabold text-green">
                {letter}
              </h2>
              <div className="space-y-6">
                {grouped[letter].map((item) => (
                  <div key={item.term}>
                    <h3 className="font-heading text-lg font-bold text-ink">
                      {item.term}
                    </h3>
                    <p className="mt-1 text-muted leading-relaxed">
                      {item.definition}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-xl border border-green/20 bg-green/5 p-6 text-center">
          <p className="font-medium text-ink">
            Kontafy handles all these concepts automatically.{" "}
            <a
              href="https://app.kontafy.com/signup"
              className="text-green underline underline-offset-2 hover:text-green/80"
            >
              Start your free trial
            </a>{" "}
            and let the software do the accounting.
          </p>
        </div>
      </div>
    </div>
  );
}
