import type { Metadata } from "next";
import FeaturePageClient from "@/components/features/FeaturePageClient";
import type { FeaturePageData } from "@/components/features/FeaturePageClient";

export const metadata: Metadata = {
  title: "Kontafy Tax — GST & Compliance | Kontafy",
  description:
    "Auto-generate GSTR-1/3B, manage e-invoicing and e-way bills, handle TDS compliance, reconcile with GSTN, and manage HSN/SAC codes effortlessly.",
};

const data: FeaturePageData = {
  eyebrow: "Kontafy Tax",
  title: "GST compliance on autopilot",
  titleGreen: "on autopilot",
  subtitle: "File accurate GST returns without the manual grind.",
  heroDescription:
    "Kontafy Tax automatically generates your GSTR-1, GSTR-3B, and handles e-invoicing, e-way bills, TDS, and GSTN reconciliation -- so you stay compliant without hiring a compliance team.",
  features: [
    {
      icon: "FileCheck",
      title: "Auto GSTR-1/3B Generation",
      description:
        "Your GST returns are auto-populated from invoice and purchase data. Review, verify, and file directly from Kontafy. No manual data entry.",
    },
    {
      icon: "Zap",
      title: "E-Invoicing",
      description:
        "Generate IRN-compliant e-invoices with one click. Automatic integration with the government IRP portal for instant validation and QR code generation.",
    },
    {
      icon: "Truck",
      title: "E-Way Bills",
      description:
        "Create e-way bills directly from invoices. Auto-fill transporter details, vehicle numbers, and distances for hassle-free goods movement.",
    },
    {
      icon: "Shield",
      title: "TDS Compliance",
      description:
        "Track TDS deductions, generate TDS certificates, and file TDS returns. Automatic computation based on applicable sections and rates.",
    },
    {
      icon: "GitCompareArrows",
      title: "GSTN Reconciliation",
      description:
        "Match your purchase records against GSTR-2A/2B data from GSTN. Identify mismatches, missing invoices, and ITC discrepancies instantly.",
    },
    {
      icon: "Tags",
      title: "HSN/SAC Code Management",
      description:
        "Searchable HSN and SAC code database with auto-suggestions. Assign codes to products once and they flow to every invoice and return.",
    },
  ],
  workflowTitle: "From transaction to filing, fully automated",
  workflowDescription:
    "Kontafy Tax takes the manual work out of GST compliance by connecting your transactions directly to your returns.",
  workflowSteps: [
    {
      step: "Step 1",
      title: "Transact normally",
      description:
        "Create invoices, record purchases, and manage expenses as usual. Kontafy captures all GST-relevant data automatically.",
    },
    {
      step: "Step 2",
      title: "Review auto-generated returns",
      description:
        "At the end of each period, Kontafy populates your GSTR-1 and GSTR-3B with transaction data. Review the summary dashboard for accuracy.",
    },
    {
      step: "Step 3",
      title: "Reconcile with GSTN",
      description:
        "Compare your records against GSTR-2A/2B. Kontafy highlights mismatches and suggests corrections so your ITC claims are clean.",
    },
    {
      step: "Step 4",
      title: "File with confidence",
      description:
        "File your returns directly from Kontafy or export JSON for the GST portal. Every filing includes an audit trail for your records.",
    },
  ],
  benefits: [
    {
      title: "Never miss a deadline",
      description:
        "Automated reminders and pre-populated returns mean you file on time, every time. Avoid late fees and penalties.",
    },
    {
      title: "Maximize ITC claims",
      description:
        "GSTN reconciliation ensures you claim every rupee of input tax credit you are entitled to.",
    },
    {
      title: "Reduce compliance cost",
      description:
        "Automate what used to take hours of manual work. Reduce dependency on external consultants for routine filings.",
    },
    {
      title: "Audit-ready records",
      description:
        "Complete audit trail for every tax computation, filing, and reconciliation. Your CA will thank you.",
    },
    {
      title: "Multi-GSTIN support",
      description:
        "Manage multiple GSTINs from a single dashboard. Perfect for businesses operating across states.",
    },
    {
      title: "Always up to date",
      description:
        "Kontafy tracks GST rule changes and updates tax rates, thresholds, and form formats automatically.",
    },
  ],
  ctaTitle: "Simplify your GST compliance today",
  ctaDescription:
    "Stop spending hours on GST returns. Let Kontafy automate your compliance while you focus on growing your business.",
};

export default function TaxPage() {
  return <FeaturePageClient data={data} />;
}
