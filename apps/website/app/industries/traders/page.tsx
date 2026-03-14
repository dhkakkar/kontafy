"use client";

import { motion } from "motion/react";
import {
  TrendingUp,
  Users,
  AlertTriangle,
  FileText,
  CreditCard,
  Check,
  ArrowRight,
  BookOpen,
  Scale,
  IndianRupee,
  BarChart3,
  ShieldCheck,
  Repeat,
} from "lucide-react";
import SectionHeading from "@/components/shared/SectionHeading";
import CTAButton from "@/components/shared/CTAButton";
import Link from "next/link";

const painPoints = [
  {
    icon: Users,
    title: "Large Party Ledgers",
    description:
      "Hundreds of suppliers and buyers, each with different credit terms, outstanding balances, and payment schedules. Keeping accurate party-wise ledgers in spreadsheets is a disaster waiting to happen.",
  },
  {
    icon: AlertTriangle,
    title: "Purchase-Sale Mismatches",
    description:
      "Discrepancies between purchase orders, goods received notes, and supplier invoices slip through without a system to flag them. These mismatches compound over time and distort your books.",
  },
  {
    icon: CreditCard,
    title: "Credit Management Gaps",
    description:
      "Extending credit without visibility into a party's total outstanding, overdue invoices, and payment history leads to bad debts. Most traders discover credit issues too late.",
  },
  {
    icon: FileText,
    title: "Bulk GST Filing Burden",
    description:
      "High transaction volumes mean thousands of invoices per month. Compiling GSTR-1 with correct party details, HSN codes, and tax breakdowns manually is unsustainable.",
  },
];

const solutions = [
  {
    module: "Books",
    title: "Party-Wise Ledgers & Accounting",
    description:
      "Every buyer and supplier gets a dedicated ledger with complete transaction history, outstanding balance, credit limit tracking, and aging analysis. Double-entry bookkeeping ensures your books are always audit-ready.",
    href: "/features/books",
  },
  {
    module: "Bill",
    title: "Purchase & Sales Invoice Management",
    description:
      "Create purchase orders, receive goods with GRN matching, generate sales invoices, and track credit/debit notes — all linked together so discrepancies are caught instantly.",
    href: "/features/bill",
  },
  {
    module: "Stock",
    title: "Inventory with Batch & Rate Tracking",
    description:
      "Track stock by batch, lot number, and purchase rate. FIFO/weighted average costing is calculated automatically. Multi-godown support for traders with multiple storage locations.",
    href: "/features/stock",
  },
  {
    module: "Tax",
    title: "Bulk GST Filing Made Easy",
    description:
      "Auto-generate GSTR-1 and GSTR-3B from your invoices. Bulk upload support for high-volume traders, ITC reconciliation with GSTR-2B, and e-way bill generation for interstate sales.",
    href: "/features/tax",
  },
  {
    module: "Bank",
    title: "Bank & Payment Reconciliation",
    description:
      "Auto-match bank transactions with invoices and payments. Track cheques, post-dated cheques, and RTGS/NEFT transfers with party-wise breakdowns.",
    href: "/features/bank",
  },
];

const features = [
  {
    icon: BookOpen,
    title: "Outstanding Reports",
    description:
      "View receivables and payables by party, age, and due date. Filter by overdue status and send payment reminders directly from the report.",
  },
  {
    icon: Scale,
    title: "Credit Limit Controls",
    description:
      "Set credit limits per party. Get warnings when a new invoice would exceed the limit. Block invoicing for parties beyond their credit threshold.",
  },
  {
    icon: IndianRupee,
    title: "Rate-Wise Purchase Tracking",
    description:
      "Track purchase rates from different suppliers for the same item. Compare historical rates and negotiate better deals based on data.",
  },
  {
    icon: BarChart3,
    title: "Party-Wise Profitability",
    description:
      "See gross margin per buyer after accounting for discounts, returns, and credit notes. Identify your most and least profitable trading relationships.",
  },
  {
    icon: ShieldCheck,
    title: "GRN & Quality Check",
    description:
      "Record goods received against purchase orders. Flag quantity mismatches, damaged goods, and quality issues before approving supplier invoices.",
  },
  {
    icon: Repeat,
    title: "Recurring Order Templates",
    description:
      "Create templates for frequent purchase and sales orders. Repeat orders with a single click, pre-populated with last-used rates and quantities.",
  },
];

export default function TradersIndustryPage() {
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
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-red-50 px-4 py-1.5 text-sm font-medium text-red-600">
                <TrendingUp className="h-4 w-4" />
                Traders &amp; Distributors
              </span>

              <h1 className="font-heading text-4xl font-extrabold leading-tight text-ink md:text-5xl lg:text-6xl">
                Every Party. Every Transaction.{" "}
                <span className="text-green">Perfectly Tracked.</span>
              </h1>

              <p className="max-w-lg text-lg text-muted">
                Kontafy is built for traders and distributors who deal with
                hundreds of parties, high transaction volumes, and complex credit
                relationships. Manage ledgers, inventory, and GST filing from
                one platform.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <CTAButton variant="primary" size="lg" href="/signup">
                  Start Free Trial
                </CTAButton>
                <CTAButton variant="ghost" size="lg" href="/demo">
                  See Traders Demo
                </CTAButton>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
                {[
                  "Party-Wise Ledgers",
                  "Credit Management",
                  "Bulk GST Filing",
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
                    Kontafy — Trader Dashboard
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 p-4">
                  {[
                    { label: "Receivables", value: "₹32.4L", trend: "148 Parties" },
                    { label: "Payables", value: "₹18.7L", trend: "62 Parties" },
                    { label: "Today's Turnover", value: "₹4.8L", trend: "+15%" },
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
                    Top Outstanding Parties
                  </p>
                  <div className="divide-y divide-border rounded-lg border border-border">
                    {[
                      { party: "Sharma Distributors", outstanding: "₹4,80,000", days: "45 days", status: "Overdue" },
                      { party: "National Traders", outstanding: "₹3,25,000", days: "22 days", status: "Due Soon" },
                      { party: "Gupta & Sons", outstanding: "₹2,10,000", days: "8 days", status: "Current" },
                    ].map((p) => (
                      <div
                        key={p.party}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-ink">{p.party}</span>
                          <span className="text-xs text-muted">{p.days}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-ink">{p.outstanding}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              p.status === "Overdue"
                                ? "bg-red-100 text-red-700"
                                : p.status === "Due Soon"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-green-100 text-green-700"
                            }`}
                          >
                            {p.status}
                          </span>
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
            title="Why Traders Outgrow Spreadsheets Fast"
            description="High transaction volumes and complex party relationships make trading one of the hardest businesses to account for."
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

      {/* Solutions */}
      <section className="bg-white py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="The Solution"
            title="How Kontafy Serves Traders"
            greenText="Kontafy"
            description="Five integrated modules that handle the volume, complexity, and compliance demands of trading businesses."
            centered
          />

          <div className="mt-12 flex flex-col gap-8">
            {solutions.map((solution, i) => (
              <motion.div
                key={solution.title}
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
            title="Built for High-Volume Trading"
            greenText="Trading"
            description="Every feature is designed for the speed and scale at which traders and distributors operate."
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
              Manage Hundreds of Parties Without the Chaos
            </h2>
            <p className="mt-4 text-lg text-muted">
              From party ledgers to bulk GST filing, Kontafy gives traders the
              tools they need to scale without losing control of their finances.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <CTAButton variant="primary" size="lg" href="/signup">
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
