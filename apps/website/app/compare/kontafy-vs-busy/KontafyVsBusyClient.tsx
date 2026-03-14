"use client";

import { motion } from "motion/react";
import {
  Cloud,
  Palette,
  FileText,
  Package,
  IndianRupee,
  ShoppingCart,
  MessageSquare,
  Headphones,
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
    name: "Platform & Architecture",
    rows: [
      { feature: "Architecture", kontafy: "100% cloud-native", competitor: "Desktop-only", winner: "kontafy" },
      { feature: "Access from anywhere", kontafy: "Yes — browser, mobile, tablet", competitor: "No — desktop only", winner: "kontafy" },
      { feature: "Operating system", kontafy: "Any (browser-based)", competitor: "Windows only", winner: "kontafy" },
      { feature: "Auto updates", kontafy: "Instant, automatic", competitor: "Manual download", winner: "kontafy" },
      { feature: "Data backup", kontafy: "Automated cloud backups", competitor: "Manual local backups", winner: "kontafy" },
      { feature: "Installation required", kontafy: "No", competitor: "Yes — local install", winner: "kontafy" },
    ],
  },
  {
    name: "User Interface & Experience",
    rows: [
      { feature: "UI design", kontafy: "Modern, intuitive dashboard", competitor: "Traditional, dated interface", winner: "kontafy" },
      { feature: "Learning curve", kontafy: "Minimal — guided onboarding", competitor: "Steep — accountant-centric", winner: "kontafy" },
      { feature: "Dashboard & reports", kontafy: "Visual dashboards with charts", competitor: "Text-based reports", winner: "kontafy" },
      { feature: "Mobile app", kontafy: "Full-featured (iOS & Android)", competitor: "Not available", winner: "kontafy" },
    ],
  },
  {
    name: "GST & Tax Compliance",
    rows: [
      { feature: "GST invoicing", kontafy: "Full support", competitor: "Full support", winner: "tie" },
      { feature: "GSTR-1 / GSTR-3B filing", kontafy: "Auto-file from app", competitor: "Export & upload manually", winner: "kontafy" },
      { feature: "E-invoicing (IRN)", kontafy: "Built-in", competitor: "Built-in", winner: "tie" },
      { feature: "E-way bills", kontafy: "Built-in", competitor: "Built-in", winner: "tie" },
      { feature: "GST reconciliation", kontafy: "Automated", competitor: "Semi-automated", winner: "kontafy" },
      { feature: "TDS compliance", kontafy: "Full support", competitor: "Full support", winner: "tie" },
    ],
  },
  {
    name: "Inventory Management",
    rows: [
      { feature: "Stock tracking", kontafy: "Multi-warehouse", competitor: "Multi-location", winner: "tie" },
      { feature: "Batch & serial tracking", kontafy: "Yes", competitor: "Yes", winner: "tie" },
      { feature: "BOM / manufacturing", kontafy: "Yes", competitor: "Yes", winner: "tie" },
      { feature: "Barcode support", kontafy: "Yes", competitor: "Yes", winner: "tie" },
      { feature: "Low stock alerts", kontafy: "Smart AI alerts", competitor: "Basic alerts", winner: "kontafy" },
      { feature: "E-commerce inventory sync", kontafy: "Built-in", competitor: "Not available", winner: "kontafy" },
    ],
  },
  {
    name: "Pricing",
    rows: [
      { feature: "Free plan", kontafy: "Yes — Starter (free forever)", competitor: "No free plan", winner: "kontafy" },
      { feature: "Basic plan", kontafy: "₹4,999/year (Silver)", competitor: "₹7,500 one-time (Basic)", winner: "kontafy" },
      { feature: "Standard plan", kontafy: "₹11,999/year (Gold)", competitor: "₹15,000 one-time (Standard)", winner: "kontafy" },
      { feature: "Enterprise plan", kontafy: "₹24,999/year (Platinum)", competitor: "₹24,000 one-time (Enterprise)", winner: "tie" },
      { feature: "Cloud access included", kontafy: "Yes — all plans", competitor: "No — desktop only", winner: "kontafy" },
      { feature: "Mobile app included", kontafy: "Yes — all plans", competitor: "Not available", winner: "kontafy" },
    ],
  },
  {
    name: "E-Commerce & Integrations",
    rows: [
      { feature: "Amazon / Flipkart sync", kontafy: "Built-in", competitor: "Not available", winner: "kontafy" },
      { feature: "Shopify / WooCommerce sync", kontafy: "Built-in", competitor: "Not available", winner: "kontafy" },
      { feature: "Bank auto-reconciliation", kontafy: "Yes", competitor: "Limited", winner: "kontafy" },
      { feature: "Payment gateway integration", kontafy: "Razorpay, PayU, UPI", competitor: "Not available", winner: "kontafy" },
      { feature: "API access", kontafy: "REST API", competitor: "Not available", winner: "kontafy" },
    ],
  },
  {
    name: "WhatsApp & Communication",
    rows: [
      { feature: "WhatsApp invoicing", kontafy: "Built-in", competitor: "Not available", winner: "kontafy" },
      { feature: "WhatsApp payment reminders", kontafy: "Automated", competitor: "Not available", winner: "kontafy" },
      { feature: "Email invoicing", kontafy: "Yes", competitor: "Yes", winner: "tie" },
      { feature: "SMS alerts", kontafy: "Yes", competitor: "Limited", winner: "kontafy" },
    ],
  },
  {
    name: "Support",
    rows: [
      { feature: "Live chat support", kontafy: "Yes", competitor: "Not available", winner: "kontafy" },
      { feature: "Phone support", kontafy: "Yes", competitor: "Yes", winner: "tie" },
      { feature: "Email support", kontafy: "Yes", competitor: "Yes", winner: "tie" },
      { feature: "Free onboarding", kontafy: "Yes — with migration help", competitor: "Limited", winner: "kontafy" },
      { feature: "Video tutorials & docs", kontafy: "Comprehensive", competitor: "Basic", winner: "kontafy" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Key Advantages                                                     */
/* ------------------------------------------------------------------ */

const advantages = [
  {
    icon: Cloud,
    title: "Cloud Access vs Desktop Lock-In",
    description:
      "Busy ties you to a single Windows PC. Kontafy lets you access your accounts from any device, anywhere — your office, home, or while travelling.",
  },
  {
    icon: Palette,
    title: "Modern, Intuitive Interface",
    description:
      "Busy's interface was designed decades ago. Kontafy features a modern dashboard with visual reports, guided workflows, and a design your team will actually enjoy using.",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp Billing",
    description:
      "Send invoices, payment reminders, and receipts directly via WhatsApp. Busy has no WhatsApp integration at all.",
  },
  {
    icon: ShoppingCart,
    title: "E-Commerce Sync",
    description:
      "Auto-sync orders and inventory from Amazon, Flipkart, Shopify, and WooCommerce. Busy offers zero marketplace integration.",
  },
  {
    icon: IndianRupee,
    title: "Start Free, Scale Affordably",
    description:
      "Kontafy's free Starter plan gives you more than Busy's paid Basic plan. As you grow, Kontafy remains more affordable with cloud access included.",
  },
  {
    icon: Headphones,
    title: "Superior Support",
    description:
      "Live chat, phone, email, free onboarding, and a dedicated migration team. Busy support is limited to email and phone during business hours.",
  },
];

/* ------------------------------------------------------------------ */
/*  Migration Steps                                                    */
/* ------------------------------------------------------------------ */

const migrationSteps = [
  {
    step: "1",
    title: "Export from Busy",
    description:
      "Export your Busy data (chart of accounts, vouchers, stock items, party masters) using Busy's export utility or our free migration tool.",
  },
  {
    step: "2",
    title: "Upload to Kontafy",
    description:
      "Upload the exported files into Kontafy. Our smart importer auto-maps fields and validates data integrity.",
  },
  {
    step: "3",
    title: "Review & Reconcile",
    description:
      "Review imported data with our side-by-side comparison. Our team helps verify opening balances and transaction history.",
  },
  {
    step: "4",
    title: "Go Live",
    description:
      "Start using Kontafy right away. Free onboarding training for your team, with dedicated support for the first 30 days.",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function StatusIcon({ status }: { status: string }) {
  if (status === "Yes" || status === "Built-in" || status === "Full support" || status === "Automated") {
    return <Check className="inline h-4 w-4 text-green" />;
  }
  if (status === "Not available" || status === "No free plan" || status === "No" || status === "No — desktop only") {
    return <X className="inline h-4 w-4 text-red-500" />;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function KontafyVsBusyClient() {
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
                <span className="text-green">Busy Accounting</span>
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-muted">
                Busy Accounting is a popular desktop-based accounting software in
                India. But its dated interface, desktop-only access, and lack of
                modern features are holding businesses back. See how Kontafy
                delivers a modern, cloud-first experience with WhatsApp billing,
                e-commerce sync, and AI insights.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <CTAButton variant="primary" size="lg" href="/signup">
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
              { value: "100%", label: "Cloud-native" },
              { value: "Free", label: "Starting price" },
              { value: "WhatsApp", label: "Invoice delivery" },
              { value: "AI", label: "Built-in insights" },
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
            description="A transparent comparison across every category — no marketing spin."
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
                          Busy
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
            title="Why Businesses Switch from Busy to Kontafy"
            greenText="Kontafy"
            description="From a dated desktop tool to a modern cloud platform — here is what you gain."
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
            title="Switch from Busy in 4 Simple Steps"
            greenText="4 Simple Steps"
            description="We handle the heavy lifting. Your data stays safe throughout the process."
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
              Ready to Upgrade from Busy?
            </h2>
            <p className="mt-4 text-lg text-white/70">
              Move from a dated desktop tool to a modern cloud platform. Start
              free — no credit card, no commitment, no installation.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <CTAButton variant="primary" size="lg" href="/signup">
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
