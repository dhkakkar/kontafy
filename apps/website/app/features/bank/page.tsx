import type { Metadata } from "next";
import FeaturePageClient from "@/components/features/FeaturePageClient";
import type { FeaturePageData } from "@/components/features/FeaturePageClient";

export const metadata: Metadata = {
  title: "Kontafy Bank — Banking & Reconciliation | Kontafy",
  description:
    "Auto bank feeds, smart reconciliation, multi-account support, transaction matching, bank statement import, and payment tracking -- all in one place.",
};

const data: FeaturePageData = {
  eyebrow: "Kontafy Bank",
  title: "Banking reconciliation made effortless",
  titleGreen: "effortless",
  subtitle: "Connect your bank accounts and reconcile in minutes, not hours.",
  heroDescription:
    "Kontafy Bank pulls transactions from your bank accounts automatically, matches them to your invoices and expenses, and keeps your books perfectly reconciled -- with minimal manual effort.",
  features: [
    {
      icon: "Landmark",
      title: "Auto Bank Feeds",
      description:
        "Connect your bank accounts securely and transactions flow into Kontafy automatically. Supports all major Indian banks including SBI, HDFC, ICICI, and more.",
    },
    {
      icon: "GitMerge",
      title: "Smart Reconciliation",
      description:
        "AI-powered matching engine reconciles bank transactions to invoices, bills, and expenses automatically. Just review and confirm.",
    },
    {
      icon: "Building2",
      title: "Multi-Account Support",
      description:
        "Manage current accounts, savings accounts, credit cards, and cash accounts from a single dashboard. See consolidated balances at a glance.",
    },
    {
      icon: "Link2",
      title: "Transaction Matching",
      description:
        "Intelligent matching rules learn from your corrections. Over time, more transactions are matched automatically with higher accuracy.",
    },
    {
      icon: "FileUp",
      title: "Bank Statement Import",
      description:
        "Upload bank statements in CSV, OFX, or PDF format. Kontafy parses and imports transactions automatically for banks without direct feeds.",
    },
    {
      icon: "Banknote",
      title: "Payment Tracking",
      description:
        "Track incoming and outgoing payments across all accounts. See which invoices are paid, which payments are pending, and where your cash is.",
    },
  ],
  workflowTitle: "Connect, match, reconcile -- done",
  workflowDescription:
    "Kontafy Bank eliminates the tedious back-and-forth between your bank statements and accounting software.",
  workflowSteps: [
    {
      step: "Step 1",
      title: "Connect your accounts",
      description:
        "Link your bank accounts securely using bank-grade encryption. Transactions start flowing in automatically within minutes.",
    },
    {
      step: "Step 2",
      title: "Auto-match transactions",
      description:
        "Kontafy matches bank transactions to invoices, bills, and recorded expenses. Most transactions are matched automatically on day one.",
    },
    {
      step: "Step 3",
      title: "Review & categorize",
      description:
        "Unmatched transactions are flagged for your review. Categorize them in one click and Kontafy learns your preferences for next time.",
    },
    {
      step: "Step 4",
      title: "Reconcile with confidence",
      description:
        "See a clear reconciliation summary showing matched, unmatched, and discrepancy items. Close your reconciliation with a single click.",
    },
  ],
  benefits: [
    {
      title: "Save hours every week",
      description:
        "Automated bank feeds and smart matching eliminate the need for manual transaction entry and spreadsheet reconciliation.",
    },
    {
      title: "Real-time cash position",
      description:
        "See your exact bank balances and cash position at any moment. Make informed financial decisions with current data.",
    },
    {
      title: "Catch errors instantly",
      description:
        "Automated reconciliation surfaces discrepancies immediately. No more discovering errors weeks after they happened.",
    },
    {
      title: "Bank-grade security",
      description:
        "Read-only bank connections with 256-bit encryption. Your banking credentials are never stored on Kontafy servers.",
    },
    {
      title: "Multi-currency accounts",
      description:
        "Handle foreign currency bank accounts with automatic exchange rate conversion and gain/loss tracking.",
    },
    {
      title: "Comprehensive audit trail",
      description:
        "Every reconciliation action is logged. See who matched what, when, and why -- perfect for audits and reviews.",
    },
  ],
  ctaTitle: "Connect your bank in 2 minutes",
  ctaDescription:
    "Link your accounts, let Kontafy match your transactions, and never manually reconcile again. Start your free trial today.",
};

export default function BankPage() {
  return <FeaturePageClient data={data} />;
}
