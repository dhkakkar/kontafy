"use client";

import { motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  FileText,
  Package,
  Calculator,
  Landmark,
  Brain,
  CreditCard,
  ShoppingCart,
  Plug,
} from "lucide-react";
import SectionHeading from "@/components/shared/SectionHeading";
import CTAButton from "@/components/shared/CTAButton";

/* ------------------------------------------------------------------ */
/*  Module data                                                        */
/* ------------------------------------------------------------------ */

const modules = [
  {
    icon: BookOpen,
    name: "Kontafy Books",
    subtitle: "Accounting",
    description:
      "Double-entry bookkeeping with smart categorization, journal entries, ledgers, trial balance, and multi-currency support.",
    href: "/features/books",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    icon: FileText,
    name: "Kontafy Bill",
    subtitle: "Invoicing",
    description:
      "GST-compliant invoices with WhatsApp delivery, payment links, recurring invoices, custom templates, and e-invoicing.",
    href: "/features/bill",
    color: "bg-amber-500/10 text-amber-600",
  },
  {
    icon: Package,
    name: "Kontafy Stock",
    subtitle: "Inventory",
    description:
      "Multi-warehouse tracking with batch & serial numbers, low stock alerts, reorder points, and barcode support.",
    href: "/features/stock",
    color: "bg-purple-500/10 text-purple-600",
  },
  {
    icon: Calculator,
    name: "Kontafy Tax",
    subtitle: "GST & Compliance",
    description:
      "Auto GSTR-1/3B generation, e-invoicing, e-way bills, TDS compliance, GSTN reconciliation, and HSN/SAC code management.",
    href: "/features/tax",
    color: "bg-red-500/10 text-red-600",
  },
  {
    icon: Landmark,
    name: "Kontafy Bank",
    subtitle: "Banking",
    description:
      "Auto bank feeds with smart reconciliation, multi-account support, transaction matching, and payment tracking.",
    href: "/features/bank",
    color: "bg-teal-500/10 text-teal-600",
  },
  {
    icon: Brain,
    name: "Kontafy Insight",
    subtitle: "Analytics & AI",
    description:
      "AI cash flow forecasting, P&L dashboards, balance sheet, custom reports, expense trends, and revenue analytics.",
    href: "/features/insight",
    color: "bg-pink-500/10 text-pink-600",
  },
  {
    icon: CreditCard,
    name: "Kontafy Pay",
    subtitle: "Payments",
    description:
      "UPI collection, payment links, auto-matching, payment reminders, multi-mode payments, and settlement tracking.",
    href: "/features/pay",
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    icon: ShoppingCart,
    name: "Kontafy Commerce",
    subtitle: "E-Commerce",
    description:
      "Amazon/Flipkart sync, Shopify/WooCommerce integration, order management, inventory sync, and returns handling.",
    href: "/features/commerce",
    color: "bg-orange-500/10 text-orange-600",
  },
  {
    icon: Plug,
    name: "Kontafy Connect",
    subtitle: "Integrations",
    description:
      "CRM integrations, payment gateways, logistics platforms, WhatsApp Business, CA collaboration portal, and API access.",
    href: "/features/connect",
    color: "bg-indigo-500/10 text-indigo-600",
  },
];

const stats = [
  { value: "9", label: "Integrated Modules" },
  { value: "100+", label: "Features" },
  { value: "50+", label: "Integrations" },
  { value: "99.9%", label: "Uptime" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function FeaturesOverviewClient() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-navy to-ink py-24 md:py-32">
        <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-green/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-green/5 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-4 inline-block rounded-full bg-green/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-green"
          >
            Features
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="font-heading text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-6xl"
          >
            One Platform, <span className="text-green">Nine Modules</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70 md:text-xl"
          >
            From bookkeeping and invoicing to AI-powered insights and e-commerce sync,
            Kontafy gives Indian businesses everything they need in a single, unified platform.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mt-10 flex items-center justify-center gap-4 flex-wrap"
          >
            <CTAButton variant="primary" size="lg" href="https://app.kontafy.com/signup">
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </CTAButton>
            <CTAButton
              variant="ghost"
              size="lg"
              href="/pricing"
              className="border-white/20 text-white hover:bg-white/10"
            >
              View Pricing
            </CTAButton>
          </motion.div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-border bg-surface py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="text-center"
              >
                <p className="font-heading text-3xl font-extrabold text-green md:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm font-medium text-muted">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Module Grid */}
      <section className="bg-white py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="All Modules"
            title="Explore every module"
            greenText="every module"
            description="Each module works independently or together, giving you the flexibility to start small and scale as your business grows."
            centered
          />

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((mod, i) => {
              const Icon = mod.icon;
              return (
                <motion.a
                  key={mod.name}
                  href={mod.href}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="group relative rounded-2xl border border-border bg-white p-6 transition-all duration-200 hover:shadow-xl hover:border-green/30"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${mod.color} transition-colors`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-heading text-lg font-bold text-ink">
                        {mod.name}
                      </h3>
                      <p className="text-xs font-semibold uppercase tracking-wider text-green">
                        {mod.subtitle}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-muted">
                    {mod.description}
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-green opacity-0 transition-opacity group-hover:opacity-100">
                    Learn more <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </motion.a>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it all works together */}
      <section className="bg-surface py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Unified Platform"
            title="Everything works together, seamlessly"
            greenText="seamlessly"
            description="No more juggling multiple tools. Kontafy modules share data automatically, so an invoice in Bill updates your Books, triggers a Tax entry, and reflects in Insight -- all in real time."
            centered
          />

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                title: "Automatic Data Flow",
                description:
                  "Create an invoice and it instantly updates your ledger, tax reports, and analytics. No duplicate entry, no manual sync.",
              },
              {
                title: "Single Source of Truth",
                description:
                  "All your financial data lives in one place. Every module reads from the same database, ensuring consistency everywhere.",
              },
              {
                title: "Modular & Flexible",
                description:
                  "Start with just Books and Bill. Add Stock, Tax, or any other module when you need it. Pay only for what you use.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-2xl border border-border bg-white p-8"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-green/10 font-heading text-lg font-bold text-green">
                  {i + 1}
                </div>
                <h3 className="font-heading text-lg font-bold text-ink">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {item.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-navy via-navy to-ink py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="font-heading text-3xl font-extrabold text-white md:text-4xl"
          >
            Ready to simplify your business finances?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/70"
          >
            Join thousands of Indian businesses using Kontafy to manage accounting,
            GST, invoicing, and more from a single platform.
          </motion.p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-10 flex items-center justify-center gap-4 flex-wrap"
          >
            <CTAButton variant="primary" size="lg" href="https://app.kontafy.com/signup">
              Get Started Free <ArrowRight className="h-4 w-4" />
            </CTAButton>
            <CTAButton
              variant="ghost"
              size="lg"
              href="/contact"
              className="border-white/20 text-white hover:bg-white/10"
            >
              Talk to Sales
            </CTAButton>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
