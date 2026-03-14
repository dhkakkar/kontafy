"use client";

import { motion } from "motion/react";
import {
  Briefcase,
  Clock,
  Receipt,
  FileText,
  TrendingDown,
  Check,
  ArrowRight,
  Timer,
  FolderOpen,
  IndianRupee,
  Users,
  PieChart,
  Send,
} from "lucide-react";
import SectionHeading from "@/components/shared/SectionHeading";
import CTAButton from "@/components/shared/CTAButton";
import Link from "next/link";

const painPoints = [
  {
    icon: Clock,
    title: "Project Billing Complexity",
    description:
      "Tracking billable hours across multiple clients and projects, then converting them into accurate invoices, is tedious and error-prone with spreadsheets.",
  },
  {
    icon: Receipt,
    title: "Expense Tracking Chaos",
    description:
      "Team travel, software subscriptions, client reimbursements — expenses pile up and get lost. Reconciling them against projects at month-end is a nightmare.",
  },
  {
    icon: FileText,
    title: "TDS Management Headaches",
    description:
      "Clients deduct TDS at varying rates, certificates arrive late, and reconciling TDS credits with Form 26AS requires manual effort every quarter.",
  },
  {
    icon: TrendingDown,
    title: "Cash Flow Unpredictability",
    description:
      "Long payment cycles, milestone-based billing, and advance-retainer tracking make it hard to predict when money will actually arrive.",
  },
];

const solutions = [
  {
    module: "Bill",
    title: "Flexible Project Invoicing",
    description:
      "Create invoices based on time tracked, fixed milestones, or retainer agreements. Support for proforma invoices, recurring invoices, and multi-currency billing for international clients.",
    href: "/features/bill",
  },
  {
    module: "Books",
    title: "Project-Wise Profitability",
    description:
      "Tag every income and expense to a project or client. See real-time profitability per project, per client, and per team member — not just at the company level.",
    href: "/features/books",
  },
  {
    module: "Tax",
    title: "Automated TDS Reconciliation",
    description:
      "Track TDS deducted by clients, match with Form 26AS data, generate TDS certificates, and ensure you claim every rupee of credit at filing time.",
    href: "/features/tax",
  },
  {
    module: "Bank",
    title: "Smart Cash Flow Tracking",
    description:
      "Connect bank accounts and auto-categorize incoming payments against invoices. See outstanding receivables, aging reports, and projected cash flow at a glance.",
    href: "/features/bank",
  },
  {
    module: "Pay",
    title: "Faster Payment Collection",
    description:
      "Embed payment links in invoices, send automated reminders for overdue payments, and accept UPI, bank transfers, and card payments — all reconciled automatically.",
    href: "/features/pay",
  },
];

const features = [
  {
    icon: Timer,
    title: "Time Tracking Integration",
    description:
      "Log billable hours directly or import from time-tracking tools. Convert tracked time into invoices with a single click.",
  },
  {
    icon: FolderOpen,
    title: "Project Cost Centers",
    description:
      "Create cost centers for every project. All income, expenses, and team costs are automatically tagged for accurate profitability reporting.",
  },
  {
    icon: IndianRupee,
    title: "Retainer & Advance Management",
    description:
      "Track client retainers, advance payments, and security deposits. Auto-adjust against future invoices with full audit trails.",
  },
  {
    icon: Users,
    title: "Multi-Client Dashboard",
    description:
      "See all client accounts at a glance — outstanding invoices, payment history, TDS deducted, and overall relationship health.",
  },
  {
    icon: PieChart,
    title: "Expense Reports",
    description:
      "Capture expenses on the go, attach receipts, categorize by project, and generate reimbursement reports for clients or internal approvals.",
  },
  {
    icon: Send,
    title: "Automated Payment Reminders",
    description:
      "Set up payment reminder schedules via email and WhatsApp. Escalate overdue invoices automatically based on aging rules you define.",
  },
];

export default function ServicesIndustryPage() {
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
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-purple-50 px-4 py-1.5 text-sm font-medium text-purple-600">
                <Briefcase className="h-4 w-4" />
                Professional Services
              </span>

              <h1 className="font-heading text-4xl font-extrabold leading-tight text-ink md:text-5xl lg:text-6xl">
                Bill by the Hour. <span className="text-green">Profit</span> by
                the Project.
              </h1>

              <p className="max-w-lg text-lg text-muted">
                Kontafy helps consultancies, agencies, and service firms track
                time, invoice clients, manage TDS, and understand project-level
                profitability — all without the accounting headache.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <CTAButton variant="primary" size="lg" href="/signup">
                  Start Free Trial
                </CTAButton>
                <CTAButton variant="ghost" size="lg" href="/demo">
                  See Services Demo
                </CTAButton>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
                {[
                  "Time-Based Billing",
                  "TDS Tracking",
                  "Project P&L",
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
                    Kontafy — Client Overview
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 p-4">
                  {[
                    { label: "Active Projects", value: "12", trend: "3 Due Soon" },
                    { label: "Outstanding", value: "₹8.4L", trend: "6 Invoices" },
                    { label: "This Month", value: "₹14.2L", trend: "+22%" },
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
                      { id: "INV-318", client: "Apex Consulting", amount: "₹3,54,000", status: "Paid" },
                      { id: "INV-317", client: "BlueOrbit Digital", amount: "₹1,80,000", status: "Pending" },
                      { id: "INV-316", client: "GreenLeaf Corp", amount: "₹2,25,000", status: "Overdue" },
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
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="bg-surface py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="The Problem"
            title="Why Service Firms Struggle with Finances"
            description="Professional services have unique billing and expense patterns that generic accounting tools were never designed for."
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
            title="How Kontafy Works for Service Firms"
            greenText="Kontafy"
            description="Purpose-built modules that understand time-based billing, project accounting, and the nuances of service-based businesses."
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
            title="Designed for How Services Bill and Operate"
            greenText="Services"
            description="From time tracking to TDS reconciliation, every feature is built for the service industry workflow."
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
              Know Your Project Profitability in Real Time
            </h2>
            <p className="mt-4 text-lg text-muted">
              Stop guessing whether a project made money. With Kontafy, every
              hour and every expense is tracked against the right client and
              project.
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
