"use client";

import { motion } from "motion/react";
import {
  Cloud,
  FileText,
  MessageSquare,
  Users,
  IndianRupee,
  ShoppingCart,
  Brain,
  Smartphone,
  Check,
  X,
  ArrowRight,
  ArrowDownToLine,
  Minus,
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
    name: "Platform & Access",
    rows: [
      { feature: "Architecture", kontafy: "100% cloud-native", competitor: "Desktop-first (TallyPrime)", winner: "kontafy" },
      { feature: "Access from anywhere", kontafy: "Yes — browser, mobile, tablet", competitor: "Limited (Tally on the Go is basic)", winner: "kontafy" },
      { feature: "Multi-device access", kontafy: "Unlimited devices", competitor: "One licence per device", winner: "kontafy" },
      { feature: "Auto updates", kontafy: "Instant, automatic", competitor: "Manual download & install", winner: "kontafy" },
      { feature: "Data backup", kontafy: "Automated cloud backups", competitor: "Manual local backups", winner: "kontafy" },
      { feature: "Operating system", kontafy: "Any (browser-based)", competitor: "Windows only", winner: "kontafy" },
    ],
  },
  {
    name: "GST & Tax Compliance",
    rows: [
      { feature: "GST invoicing", kontafy: "Full support", competitor: "Full support", winner: "tie" },
      { feature: "GSTR-1 / GSTR-3B filing", kontafy: "Auto-file from app", competitor: "Export & upload manually", winner: "kontafy" },
      { feature: "E-invoicing (IRN)", kontafy: "Built-in", competitor: "Built-in", winner: "tie" },
      { feature: "E-way bills", kontafy: "Built-in", competitor: "Built-in", winner: "tie" },
      { feature: "GST reconciliation", kontafy: "Automated matching", competitor: "Manual matching", winner: "kontafy" },
      { feature: "TDS compliance", kontafy: "Full support", competitor: "Full support", winner: "tie" },
    ],
  },
  {
    name: "Invoicing & Billing",
    rows: [
      { feature: "Invoice creation", kontafy: "Yes", competitor: "Yes", winner: "tie" },
      { feature: "WhatsApp invoicing", kontafy: "Built-in", competitor: "Not available", winner: "kontafy" },
      { feature: "Payment links (UPI / gateway)", kontafy: "Embedded in invoices", competitor: "Not available", winner: "kontafy" },
      { feature: "Recurring invoices", kontafy: "Yes", competitor: "Limited", winner: "kontafy" },
      { feature: "Custom templates", kontafy: "Unlimited", competitor: "Limited customisation", winner: "kontafy" },
      { feature: "Multi-currency invoicing", kontafy: "Yes", competitor: "Yes", winner: "tie" },
    ],
  },
  {
    name: "Multi-User & Collaboration",
    rows: [
      { feature: "Multi-user access", kontafy: "Cloud-based, any location", competitor: "LAN only (same network)", winner: "kontafy" },
      { feature: "Role-based permissions", kontafy: "Granular roles & access", competitor: "Basic user management", winner: "kontafy" },
      { feature: "Audit trail", kontafy: "Full activity log", competitor: "Basic log", winner: "kontafy" },
      { feature: "Real-time collaboration", kontafy: "Yes", competitor: "No (file-locking)", winner: "kontafy" },
    ],
  },
  {
    name: "Pricing",
    rows: [
      { feature: "Free plan", kontafy: "Yes — Starter (free forever)", competitor: "No free plan", winner: "kontafy" },
      { feature: "Entry-level paid plan", kontafy: "₹4,999/year (Silver)", competitor: "₹18,000/year (Silver)", winner: "kontafy" },
      { feature: "Premium plan", kontafy: "₹11,999/year (Gold)", competitor: "₹54,000/year (Gold)", winner: "kontafy" },
      { feature: "Per-device fees", kontafy: "No — unlimited devices", competitor: "Yes — one licence per device", winner: "kontafy" },
      { feature: "Hidden charges", kontafy: "None", competitor: "Add-ons for cloud, multi-user", winner: "kontafy" },
    ],
  },
  {
    name: "E-Commerce & Integrations",
    rows: [
      { feature: "Amazon / Flipkart sync", kontafy: "Built-in", competitor: "Not available", winner: "kontafy" },
      { feature: "Shopify / WooCommerce sync", kontafy: "Built-in", competitor: "Not available", winner: "kontafy" },
      { feature: "Bank auto-reconciliation", kontafy: "Yes", competitor: "Limited", winner: "kontafy" },
      { feature: "API for custom integrations", kontafy: "REST API", competitor: "TDL (complex scripting)", winner: "kontafy" },
    ],
  },
  {
    name: "AI & Advanced Features",
    rows: [
      { feature: "AI cash flow forecasting", kontafy: "Yes", competitor: "Not available", winner: "kontafy" },
      { feature: "AI expense categorisation", kontafy: "Yes", competitor: "Not available", winner: "kontafy" },
      { feature: "Smart alerts & reminders", kontafy: "Yes", competitor: "Basic reminders", winner: "kontafy" },
      { feature: "Mobile app", kontafy: "Full-featured (iOS & Android)", competitor: "Tally on the Go (limited)", winner: "kontafy" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Key Advantages                                                     */
/* ------------------------------------------------------------------ */

const advantages = [
  {
    icon: Cloud,
    title: "Cloud-Native from Day One",
    description:
      "Tally was designed for desktops in the 1990s. Kontafy was built for the cloud era — access your books from any device, any location, with real-time sync.",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp Billing",
    description:
      "Send GST invoices, payment reminders, and receipts directly on WhatsApp. Your customers respond faster because it is the app they already live on.",
  },
  {
    icon: IndianRupee,
    title: "Save Up to 78% on Costs",
    description:
      "Tally Gold costs ₹54,000/year per device. Kontafy Gold is ₹11,999/year with unlimited devices. That's real money back in your business.",
  },
  {
    icon: ShoppingCart,
    title: "E-Commerce Ready",
    description:
      "Auto-sync orders and inventory from Amazon, Flipkart, Shopify, and WooCommerce. Tally has no marketplace integration whatsoever.",
  },
  {
    icon: Brain,
    title: "AI-Powered Insights",
    description:
      "Get cash flow forecasts, smart expense categorisation, and predictive alerts. Tally gives you data; Kontafy gives you intelligence.",
  },
  {
    icon: Smartphone,
    title: "True Mobile Experience",
    description:
      "Full-featured mobile app for iOS and Android. Create invoices, check reports, manage inventory — everything, on the go. Tally on the Go is severely limited.",
  },
];

/* ------------------------------------------------------------------ */
/*  Migration Steps                                                    */
/* ------------------------------------------------------------------ */

const migrationSteps = [
  {
    step: "1",
    title: "Export from Tally",
    description:
      "Export your Tally data (ledgers, vouchers, stock items) using Tally's built-in export or our free migration tool.",
  },
  {
    step: "2",
    title: "Upload to Kontafy",
    description:
      "Upload the exported files into Kontafy. Our smart importer maps fields automatically — no manual data entry.",
  },
  {
    step: "3",
    title: "Review & Verify",
    description:
      "Review the imported data with our side-by-side comparison view. Our team validates balances and transactions with you.",
  },
  {
    step: "4",
    title: "Go Live",
    description:
      "Start using Kontafy immediately. Your team can be up and running in under a day. We provide free onboarding support.",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function StatusIcon({ status }: { status: string }) {
  if (status === "Yes" || status === "Built-in" || status === "Full support") {
    return <Check className="inline h-4 w-4 text-green" />;
  }
  if (status === "Not available" || status === "No free plan" || status === "No" || status === "No (file-locking)") {
    return <X className="inline h-4 w-4 text-red-500" />;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function KontafyVsTallyClient() {
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
                Kontafy vs <span className="text-green">Tally</span>
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-muted">
                Tally has been India&apos;s go-to accounting software for over 30 years.
                But as businesses move to the cloud, Kontafy offers everything
                Tally does — plus WhatsApp billing, AI insights, e-commerce sync,
                and transparent pricing that saves you up to 78%.
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
              { value: "78%", label: "Cost savings" },
              { value: "100%", label: "Cloud-native" },
              { value: "0", label: "Installation needed" },
              { value: "24/7", label: "Access anywhere" },
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
            description="An honest, detailed comparison across every category that matters."
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
                          Tally
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
            title="Why Businesses Switch from Tally to Kontafy"
            greenText="Kontafy"
            description="Desktop accounting had its era. Here's why thousands of Indian businesses are making the move."
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
            title="Switch from Tally in 4 Simple Steps"
            greenText="4 Simple Steps"
            description="We make migration effortless. Your data, your history, your balances — all safely transferred."
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
              Ready to Move Beyond Tally?
            </h2>
            <p className="mt-4 text-lg text-white/70">
              Join thousands of Indian businesses that have switched to modern,
              cloud-native accounting. Start free — no credit card, no
              commitment.
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
