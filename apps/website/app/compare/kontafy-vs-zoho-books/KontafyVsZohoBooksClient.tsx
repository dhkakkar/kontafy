"use client";

import { motion } from "motion/react";
import {
  Globe,
  FileText,
  MessageSquare,
  IndianRupee,
  Package,
  ShoppingCart,
  Wallet,
  Brain,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SectionHeading from "@/components/shared/SectionHeading";
import CTAButton from "@/components/shared/CTAButton";

/* ------------------------------------------------------------------ */
/*  Comparison Table Data                                              */
/* ------------------------------------------------------------------ */

interface ComparisonRow {
  feature: string;
  kontafy: string;
  competitor: string;
  winner: "kontafy" | "competitor" | "tie";
}

interface ComparisonCategory {
  name: string;
  rows: ComparisonRow[];
}

const comparisonData: ComparisonCategory[] = [
  {
    name: "India Focus",
    rows: [
      { feature: "Built for India", kontafy: "India-first — designed ground-up", competitor: "Global product adapted for India", winner: "kontafy" },
      { feature: "Indian language support", kontafy: "Hindi, Tamil, Telugu, and more", competitor: "Limited Indian languages", winner: "kontafy" },
      { feature: "Indian payment methods", kontafy: "UPI, Razorpay, PayU, NEFT/RTGS", competitor: "Limited (Razorpay only)", winner: "kontafy" },
      { feature: "Indian chart of accounts", kontafy: "Pre-built for Indian businesses", competitor: "Generic templates", winner: "kontafy" },
    ],
  },
  {
    name: "GST & Tax Compliance",
    rows: [
      { feature: "GST invoicing", kontafy: "Full support", competitor: "Full support", winner: "tie" },
      { feature: "GSTR-1 / GSTR-3B auto-filing", kontafy: "Auto-file from app", competitor: "Export & manual upload", winner: "kontafy" },
      { feature: "E-invoicing (IRN)", kontafy: "Built-in, one-click", competitor: "Available (add-on workflow)", winner: "kontafy" },
      { feature: "E-way bills", kontafy: "Built-in", competitor: "Built-in", winner: "tie" },
      { feature: "GST reconciliation", kontafy: "Automated with GSTN", competitor: "Semi-automated", winner: "kontafy" },
      { feature: "TDS compliance", kontafy: "Full support", competitor: "Full support", winner: "tie" },
      { feature: "Input tax credit matching", kontafy: "Automated", competitor: "Manual", winner: "kontafy" },
    ],
  },
  {
    name: "WhatsApp & Communication",
    rows: [
      { feature: "WhatsApp invoicing", kontafy: "Built-in", competitor: "Not available", winner: "kontafy" },
      { feature: "WhatsApp payment reminders", kontafy: "Automated", competitor: "Not available", winner: "kontafy" },
      { feature: "WhatsApp receipts", kontafy: "Automated", competitor: "Not available", winner: "kontafy" },
      { feature: "Email invoicing", kontafy: "Yes", competitor: "Yes", winner: "tie" },
      { feature: "Customer portal", kontafy: "Yes", competitor: "Yes", winner: "tie" },
    ],
  },
  {
    name: "Pricing",
    rows: [
      { feature: "Free plan", kontafy: "Yes — Starter (free forever)", competitor: "Yes — Free (limited to 1,000 invoices/yr)", winner: "kontafy" },
      { feature: "Standard plan", kontafy: "₹4,999/year (Silver)", competitor: "₹11,999/year (Standard)", winner: "kontafy" },
      { feature: "Professional plan", kontafy: "₹11,999/year (Gold)", competitor: "₹23,999/year (Professional)", winner: "kontafy" },
      { feature: "Users included", kontafy: "Generous per plan", competitor: "Limited — per-user pricing", winner: "kontafy" },
      { feature: "WhatsApp billing included", kontafy: "Yes — all paid plans", competitor: "Not available", winner: "kontafy" },
      { feature: "E-commerce sync included", kontafy: "Yes — Gold and above", competitor: "Limited (Shopify only)", winner: "kontafy" },
    ],
  },
  {
    name: "Inventory Management",
    rows: [
      { feature: "Stock tracking", kontafy: "Multi-warehouse", competitor: "Single warehouse", winner: "kontafy" },
      { feature: "Batch & serial tracking", kontafy: "Yes", competitor: "Yes", winner: "tie" },
      { feature: "Low stock alerts", kontafy: "AI-powered smart alerts", competitor: "Basic threshold alerts", winner: "kontafy" },
      { feature: "Composite items / BOM", kontafy: "Yes", competitor: "Yes", winner: "tie" },
      { feature: "Barcode support", kontafy: "Yes", competitor: "Yes", winner: "tie" },
    ],
  },
  {
    name: "E-Commerce Integrations",
    rows: [
      { feature: "Amazon sync", kontafy: "Built-in", competitor: "Not available", winner: "kontafy" },
      { feature: "Flipkart sync", kontafy: "Built-in", competitor: "Not available", winner: "kontafy" },
      { feature: "Shopify sync", kontafy: "Built-in", competitor: "Yes (limited)", winner: "kontafy" },
      { feature: "WooCommerce sync", kontafy: "Built-in", competitor: "Not available", winner: "kontafy" },
      { feature: "Auto order → invoice", kontafy: "Yes", competitor: "Limited", winner: "kontafy" },
    ],
  },
  {
    name: "Payroll",
    rows: [
      { feature: "Payroll processing", kontafy: "Built-in (Platinum+)", competitor: "Separate product (Zoho Payroll)", winner: "kontafy" },
      { feature: "PF / ESI / TDS", kontafy: "Built-in", competitor: "Zoho Payroll (separate subscription)", winner: "kontafy" },
      { feature: "Salary slip generation", kontafy: "Built-in", competitor: "Zoho Payroll (separate subscription)", winner: "kontafy" },
      { feature: "Payroll cost", kontafy: "Included in plan", competitor: "₹4,999/yr additional", winner: "kontafy" },
    ],
  },
  {
    name: "AI & Advanced Features",
    rows: [
      { feature: "AI cash flow forecasting", kontafy: "Yes — 30+ day predictions", competitor: "Limited", winner: "kontafy" },
      { feature: "AI expense categorisation", kontafy: "Yes", competitor: "Basic auto-categorisation", winner: "kontafy" },
      { feature: "Smart alerts", kontafy: "Proactive, AI-driven", competitor: "Rule-based only", winner: "kontafy" },
      { feature: "Custom reports", kontafy: "Advanced with AI summaries", competitor: "Good — custom reports", winner: "kontafy" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Key Advantages                                                     */
/* ------------------------------------------------------------------ */

const advantages = [
  {
    icon: Globe,
    title: "India-First, Not India-Adapted",
    description:
      "Zoho Books was built for global markets and adapted for India. Kontafy was designed ground-up for Indian businesses, with Indian tax laws, payment methods, and business practices at its core.",
  },
  {
    icon: FileText,
    title: "Deeper GST Integration",
    description:
      "Auto-file GSTR-1 and GSTR-3B directly from the app. One-click e-invoicing. Automated input tax credit matching with GSTN. Zoho requires manual exports and separate workflows.",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp Billing",
    description:
      "Send invoices, reminders, and receipts on WhatsApp — the platform 500M+ Indians use daily. Zoho Books has no WhatsApp integration whatsoever.",
  },
  {
    icon: IndianRupee,
    title: "Better Value at Every Tier",
    description:
      "Kontafy Silver (₹4,999/yr) gives you what Zoho Standard (₹11,999/yr) does — plus WhatsApp billing. That's 58% savings with more features.",
  },
  {
    icon: Wallet,
    title: "Built-In Payroll",
    description:
      "Payroll is built into Kontafy's Platinum plan. With Zoho, you need a separate Zoho Payroll subscription — adding cost and complexity.",
  },
  {
    icon: Brain,
    title: "Smarter AI Insights",
    description:
      "Kontafy's AI provides cash flow forecasting, expense categorisation, and proactive alerts. Zoho Books offers basic auto-categorisation but lacks predictive intelligence.",
  },
];

/* ------------------------------------------------------------------ */
/*  Migration Steps                                                    */
/* ------------------------------------------------------------------ */

const migrationSteps = [
  {
    step: "1",
    title: "Export from Zoho Books",
    description:
      "Export your data from Zoho Books in CSV/Excel format — contacts, invoices, chart of accounts, transactions, and inventory.",
  },
  {
    step: "2",
    title: "Import into Kontafy",
    description:
      "Upload the files into Kontafy. Our smart importer recognises Zoho's format and maps fields automatically.",
  },
  {
    step: "3",
    title: "Verify & Reconcile",
    description:
      "Review imported data side-by-side. Our team helps verify opening balances, outstanding invoices, and inventory counts.",
  },
  {
    step: "4",
    title: "Go Live",
    description:
      "Start using Kontafy immediately. Your Zoho workflows translate seamlessly since both are cloud-based — minimal learning curve.",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function StatusIcon({ status }: { status: string }) {
  if (status === "Yes" || status === "Built-in" || status === "Full support" || status === "Automated") {
    return <Check className="inline h-4 w-4 text-green" />;
  }
  if (status === "Not available" || status === "No" || status === "Manual") {
    return <X className="inline h-4 w-4 text-red-500" />;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function KontafyVsZohoBooksClient() {
  return (
    <>
      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-surface to-white py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="mb-4 inline-block rounded-full bg-green/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-green">
                Compare
              </span>
              <h1 className="font-heading text-4xl font-extrabold leading-tight text-ink md:text-5xl lg:text-6xl">
                Kontafy vs{" "}
                <span className="text-green">Zoho Books</span>
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-muted">
                Both Kontafy and Zoho Books are cloud accounting platforms. But
                Kontafy is built India-first with deeper GST integration,
                WhatsApp billing, built-in payroll, and better pricing — while
                Zoho is a global tool adapted for the Indian market.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <CTAButton variant="primary" size="lg" href="https://app.kontafy.com/signup">
                  Try Kontafy Free
                </CTAButton>
                <CTAButton variant="ghost" size="lg" href="/demo">
                  Book a Demo
                </CTAButton>
              </div>
            </motion.div>
          </div>

          {/* Quick stats */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mt-16 grid max-w-4xl grid-cols-2 gap-6 md:grid-cols-4"
          >
            {[
              { value: "58%", label: "More affordable" },
              { value: "India", label: "Built India-first" },
              { value: "WhatsApp", label: "Billing included" },
              { value: "Built-In", label: "Payroll included" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-border bg-white p-6 text-center"
              >
                <div className="font-heading text-3xl font-extrabold text-green">
                  {s.value}
                </div>
                <div className="mt-1 text-sm text-muted">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ---- Feature Comparison Table ---- */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Feature Comparison"
            title="Feature-by-Feature Breakdown"
            greenText="Feature-by-Feature"
            description="Two cloud platforms, very different approaches. Here is how they compare."
            centered
          />

          <div className="mt-16 space-y-12">
            {comparisonData.map((category, ci) => (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: ci * 0.05 }}
              >
                <h3 className="mb-4 font-heading text-xl font-bold text-ink">
                  {category.name}
                </h3>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="bg-surface">
                        <th className="px-6 py-4 font-semibold text-muted">
                          Feature
                        </th>
                        <th className="px-6 py-4 font-semibold text-green">
                          Kontafy
                        </th>
                        <th className="px-6 py-4 font-semibold text-muted">
                          Zoho Books
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.rows.map((row, ri) => (
                        <tr
                          key={row.feature}
                          className={cn(
                            "border-t border-border",
                            ri % 2 === 0 ? "bg-white" : "bg-surface/50",
                          )}
                        >
                          <td className="px-6 py-4 font-medium text-ink">
                            {row.feature}
                          </td>
                          <td className="px-6 py-4 text-ink">
                            <StatusIcon status={row.kontafy} />{" "}
                            {row.kontafy}
                          </td>
                          <td className="px-6 py-4 text-muted">
                            <StatusIcon status={row.competitor} />{" "}
                            {row.competitor}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Key Advantages ---- */}
      <section className="bg-surface py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Why Switch"
            title="Why Indian Businesses Choose Kontafy Over Zoho Books"
            greenText="Kontafy"
            description="Both are cloud platforms — but only one was built India-first."
            centered
          />

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {advantages.map((a, i) => (
              <motion.div
                key={a.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-xl border border-border bg-white p-8"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green/10">
                  <a.icon className="h-6 w-6 text-green" />
                </div>
                <h4 className="mt-4 font-heading text-lg font-bold text-ink">
                  {a.title}
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {a.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Migration ---- */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Migration"
            title="Switch from Zoho Books in 4 Easy Steps"
            greenText="4 Easy Steps"
            description="Cloud-to-cloud migration is the easiest kind. We handle it for you."
            centered
          />

          <div className="mx-auto mt-16 grid max-w-4xl gap-8 md:grid-cols-2">
            {migrationSteps.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="relative rounded-xl border border-border bg-white p-8"
              >
                <div className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full bg-green text-sm font-bold text-white">
                  {s.step}
                </div>
                <h4 className="mt-2 font-heading text-lg font-bold text-ink">
                  {s.title}
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {s.description}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-10 text-center text-muted"
          >
            Need help migrating?{" "}
            <a href="/contact" className="font-semibold text-green underline">
              Contact our migration team
            </a>{" "}
            — it&apos;s free.
          </motion.p>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="bg-navy py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-heading text-3xl font-extrabold text-white md:text-4xl">
              Ready to Choose India-First Accounting?
            </h2>
            <p className="mt-4 text-lg text-white/70">
              Get deeper GST integration, WhatsApp billing, and built-in payroll
              — at a better price. Start free today.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <CTAButton variant="primary" size="lg" href="https://app.kontafy.com/signup">
                Start Free Trial
              </CTAButton>
              <CTAButton
                variant="ghost"
                size="lg"
                href="/demo"
                className="border-white/30 text-white hover:bg-white/10"
              >
                Book a Demo
              </CTAButton>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
