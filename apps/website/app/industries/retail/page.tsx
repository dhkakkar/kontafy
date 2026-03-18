"use client";

import { motion } from "motion/react";
import {
  ShoppingCart,
  AlertTriangle,
  BarChart3,
  FileText,
  Package,
  CreditCard,
  Check,
  ArrowRight,
  Zap,
  Shield,
  Clock,
  IndianRupee,
} from "lucide-react";
import SectionHeading from "@/components/shared/SectionHeading";
import CTAButton from "@/components/shared/CTAButton";
import Link from "next/link";

const painPoints = [
  {
    icon: Clock,
    title: "Manual Billing Slows You Down",
    description:
      "Handwritten bills and paper invoices create long queues, increase errors, and leave you with no digital record for tax filing.",
  },
  {
    icon: Package,
    title: "Stock Mismatches Are Constant",
    description:
      "Without real-time inventory tracking, you discover stock-outs only when a customer asks. Dead stock piles up unnoticed.",
  },
  {
    icon: AlertTriangle,
    title: "GST Errors and Penalties",
    description:
      "Manually calculating GST across product categories leads to mismatches, wrong GSTR filings, and avoidable penalties.",
  },
  {
    icon: BarChart3,
    title: "No Real-Time Business Visibility",
    description:
      "You only know how the business is doing at month-end when the CA reviews the books. By then, it is too late to act.",
  },
];

const solutions = [
  {
    module: "Bill",
    title: "Instant POS-Style Invoicing",
    description:
      "Create GST-compliant invoices in seconds with barcode scanning, auto-tax calculation, and thermal printer support. No queues, no errors.",
    href: "/features/bill",
  },
  {
    module: "Stock",
    title: "Real-Time Inventory Tracking",
    description:
      "Track stock levels across locations in real time. Get low-stock alerts, batch/expiry tracking for FMCG, and automated reorder suggestions.",
    href: "/features/stock",
  },
  {
    module: "Tax",
    title: "Automated GST Compliance",
    description:
      "HSN codes auto-applied, GSTR-1 and GSTR-3B generated from your invoices, ITC reconciliation done automatically. File with confidence.",
    href: "/features/tax",
  },
  {
    module: "Books",
    title: "Double-Entry Bookkeeping",
    description:
      "Every sale, purchase, and expense is recorded in proper double-entry format. Ledgers, trial balance, and P&L are always up to date.",
    href: "/features/books",
  },
  {
    module: "Pay",
    title: "Collect Payments Instantly",
    description:
      "Share payment links on invoices, accept UPI and cards, and auto-reconcile payments against invoices. No manual matching needed.",
    href: "/features/pay",
  },
];

const features = [
  {
    icon: Zap,
    title: "Barcode & QR Scanning",
    description:
      "Scan product barcodes to instantly add items to invoices. Supports USB and Bluetooth barcode scanners.",
  },
  {
    icon: Package,
    title: "Multi-Location Stock",
    description:
      "Manage inventory across multiple stores and warehouses. Transfer stock between locations with full audit trails.",
  },
  {
    icon: IndianRupee,
    title: "Daily Sales Summary",
    description:
      "See today's sales, top-selling products, and cash register summary at a glance. Compare with previous periods instantly.",
  },
  {
    icon: FileText,
    title: "Batch & Expiry Tracking",
    description:
      "Track manufacturing and expiry dates for FMCG products. Get alerts before products expire to minimize waste.",
  },
  {
    icon: Shield,
    title: "Customer Loyalty Ledger",
    description:
      "Maintain party-wise ledgers with credit limits, outstanding balances, and payment history for every customer.",
  },
  {
    icon: CreditCard,
    title: "Multi-Payment Modes",
    description:
      "Accept cash, UPI, cards, and credit — all tracked against the same invoice. Split payments handled automatically.",
  },
];

export default function RetailIndustryPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-white py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col gap-6"
            >
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-600">
                <ShoppingCart className="h-4 w-4" />
                Retail &amp; FMCG
              </span>

              <h1 className="font-heading text-4xl font-extrabold leading-tight text-ink md:text-5xl lg:text-6xl">
                Billing, Inventory &amp; GST —{" "}
                <span className="text-green">All in One</span>
              </h1>

              <p className="max-w-lg text-lg text-muted">
                Stop juggling billing software, stock registers, and GST
                spreadsheets. Kontafy gives retail businesses a single platform
                for invoicing, inventory, and tax compliance — so you can focus
                on selling, not paperwork.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <CTAButton variant="primary" size="lg" href="https://app.kontafy.com/signup">
                  Start Free Trial
                </CTAButton>
                <CTAButton variant="ghost" size="lg" href="/demo">
                  See Retail Demo
                </CTAButton>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
                {[
                  "POS-Ready Billing",
                  "Barcode Support",
                  "GST Compliant",
                ].map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-1.5 text-sm text-muted"
                  >
                    <Check className="h-4 w-4 text-green" />
                    {badge}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
                <div className="flex items-center gap-2 bg-navy px-4 py-2.5">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-yellow-400" />
                  <span className="h-3 w-3 rounded-full bg-green-400" />
                  <span className="ml-3 text-xs font-medium text-white/80">
                    Kontafy — Retail Dashboard
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 p-4">
                  {[
                    { label: "Today's Sales", value: "₹1,24,500", trend: "+18%" },
                    { label: "Items Sold", value: "342", trend: "+12%" },
                    { label: "Low Stock Items", value: "7", trend: "Alert" },
                  ].map((m) => (
                    <div
                      key={m.label}
                      className="rounded-lg border border-border bg-surface p-3"
                    >
                      <p className="text-xs text-muted">{m.label}</p>
                      <p className="mt-1 text-xl font-bold text-ink">
                        {m.value}
                      </p>
                      <span className="mt-1 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        {m.trend}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="px-4 pb-4">
                  <p className="mb-2 text-xs font-semibold uppercase text-muted">
                    Recent Bills
                  </p>
                  <div className="divide-y divide-border rounded-lg border border-border">
                    {[
                      { id: "INV-1042", customer: "Walk-in Customer", amount: "₹2,340", items: "8 items" },
                      { id: "INV-1041", customer: "Ramesh Traders", amount: "₹18,750", items: "24 items" },
                      { id: "INV-1040", customer: "Priya Store", amount: "₹5,620", items: "12 items" },
                    ].map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-muted">{inv.id}</span>
                          <span className="text-ink">{inv.customer}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted">{inv.items}</span>
                          <span className="font-medium text-ink">{inv.amount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="bg-surface py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="The Problem"
            title="Why Retail Businesses Struggle with Accounting"
            description="Most retail businesses rely on disconnected tools — or worse, manual processes. Here is what that costs you."
            centered
          />

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {painPoints.map((point, i) => {
              const Icon = point.icon;
              return (
                <motion.div
                  key={point.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-4 rounded-xl border border-red-100 bg-red-50/50 p-6"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-ink">
                      {point.title}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {point.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How Kontafy Solves It */}
      <section className="bg-white py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="The Solution"
            title="How Kontafy Solves It for Retail"
            greenText="Kontafy"
            description="Every module works together so your billing, inventory, and taxes stay perfectly in sync."
            centered
          />

          <div className="mt-12 flex flex-col gap-8">
            {solutions.map((solution, i) => (
              <motion.div
                key={solution.module}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                viewport={{ once: true }}
                className="grid items-center gap-6 rounded-2xl border border-border bg-surface p-8 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <span className="mb-2 inline-block rounded-full bg-green/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-green">
                    {solution.module}
                  </span>
                  <h3 className="font-heading text-xl font-bold text-ink">
                    {solution.title}
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
                    {solution.description}
                  </p>
                </div>
                <Link
                  href={solution.href}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-green transition hover:gap-2.5"
                >
                  Explore {solution.module}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="bg-surface py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Key Features"
            title="Built for How Retail Actually Works"
            greenText="Retail"
            description="From barcode scanning to batch tracking, every feature is designed for the pace and complexity of retail."
            centered
          />

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  viewport={{ once: true }}
                  className="rounded-xl border border-border bg-white p-6"
                >
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-green/10 text-green">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-heading text-lg font-bold text-ink">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="font-heading text-3xl font-extrabold text-ink md:text-4xl">
              Ready to Modernize Your Retail Billing?
            </h2>
            <p className="mt-4 text-lg text-muted">
              Join thousands of retail businesses that have switched from
              pen-and-paper to Kontafy. Start with a free trial — no credit card
              required.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <CTAButton variant="primary" size="lg" href="https://app.kontafy.com/signup">
                Start Free Trial
              </CTAButton>
              <CTAButton variant="ghost" size="lg" href="/demo">
                Book a Demo
              </CTAButton>
            </div>
            <p className="mt-4 text-xs text-muted">
              Free plan available. No credit card required. Cancel anytime.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
