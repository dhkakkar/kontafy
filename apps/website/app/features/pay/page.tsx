import type { Metadata } from "next";
import FeaturePageClient from "@/components/features/FeaturePageClient";
import type { FeaturePageData } from "@/components/features/FeaturePageClient";

export const metadata: Metadata = {
  title: "Kontafy Pay — Payments | Kontafy",
  description:
    "Accept UPI payments, generate payment links, auto-match collections, send payment reminders, support multi-mode payments, and track settlements.",
};

const data: FeaturePageData = {
  eyebrow: "Kontafy Pay",
  title: "Collect payments without the chase",
  titleGreen: "without the chase",
  subtitle: "UPI, cards, net banking -- accept payments your way.",
  heroDescription:
    "Kontafy Pay makes it effortless to collect money from customers. Generate payment links, accept UPI, auto-match payments to invoices, and track settlements -- all from one unified payments hub.",
  features: [
    {
      icon: "Smartphone",
      title: "UPI Collection",
      description:
        "Accept payments via UPI with dynamic QR codes and VPAs. Customers scan and pay in seconds. Instant confirmation and receipt generation.",
    },
    {
      icon: "Link2",
      title: "Payment Links",
      description:
        "Generate shareable payment links for any amount. Send via WhatsApp, SMS, or email. Customers pay via their preferred method -- UPI, card, or net banking.",
    },
    {
      icon: "GitMerge",
      title: "Auto-Matching",
      description:
        "Incoming payments are automatically matched to the correct invoices. Your books stay updated without any manual reconciliation work.",
    },
    {
      icon: "Bell",
      title: "Payment Reminders",
      description:
        "Set up automated payment reminders via WhatsApp and email. Customize the timing and message for gentle, firm, and final reminders.",
    },
    {
      icon: "Wallet",
      title: "Multi-Mode Payments",
      description:
        "Accept UPI, credit cards, debit cards, net banking, wallets, and EMI options. Give customers the flexibility to pay however they prefer.",
    },
    {
      icon: "BarChart3",
      title: "Settlement Tracking",
      description:
        "Track every settlement from payment gateway to bank account. See pending settlements, processing fees, and net receivables at a glance.",
    },
  ],
  workflowTitle: "Send, collect, reconcile -- automatically",
  workflowDescription:
    "Kontafy Pay closes the loop between invoicing and cash collection, making your accounts receivable process fully automated.",
  workflowSteps: [
    {
      step: "Step 1",
      title: "Generate payment request",
      description:
        "Create a payment link from an invoice or generate a standalone link for any amount. Embed it in WhatsApp messages, emails, or SMS.",
    },
    {
      step: "Step 2",
      title: "Customer pays instantly",
      description:
        "Customers click the link and pay via UPI, card, or net banking. No app download required. Payment is confirmed in real time.",
    },
    {
      step: "Step 3",
      title: "Auto-match to invoice",
      description:
        "Kontafy automatically matches the payment to the corresponding invoice. Your books update instantly -- paid, partial, or advance payment.",
    },
    {
      step: "Step 4",
      title: "Track & settle",
      description:
        "Monitor settlement status, processing fees, and net deposits. Get a clear view of your receivables pipeline.",
    },
  ],
  benefits: [
    {
      title: "Reduce payment delays",
      description:
        "Payment links with one-click UPI reduce friction for customers, getting you paid faster than traditional methods.",
    },
    {
      title: "Eliminate manual matching",
      description:
        "Auto-matching saves hours of manual work matching bank credits to invoices. Zero reconciliation effort.",
    },
    {
      title: "Professional collection process",
      description:
        "Automated reminders replace awkward phone calls. Maintain customer relationships while ensuring timely collections.",
    },
    {
      title: "Complete payment visibility",
      description:
        "See all payment activity across channels in one dashboard. Know exactly who has paid, who has not, and what is in transit.",
    },
    {
      title: "Lower transaction costs",
      description:
        "UPI payments have zero or minimal transaction fees compared to cards. Save thousands in payment processing costs.",
    },
    {
      title: "Secure & compliant",
      description:
        "PCI DSS compliant payment processing. All transactions are encrypted and your customers' payment data is never stored.",
    },
  ],
  ctaTitle: "Start collecting payments effortlessly",
  ctaDescription:
    "Generate your first payment link in seconds. Accept UPI, cards, and more with zero setup fees. Start free today.",
};

export default function PayPage() {
  return <FeaturePageClient data={data} />;
}
