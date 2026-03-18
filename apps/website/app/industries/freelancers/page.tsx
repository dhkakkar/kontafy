"use client";

import { motion } from "motion/react";
import {
  User,
  Wallet,
  HelpCircle,
  Send,
  Shuffle,
  Check,
  ArrowRight,
  FileText,
  PieChart,
  IndianRupee,
  Bell,
  Calculator,
  Smartphone,
} from "lucide-react";
import SectionHeading from "@/components/shared/SectionHeading";
import CTAButton from "@/components/shared/CTAButton";
import Link from "next/link";

const painPoints = [
  {
    icon: Wallet,
    title: "Irregular Income Tracking",
    description:
      "Projects come and go, payments arrive at different times, and retainers overlap with one-off gigs. Without a system, you have no idea what you actually earned this quarter.",
  },
  {
    icon: HelpCircle,
    title: "Tax Estimation Confusion",
    description:
      "Advance tax deadlines, TDS credits from clients, eligible deductions under 44ADA — freelancers overpay taxes because they cannot estimate liabilities accurately.",
  },
  {
    icon: Send,
    title: "Invoice Chasing",
    description:
      "You sent the invoice. Then the follow-up. Then another follow-up. Tracking which clients have paid, which are overdue, and which need reminders is exhausting.",
  },
  {
    icon: Shuffle,
    title: "Mixing Personal & Business Expenses",
    description:
      "Using the same bank account and credit card for personal and business spending makes it nearly impossible to know your true business profitability at tax time.",
  },
];

const solutions = [
  {
    module: "Bill",
    title: "Professional Invoicing in Minutes",
    description:
      "Create branded, GST-compliant invoices with your logo, payment terms, and bank details. Support for recurring invoices, milestone-based billing, and multi-currency for international clients.",
    href: "/features/bill",
  },
  {
    module: "Books",
    title: "Simple Income & Expense Tracking",
    description:
      "Log income and expenses without accounting jargon. Kontafy handles the double-entry bookkeeping behind the scenes. Tag expenses as business or personal to keep your books clean.",
    href: "/features/books",
  },
  {
    module: "Tax",
    title: "Automated Tax Estimation",
    description:
      "Kontafy calculates your estimated tax liability in real time based on income received, TDS credits, and eligible deductions. Get advance tax reminders before each quarterly deadline.",
    href: "/features/tax",
  },
  {
    module: "Pay",
    title: "Get Paid Faster",
    description:
      "Embed UPI and payment links directly in your invoices. Clients can pay with a single click. Payments are auto-matched against invoices — no manual reconciliation needed.",
    href: "/features/pay",
  },
];

const features = [
  {
    icon: FileText,
    title: "Branded Invoice Templates",
    description:
      "Customizable invoice templates with your logo, colors, and branding. Look professional without hiring a designer.",
  },
  {
    icon: Calculator,
    title: "Section 44ADA Support",
    description:
      "Presumptive taxation made easy. Kontafy calculates your tax liability under 44ADA and shows the benefit compared to regular ITR filing.",
  },
  {
    icon: PieChart,
    title: "Expense Categories",
    description:
      "Pre-built expense categories for freelancers — software subscriptions, co-working, travel, equipment. Snap receipts and attach them to expenses.",
  },
  {
    icon: IndianRupee,
    title: "TDS Credit Tracking",
    description:
      "Track TDS deducted by every client. Reconcile with Form 26AS to ensure you claim every rupee of credit when filing your ITR.",
  },
  {
    icon: Bell,
    title: "Payment Reminders",
    description:
      "Automated email and WhatsApp reminders for overdue invoices. Set escalation schedules — gentle nudge at 7 days, firm reminder at 30.",
  },
  {
    icon: Smartphone,
    title: "Mobile-First Experience",
    description:
      "Create invoices, log expenses, and check your dashboard from your phone. Designed for professionals who work from anywhere.",
  },
];

export default function FreelancersIndustryPage() {
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
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-teal-50 px-4 py-1.5 text-sm font-medium text-teal-600">
                <User className="h-4 w-4" />
                Freelancers &amp; Consultants
              </span>

              <h1 className="font-heading text-4xl font-extrabold leading-tight text-ink md:text-5xl lg:text-6xl">
                Focus on Your Work.{" "}
                <span className="text-green">We Handle the Numbers.</span>
              </h1>

              <p className="max-w-lg text-lg text-muted">
                Kontafy gives freelancers and independent consultants a simple
                way to invoice clients, track expenses, estimate taxes, and get
                paid faster — without needing an accountant for everyday tasks.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <CTAButton variant="primary" size="lg" href="https://app.kontafy.com/signup">
                  Start Free — It&apos;s Simple
                </CTAButton>
                <CTAButton variant="ghost" size="lg" href="/demo">
                  See Freelancer Demo
                </CTAButton>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
                {[
                  "Free Plan Available",
                  "No Accounting Jargon",
                  "Mobile Friendly",
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
                    Kontafy — Freelancer Dashboard
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 p-4">
                  {[
                    { label: "This Month", value: "₹1,85,000", trend: "Income" },
                    { label: "Expenses", value: "₹24,300", trend: "Tracked" },
                    { label: "Tax Due (Est.)", value: "₹46,200", trend: "Jun 15" },
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
                    Recent Invoices
                  </p>
                  <div className="divide-y divide-border rounded-lg border border-border">
                    {[
                      { id: "INV-042", client: "StartupXYZ", amount: "₹75,000", status: "Paid" },
                      { id: "INV-041", client: "Design Agency Co", amount: "₹45,000", status: "Pending" },
                      { id: "INV-040", client: "TechCorp Ltd", amount: "₹1,20,000", status: "Overdue" },
                    ].map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-muted">{inv.id}</span>
                          <span className="text-ink">{inv.client}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-ink">{inv.amount}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              inv.status === "Paid"
                                ? "bg-green-100 text-green-700"
                                : inv.status === "Pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating notification */}
              <div className="animate-float absolute -bottom-4 -left-4 rounded-lg border-l-4 border-l-green bg-white px-4 py-3 shadow-lg sm:-left-8">
                <p className="text-xs font-semibold text-ink">
                  Advance tax reminder: Jun 15
                </p>
                <p className="text-xs text-muted">Estimated: ₹46,200</p>
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
            title="The Freelancer Finance Struggle Is Real"
            description="You are great at your craft. But tracking money, chasing payments, and estimating taxes takes time away from billable work."
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
            title="How Kontafy Makes Freelancing Easier"
            greenText="Kontafy"
            description="Four focused modules that handle invoicing, bookkeeping, taxes, and payments — so you can spend more time on client work."
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
            title="Simple Tools for Independent Professionals"
            greenText="Independent Professionals"
            description="No accounting degree required. Every feature is designed to be intuitive for non-accountants."
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
              Your Clients Pay You. Let Kontafy Handle the Rest.
            </h2>
            <p className="mt-4 text-lg text-muted">
              Join thousands of freelancers who use Kontafy to invoice clients,
              track expenses, and never miss a tax deadline. The free plan is
              all most freelancers need.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <CTAButton variant="primary" size="lg" href="https://app.kontafy.com/signup">
                Start Free — No Card Needed
              </CTAButton>
              <CTAButton variant="ghost" size="lg" href="/demo">
                Book a Demo
              </CTAButton>
            </div>
            <p className="mt-4 text-xs text-muted">
              Free plan available forever. Upgrade only when you need more.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
