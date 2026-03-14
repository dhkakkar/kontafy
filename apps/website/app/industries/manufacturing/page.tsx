"use client";

import { motion } from "motion/react";
import {
  Factory,
  Layers,
  Warehouse,
  FileSpreadsheet,
  Check,
  ArrowRight,
  Cog,
  Calculator,
  ClipboardList,
  Shield,
  TrendingUp,
} from "lucide-react";
import SectionHeading from "@/components/shared/SectionHeading";
import CTAButton from "@/components/shared/CTAButton";
import Link from "next/link";

const painPoints = [
  {
    icon: Calculator,
    title: "Complex Production Costing",
    description:
      "Raw materials, labour, overheads, wastage — calculating the true cost of a finished product involves multiple variables that spreadsheets simply cannot handle reliably.",
  },
  {
    icon: Layers,
    title: "Raw Material Tracking Nightmare",
    description:
      "Tracking consumption of dozens of raw materials across production batches manually leads to stock mismatches, over-ordering, and production delays.",
  },
  {
    icon: Warehouse,
    title: "Multi-Location Inventory Chaos",
    description:
      "With raw materials in one warehouse, WIP in another, and finished goods in a third, keeping accurate stock counts without a unified system is nearly impossible.",
  },
  {
    icon: FileSpreadsheet,
    title: "Compliance Burden",
    description:
      "Manufacturing GST involves reverse charge, job work challans, e-way bills, and input-output reconciliation. One mistake means penalties and audits.",
  },
];

const solutions = [
  {
    module: "Stock",
    title: "Bill of Materials (BOM) Management",
    description:
      "Define multi-level BOMs with raw materials, sub-assemblies, and finished goods. Kontafy auto-deducts raw material stock when you record production, keeping inventory accurate without manual adjustments.",
    href: "/features/stock",
  },
  {
    module: "Books",
    title: "Automated Production Costing",
    description:
      "Kontafy calculates landed cost per unit by factoring in raw material cost, labour, overheads, and wastage. Costs update in real time as input prices change, giving you accurate margins on every product.",
    href: "/features/books",
  },
  {
    module: "Stock",
    title: "Multi-Warehouse Inventory",
    description:
      "Track stock across raw material stores, production floors, and finished goods warehouses. Inter-location transfers are logged with full audit trails and automatic stock adjustments.",
    href: "/features/stock",
  },
  {
    module: "Tax",
    title: "Complete GST Compliance",
    description:
      "Automated HSN mapping, reverse charge calculations, job work challan tracking, and e-way bill generation. GSTR filings are pre-filled from your invoices — just review and submit.",
    href: "/features/tax",
  },
  {
    module: "Bank",
    title: "Bank Reconciliation",
    description:
      "Connect your bank accounts and auto-match transactions with purchase orders and supplier payments. Catch discrepancies before they become problems.",
    href: "/features/bank",
  },
  {
    module: "Insight",
    title: "Production Analytics",
    description:
      "AI-powered insights into production efficiency, material consumption trends, cost variances, and inventory turnover. Make data-driven decisions about production planning.",
    href: "/features/insight",
  },
];

const features = [
  {
    icon: Cog,
    title: "Multi-Level BOM",
    description:
      "Define complex BOMs with sub-assemblies nested inside finished goods. Track material requirements at every level.",
  },
  {
    icon: ClipboardList,
    title: "Production Orders",
    description:
      "Create production orders, track WIP status, and auto-deduct raw materials from inventory upon completion.",
  },
  {
    icon: Calculator,
    title: "Landed Cost Calculation",
    description:
      "Factor in freight, customs, taxes, and overheads to calculate the true landed cost of raw materials and finished goods.",
  },
  {
    icon: Warehouse,
    title: "Warehouse Transfers",
    description:
      "Record stock transfers between locations with approval workflows and automatic stock level adjustments.",
  },
  {
    icon: Shield,
    title: "Job Work Tracking",
    description:
      "Track materials sent for job work, receive finished goods back, and manage job work challans as required under GST.",
  },
  {
    icon: TrendingUp,
    title: "Wastage & Yield Reports",
    description:
      "Monitor actual vs expected yields, track wastage percentages, and identify production inefficiencies over time.",
  },
];

export default function ManufacturingIndustryPage() {
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
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-orange-50 px-4 py-1.5 text-sm font-medium text-orange-600">
                <Factory className="h-4 w-4" />
                Manufacturing
              </span>

              <h1 className="font-heading text-4xl font-extrabold leading-tight text-ink md:text-5xl lg:text-6xl">
                From Raw Material to{" "}
                <span className="text-green">Finished Goods</span> — Tracked
              </h1>

              <p className="max-w-lg text-lg text-muted">
                Kontafy gives manufacturers complete control over production
                costing, BOM management, multi-warehouse inventory, and GST
                compliance — in one integrated platform.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <CTAButton variant="primary" size="lg" href="/signup">
                  Start Free Trial
                </CTAButton>
                <CTAButton variant="ghost" size="lg" href="/demo">
                  See Manufacturing Demo
                </CTAButton>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
                {[
                  "BOM Management",
                  "Multi-Warehouse",
                  "Production Costing",
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
                    Kontafy — Production Overview
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 p-4">
                  {[
                    { label: "Production Orders", value: "24", trend: "Active" },
                    { label: "Raw Material Value", value: "₹18.5L", trend: "In Stock" },
                    { label: "Finished Goods", value: "1,240", trend: "Units" },
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
                    Active Production Orders
                  </p>
                  <div className="divide-y divide-border rounded-lg border border-border">
                    {[
                      { id: "PO-128", product: "Steel Bracket A", qty: "500 units", status: "In Progress" },
                      { id: "PO-127", product: "Copper Coil B12", qty: "200 units", status: "QC Pending" },
                      { id: "PO-126", product: "Plastic Housing C", qty: "1,000 units", status: "Completed" },
                    ].map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs text-muted">{order.id}</span>
                          <span className="text-ink">{order.product}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted">{order.qty}</span>
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            {order.status}
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
            title="Why Manufacturing Accounting Is So Hard"
            description="Manufacturing finances involve moving parts — literally. Here is what makes it uniquely challenging."
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
            title="How Kontafy Powers Manufacturing"
            greenText="Kontafy"
            description="Six integrated modules that cover every aspect of manufacturing finance — from raw material purchase to finished goods sale."
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
            title="Purpose-Built for Manufacturers"
            greenText="Manufacturers"
            description="Every feature addresses a real manufacturing workflow — no generic accounting bloat."
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
              Take Control of Your Production Finances
            </h2>
            <p className="mt-4 text-lg text-muted">
              From BOM to balance sheet, Kontafy gives manufacturers the
              visibility they need. Start your free trial today.
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
