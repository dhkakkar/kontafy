import type { Metadata } from "next";
import FeaturePageClient from "@/components/features/FeaturePageClient";
import type { FeaturePageData } from "@/components/features/FeaturePageClient";

export const metadata: Metadata = {
  title: "Kontafy Books — Accounting | Kontafy",
  description:
    "Double-entry bookkeeping with smart categorization, journal entries, ledgers, trial balance, multi-currency support, and a fully customizable chart of accounts.",
};

const data: FeaturePageData = {
  eyebrow: "Kontafy Books",
  title: "Accounting made effortless",
  titleGreen: "effortless",
  subtitle: "Double-entry bookkeeping that actually works for Indian businesses.",
  heroDescription:
    "From journal entries and ledgers to trial balance and multi-currency support, Kontafy Books gives you a complete, compliant accounting system without the complexity.",
  features: [
    {
      icon: "BookOpen",
      title: "Double-Entry Bookkeeping",
      description:
        "Every transaction is automatically recorded with matching debits and credits. Your books stay balanced without manual effort.",
    },
    {
      icon: "Layers",
      title: "Smart Categorization",
      description:
        "AI-powered categorization learns from your patterns and automatically classifies transactions into the right accounts.",
    },
    {
      icon: "FileSpreadsheet",
      title: "Journal Entries & Ledgers",
      description:
        "Create manual or automated journal entries. View detailed ledger reports for any account, any period, with drill-down capability.",
    },
    {
      icon: "BarChart3",
      title: "Trial Balance",
      description:
        "Generate accurate trial balance reports instantly. Spot discrepancies early and ensure your books close cleanly every month.",
    },
    {
      icon: "Globe",
      title: "Multi-Currency Support",
      description:
        "Handle transactions in any currency with automatic exchange rate updates. Perfect for businesses with international clients or suppliers.",
    },
    {
      icon: "ListTree",
      title: "Chart of Accounts",
      description:
        "Start with an Indian-business-ready default chart or fully customize it. Add, merge, or restructure accounts as your business evolves.",
    },
  ],
  workflowTitle: "From transaction to insight in seconds",
  workflowDescription:
    "Kontafy Books automates the heavy lifting so you can focus on growing your business instead of reconciling spreadsheets.",
  workflowSteps: [
    {
      step: "Step 1",
      title: "Record transactions",
      description:
        "Enter transactions manually or let them flow in automatically from your bank feeds, invoices, and payments. Every entry is double-entry by default.",
    },
    {
      step: "Step 2",
      title: "Auto-categorize & classify",
      description:
        "Our AI engine learns your patterns and categorizes transactions into the correct accounts. Review and approve with a single click.",
    },
    {
      step: "Step 3",
      title: "Generate reports",
      description:
        "Pull trial balance, P&L, balance sheet, and ledger reports at any time. Filter by date, account, or project for the exact view you need.",
    },
    {
      step: "Step 4",
      title: "Close & comply",
      description:
        "Close your books monthly with confidence. All data flows directly into your GST returns and tax reports, ensuring compliance without extra work.",
    },
  ],
  benefits: [
    {
      title: "Save 10+ hours per month",
      description:
        "Automated categorization and bank feed integration eliminate manual data entry and reduce errors.",
    },
    {
      title: "Always audit-ready",
      description:
        "Complete audit trail for every transaction. Your CA can access reports directly through the collaboration portal.",
    },
    {
      title: "Real-time financial visibility",
      description:
        "Know your exact financial position at any moment. No waiting for month-end to see where your business stands.",
    },
    {
      title: "Indian accounting standards",
      description:
        "Built for Indian businesses from day one. Supports Indian GAAP, GST-ready chart of accounts, and INR-first workflows.",
    },
    {
      title: "Seamless module integration",
      description:
        "Every invoice, payment, and inventory movement automatically updates your books. Zero manual reconciliation.",
    },
    {
      title: "Multi-branch support",
      description:
        "Manage accounting for multiple branches or business units from a single dashboard with consolidated reporting.",
    },
  ],
  ctaTitle: "Start keeping perfect books today",
  ctaDescription:
    "Set up Kontafy Books in minutes. Import your existing data from Tally, Zoho, or spreadsheets -- our team handles the migration for free.",
};

export default function BooksPage() {
  return <FeaturePageClient data={data} />;
}
