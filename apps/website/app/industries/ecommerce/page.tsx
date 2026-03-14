"use client";

import { motion } from "motion/react";
import {
  Globe,
  RefreshCw,
  Package,
  FileWarning,
  ReceiptText,
  Check,
  ArrowRight,
  ShoppingBag,
  Repeat,
  BarChart3,
  Link2,
  Truck,
  Layers,
} from "lucide-react";
import SectionHeading from "@/components/shared/SectionHeading";
import CTAButton from "@/components/shared/CTAButton";
import Link from "next/link";

const painPoints = [
  {
    icon: Globe,
    title: "Multi-Marketplace Chaos",
    description:
      "Selling on Amazon, Flipkart, Meesho, and your own website means juggling separate dashboards, reports, and settlement cycles. Reconciling them manually is a full-time job.",
  },
  {
    icon: Package,
    title: "Inventory Sync Issues",
    description:
      "Overselling on one platform because another did not update stock fast enough. Or worse — showing products as available when they have been returned and are not re-sellable.",
  },
  {
    icon: RefreshCw,
    title: "Returns Accounting Mess",
    description:
      "Marketplace returns involve reverse logistics, refund processing, damaged goods assessment, and commission adjustments. Most sellers have no idea what returns actually cost them.",
  },
  {
    icon: ReceiptText,
    title: "GST on Marketplace Sales",
    description:
      "TCS deducted by marketplaces, different GST rates across product categories, inter-state vs intra-state classification — e-commerce GST compliance is uniquely complex.",
  },
];

const solutions = [
  {
    module: "Commerce",
    title: "Multi-Marketplace Sync",
    description:
      "Connect Amazon, Flipkart, Meesho, Shopify, and WooCommerce in one dashboard. Orders, returns, and settlements are synced automatically — no manual data entry needed.",
    href: "/features/commerce",
  },
  {
    module: "Stock",
    title: "Unified Multi-Channel Inventory",
    description:
      "Single inventory pool across all channels. When a product sells on Amazon, stock updates on Flipkart and your website in real time. No more overselling.",
    href: "/features/stock",
  },
  {
    module: "Books",
    title: "Automated Returns Accounting",
    description:
      "Returns are automatically tracked with full P&L impact — refund amount, reverse shipping cost, commission clawback, and inventory re-entry. Know the true cost of every return.",
    href: "/features/books",
  },
  {
    module: "Tax",
    title: "E-Commerce GST Compliance",
    description:
      "Automatic TCS tracking, marketplace-wise GST reconciliation, and GSTR filing that accounts for the unique complexities of e-commerce taxation.",
    href: "/features/tax",
  },
  {
    module: "Bill",
    title: "Automated Invoice Generation",
    description:
      "Generate GST-compliant invoices automatically for every marketplace order. Bulk invoicing for high-volume sellers with correct HSN codes and tax rates.",
    href: "/features/bill",
  },
  {
    module: "Connect",
    title: "Marketplace API Integration",
    description:
      "Deep API integration with major marketplaces pulls in order data, settlement reports, and advertising spend. Reconcile marketplace payouts against actual orders effortlessly.",
    href: "/features/connect",
  },
];

const features = [
  {
    icon: ShoppingBag,
    title: "Order-Level Profitability",
    description:
      "See profit per order after accounting for product cost, shipping, marketplace commission, ads, and returns. Identify which products actually make money.",
  },
  {
    icon: Repeat,
    title: "Settlement Reconciliation",
    description:
      "Auto-match marketplace settlement reports with your orders. Catch missing payments, commission overcharges, and penalty disputes instantly.",
  },
  {
    icon: BarChart3,
    title: "Channel-Wise Analytics",
    description:
      "Compare revenue, margins, and growth across Amazon, Flipkart, and D2C channels. Allocate inventory and ad spend to your most profitable channels.",
  },
  {
    icon: Link2,
    title: "Shipping Cost Tracking",
    description:
      "Track shipping costs per order, per carrier, per zone. Compare actual shipping charges with marketplace-estimated charges to find savings.",
  },
  {
    icon: Truck,
    title: "Returns & RTO Dashboard",
    description:
      "Monitor return rates by product, channel, and region. Track RTO (return to origin) shipments and their financial impact on your margins.",
  },
  {
    icon: Layers,
    title: "SKU-Level Inventory",
    description:
      "Manage inventory at the SKU level with variant tracking (size, color, bundle). Set reorder points and get alerts before stock runs out on any channel.",
  },
];

export default function EcommerceIndustryPage() {
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
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-green-50 px-4 py-1.5 text-sm font-medium text-green-600">
                <Globe className="h-4 w-4" />
                E-Commerce
              </span>

              <h1 className="font-heading text-4xl font-extrabold leading-tight text-ink md:text-5xl lg:text-6xl">
                Sell Everywhere.{" "}
                <span className="text-green">Account Once.</span>
              </h1>

              <p className="max-w-lg text-lg text-muted">
                Kontafy connects all your sales channels — Amazon, Flipkart,
                Shopify, and more — into a single accounting platform. Sync
                orders, track inventory, reconcile settlements, and file GST
                without the chaos.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <CTAButton variant="primary" size="lg" href="/signup">
                  Start Free Trial
                </CTAButton>
                <CTAButton variant="ghost" size="lg" href="/demo">
                  See E-Commerce Demo
                </CTAButton>
              </div>

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
                {[
                  "Multi-Marketplace",
                  "Auto Settlement Reconciliation",
                  "TCS Tracking",
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
                    Kontafy — E-Commerce Hub
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 p-4">
                  {[
                    { label: "Today's Orders", value: "186", trend: "+34%" },
                    { label: "Revenue (MTD)", value: "₹24.8L", trend: "+28%" },
                    { label: "Return Rate", value: "4.2%", trend: "-1.1%" },
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
                    Channel Performance
                  </p>
                  <div className="divide-y divide-border rounded-lg border border-border">
                    {[
                      { channel: "Amazon IN", orders: "82 orders", revenue: "₹11.4L", margin: "18.2%" },
                      { channel: "Flipkart", orders: "64 orders", revenue: "₹8.6L", margin: "16.8%" },
                      { channel: "D2C Website", orders: "40 orders", revenue: "₹4.8L", margin: "32.5%" },
                    ].map((ch) => (
                      <div
                        key={ch.channel}
                        className="flex items-center justify-between px-3 py-2 text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-ink">{ch.channel}</span>
                          <span className="text-xs text-muted">{ch.orders}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-ink">{ch.revenue}</span>
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            {ch.margin}
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
            title="Why E-Commerce Accounting Is Broken"
            description="Online selling generates thousands of transactions across multiple platforms. Here is why most sellers lose track of their real profits."
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
            title="How Kontafy Powers E-Commerce Sellers"
            greenText="Kontafy"
            description="Six modules built specifically for the complexity of multi-channel e-commerce accounting."
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
            title="Built for High-Volume Online Sellers"
            greenText="Online Sellers"
            description="From order-level profitability to settlement reconciliation, every feature is designed for the pace of e-commerce."
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
              Stop Guessing Your E-Commerce Profits
            </h2>
            <p className="mt-4 text-lg text-muted">
              Connect your marketplaces, sync your orders, and finally see
              real per-order profitability. Start your free trial today.
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
