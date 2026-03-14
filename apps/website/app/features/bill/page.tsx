import type { Metadata } from "next";
import FeaturePageClient from "@/components/features/FeaturePageClient";
import type { FeaturePageData } from "@/components/features/FeaturePageClient";

export const metadata: Metadata = {
  title: "Kontafy Bill — Invoicing | Kontafy",
  description:
    "Create GST-compliant invoices, deliver via WhatsApp, accept payments with UPI/card links, set up recurring invoices, and manage e-invoicing.",
};

const data: FeaturePageData = {
  eyebrow: "Kontafy Bill",
  title: "Invoicing that gets you paid faster",
  titleGreen: "paid faster",
  subtitle: "Professional, GST-compliant invoices in under 30 seconds.",
  heroDescription:
    "From creating beautiful invoices to delivering them via WhatsApp and collecting payments through UPI links, Kontafy Bill handles the entire invoicing lifecycle so you can focus on your business.",
  features: [
    {
      icon: "FileText",
      title: "GST-Compliant Invoices",
      description:
        "Auto-calculate CGST, SGST, and IGST. Generate invoices that meet all GST compliance requirements with correct HSN/SAC codes and tax breakdowns.",
    },
    {
      icon: "MessageCircle",
      title: "WhatsApp Delivery",
      description:
        "Send invoices directly to your customers on WhatsApp with a single click. Higher open rates mean faster payments.",
    },
    {
      icon: "CreditCard",
      title: "Payment Links (UPI & Cards)",
      description:
        "Embed UPI and card payment links right inside your invoices. Customers pay in two taps, and you get notified instantly.",
    },
    {
      icon: "RefreshCw",
      title: "Recurring Invoices",
      description:
        "Set up automatic recurring invoices for retainer clients or subscriptions. Define frequency, amounts, and let Kontafy handle the rest.",
    },
    {
      icon: "Palette",
      title: "Custom Templates",
      description:
        "Choose from professionally designed templates or create your own. Add your logo, brand colors, terms, and custom fields.",
    },
    {
      icon: "Zap",
      title: "E-Invoicing",
      description:
        "Generate IRN-compliant e-invoices directly from Kontafy. Seamlessly integrate with the government IRP portal for instant validation.",
    },
  ],
  workflowTitle: "Invoice to payment in minutes, not days",
  workflowDescription:
    "Kontafy Bill streamlines every step from creation to collection, so you spend less time chasing payments.",
  workflowSteps: [
    {
      step: "Step 1",
      title: "Create your invoice",
      description:
        "Select a customer, add line items, and Kontafy auto-fills GST rates, HSN codes, and calculates taxes. Done in under 30 seconds.",
    },
    {
      step: "Step 2",
      title: "Deliver instantly",
      description:
        "Send via WhatsApp, email, or generate a shareable link. Your customer receives a professional invoice with an embedded payment button.",
    },
    {
      step: "Step 3",
      title: "Collect payment",
      description:
        "Customers pay via UPI, cards, or bank transfer. Payments are automatically matched to invoices and reflected in your books.",
    },
    {
      step: "Step 4",
      title: "Track & follow up",
      description:
        "See paid, pending, and overdue invoices at a glance. Set up automatic payment reminders so you never have to chase manually.",
    },
  ],
  benefits: [
    {
      title: "Get paid 2x faster",
      description:
        "WhatsApp delivery plus embedded payment links means customers see and pay your invoices faster than ever.",
    },
    {
      title: "100% GST compliant",
      description:
        "Every invoice meets GST regulations automatically. No manual tax calculations or compliance worries.",
    },
    {
      title: "Professional brand image",
      description:
        "Custom templates with your logo and colors make every invoice a reflection of your brand's professionalism.",
    },
    {
      title: "Zero manual reconciliation",
      description:
        "Payments are auto-matched to invoices. Your books, tax reports, and dashboards update in real time.",
    },
    {
      title: "Recurring revenue automation",
      description:
        "Set up recurring invoices once and never worry about monthly billing again. Perfect for SaaS and service businesses.",
    },
    {
      title: "E-invoicing made simple",
      description:
        "One-click e-invoice generation with IRP integration. No separate portal, no manual JSON uploads.",
    },
  ],
  ctaTitle: "Send your first invoice in 30 seconds",
  ctaDescription:
    "Create professional, GST-compliant invoices and start collecting payments faster. Free to start, no credit card required.",
};

export default function BillPage() {
  return <FeaturePageClient data={data} />;
}
