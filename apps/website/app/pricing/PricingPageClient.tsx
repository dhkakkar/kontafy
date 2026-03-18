"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check, ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { pricingPlans } from "@/lib/constants";
import CTAButton from "@/components/shared/CTAButton";
import SectionHeading from "@/components/shared/SectionHeading";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Derive monthly price from annual: monthly ~ annual / 10 * 1.2 */
function getMonthlyPrice(annualPrice: string): string {
  const num = parseInt(annualPrice.replace(/[^\d]/g, ""), 10);
  if (isNaN(num) || num === 0) return annualPrice; // "Free" or "Contact Sales"
  const monthly = Math.round((num / 10) * 1.2);
  return `\u20B9${monthly.toLocaleString("en-IN")}`;
}

/* ------------------------------------------------------------------ */
/*  Comparison table data                                              */
/* ------------------------------------------------------------------ */

interface ComparisonRow {
  feature: string;
  starter: string;
  silver: string;
  gold: string;
  platinum: string;
  enterprise: string;
}

interface ComparisonCategory {
  name: string;
  rows: ComparisonRow[];
}

const comparisonData: ComparisonCategory[] = [
  {
    name: "Accounting",
    rows: [
      { feature: "Double-entry bookkeeping", starter: "Basic", silver: "Yes", gold: "Yes", platinum: "Yes", enterprise: "Yes" },
      { feature: "Chart of accounts", starter: "Default", silver: "Customisable", gold: "Customisable", platinum: "Customisable", enterprise: "Custom" },
      { feature: "Journal entries", starter: "Manual", silver: "Auto + Manual", gold: "Auto + Manual", platinum: "Auto + Manual", enterprise: "Auto + Manual" },
      { feature: "Multi-currency", starter: "--", silver: "--", gold: "Yes", platinum: "Yes", enterprise: "Yes" },
    ],
  },
  {
    name: "Invoicing",
    rows: [
      { feature: "Invoices per month", starter: "5", silver: "Unlimited", gold: "Unlimited", platinum: "Unlimited", enterprise: "Unlimited" },
      { feature: "Custom templates", starter: "--", silver: "3", gold: "10", platinum: "Unlimited", enterprise: "Unlimited" },
      { feature: "Recurring invoices", starter: "--", silver: "Yes", gold: "Yes", platinum: "Yes", enterprise: "Yes" },
      { feature: "Payment links (UPI)", starter: "--", silver: "--", gold: "Yes", platinum: "Yes", enterprise: "Yes" },
    ],
  },
  {
    name: "Inventory",
    rows: [
      { feature: "Stock tracking", starter: "--", silver: "Basic", gold: "Multi-warehouse", platinum: "Multi-warehouse", enterprise: "Multi-warehouse" },
      { feature: "Batch & serial numbers", starter: "--", silver: "--", gold: "Yes", platinum: "Yes", enterprise: "Yes" },
      { feature: "Low stock alerts", starter: "--", silver: "Yes", gold: "Yes", platinum: "Yes", enterprise: "Yes" },
    ],
  },
  {
    name: "GST & Tax",
    rows: [
      { feature: "GST summary", starter: "Yes", silver: "Yes", gold: "Yes", platinum: "Yes", enterprise: "Yes" },
      { feature: "GSTR-1 / GSTR-3B", starter: "--", silver: "Yes", gold: "Yes", platinum: "Yes", enterprise: "Yes" },
      { feature: "TDS compliance", starter: "--", silver: "--", gold: "Yes", platinum: "Yes", enterprise: "Yes" },
      { feature: "E-invoicing", starter: "--", silver: "--", gold: "Yes", platinum: "Yes", enterprise: "Yes" },
      { feature: "E-way bills", starter: "--", silver: "--", gold: "Yes", platinum: "Yes", enterprise: "Yes" },
    ],
  },
  {
    name: "Banking",
    rows: [
      { feature: "Bank connection", starter: "--", silver: "1 account", gold: "5 accounts", platinum: "10 accounts", enterprise: "Unlimited" },
      { feature: "Auto-reconciliation", starter: "--", silver: "Yes", gold: "Yes", platinum: "Yes", enterprise: "Yes" },
    ],
  },
  {
    name: "AI & Insights",
    rows: [
      { feature: "AI cash flow forecast", starter: "--", silver: "--", gold: "--", platinum: "30+ days", enterprise: "30+ days" },
      { feature: "AI expense categorisation", starter: "--", silver: "--", gold: "Yes", platinum: "Yes", enterprise: "Yes" },
      { feature: "Custom reports", starter: "--", silver: "Basic", gold: "Advanced", platinum: "Advanced", enterprise: "Custom" },
    ],
  },
  {
    name: "Payroll",
    rows: [
      { feature: "Payroll processing", starter: "--", silver: "--", gold: "--", platinum: "Yes", enterprise: "Yes" },
      { feature: "PF / ESI / TDS", starter: "--", silver: "--", gold: "--", platinum: "Yes", enterprise: "Yes" },
    ],
  },
  {
    name: "E-commerce",
    rows: [
      { feature: "Marketplace sync", starter: "--", silver: "--", gold: "--", platinum: "Yes", enterprise: "Yes" },
      { feature: "Shopify / WooCommerce", starter: "--", silver: "--", gold: "--", platinum: "Yes", enterprise: "Yes" },
    ],
  },
  {
    name: "Support",
    rows: [
      { feature: "Email support", starter: "Yes", silver: "Priority", gold: "Priority", platinum: "Priority", enterprise: "Priority" },
      { feature: "Phone support", starter: "--", silver: "--", gold: "Yes", platinum: "Yes", enterprise: "Dedicated" },
      { feature: "Chat support", starter: "--", silver: "--", gold: "Yes", platinum: "Yes", enterprise: "Yes" },
      { feature: "Account manager", starter: "--", silver: "--", gold: "--", platinum: "Yes", enterprise: "Dedicated" },
      { feature: "SLA guarantee", starter: "--", silver: "--", gold: "--", platinum: "--", enterprise: "Yes" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  FAQ data                                                           */
/* ------------------------------------------------------------------ */

const faqs = [
  {
    question: "Can I really use Kontafy for free?",
    answer:
      "Yes! The Starter plan is free forever. It includes basic bookkeeping, 5 invoices per month, a GST summary, and email support. No credit card required.",
  },
  {
    question: "How does the annual billing work?",
    answer:
      "When you choose annual billing, you pay upfront for the full year and save roughly 20% compared to monthly billing. You can switch between billing cycles at any time.",
  },
  {
    question: "Can I change my plan later?",
    answer:
      "Absolutely. You can upgrade or downgrade your plan at any time. When upgrading, you only pay the prorated difference. When downgrading, the remaining balance is credited to your account.",
  },
  {
    question: "What happens to my data if I cancel?",
    answer:
      "Your data remains accessible in read-only mode for 90 days after cancellation. You can export everything at any time. We never delete your data without explicit confirmation.",
  },
  {
    question: "Is there a refund policy?",
    answer:
      "Yes. We offer a full refund within 14 days of any paid plan purchase, no questions asked. After 14 days, you can still cancel and your subscription will remain active until the end of the billing cycle.",
  },
  {
    question: "How does the free migration work?",
    answer:
      "Our team handles the entire migration for you at no extra cost. We import your chart of accounts, contacts, invoices, and transaction history from Tally, Zoho, or spreadsheets. Most migrations complete within 48 hours.",
  },
  {
    question: "What are the limits on the free plan?",
    answer:
      "The Starter plan supports 1 user, 5 invoices per month, basic bookkeeping, and a GST summary. For unlimited invoices, inventory, bank reconciliation, and more, upgrade to Silver or above.",
  },
  {
    question: "Do you offer discounts for CAs managing multiple clients?",
    answer:
      "Yes! We have special partner pricing for Chartered Accountants. Contact our sales team to learn about bulk discounts and the CA collaboration portal.",
  },
];

/* ------------------------------------------------------------------ */
/*  Accordion component                                                */
/* ------------------------------------------------------------------ */

function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-5 text-left text-base font-semibold text-ink transition-colors hover:text-navy"
      >
        {title}
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden pb-5"
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Plan Card                                                          */
/* ------------------------------------------------------------------ */

function PlanCard({
  plan,
  isMonthly,
  index,
}: {
  plan: (typeof pricingPlans)[number];
  isMonthly: boolean;
  index: number;
}) {
  const displayPrice =
    plan.price === "Free"
      ? "Free"
      : isMonthly
        ? getMonthlyPrice(plan.price)
        : plan.price;

  const displayPeriod =
    plan.price === "Free" ? "forever" : isMonthly ? "/month" : plan.period;

  const isEnterprise = plan.name === "Enterprise";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className={cn(
        "relative flex flex-col rounded-2xl border bg-white p-6 transition-shadow duration-200",
        plan.popular
          ? "border-green shadow-xl ring-2 ring-green/20"
          : "border-border shadow-sm hover:shadow-md"
      )}
    >
      {/* Popular badge */}
      {plan.popular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green px-4 py-1 text-xs font-bold text-white">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Most Popular
          </span>
        </div>
      )}

      {/* Plan name */}
      <h3 className="text-lg font-bold text-ink font-heading">{plan.name}</h3>
      <p className="mt-1 text-sm text-muted">{plan.description}</p>

      {/* Price */}
      <div className="mt-6 mb-6">
        {isEnterprise ? (
          <p className="text-2xl font-extrabold text-ink font-heading">
            Custom
          </p>
        ) : (
          <>
            <span className="text-4xl font-extrabold text-ink font-heading">
              {displayPrice}
            </span>
            <span className="ml-1 text-sm text-muted">{displayPeriod}</span>
          </>
        )}
      </div>

      {/* Features */}
      <ul className="mb-8 flex-1 space-y-3">
        {plan.modules.map((mod) => (
          <li key={mod} className="flex items-start gap-2.5 text-sm text-ink">
            <Check
              className="mt-0.5 h-4 w-4 shrink-0 text-green"
              aria-hidden="true"
            />
            {mod}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <CTAButton
        variant={plan.popular ? "secondary" : "ghost"}
        size="md"
        href={isEnterprise ? "/contact" : "https://app.kontafy.com/signup"}
        className="w-full justify-center"
      >
        {plan.cta}
      </CTAButton>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Comparison Table                                                   */
/* ------------------------------------------------------------------ */

function ComparisonTable() {
  return (
    <div className="mt-24">
      <SectionHeading
        eyebrow="Feature Comparison"
        title="Compare every feature, plan by plan"
        centered
      />

      <div className="mt-12 space-y-0">
        {comparisonData.map((category) => (
          <Accordion key={category.name} title={category.name}>
            <div className="overflow-x-auto -mx-4 px-4">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-3 pr-4 text-left font-medium text-muted w-1/4">
                      Feature
                    </th>
                    <th className="px-3 py-3 text-center font-medium text-muted">
                      Starter
                    </th>
                    <th className="px-3 py-3 text-center font-medium text-muted">
                      Silver
                    </th>
                    <th className="px-3 py-3 text-center font-bold text-green">
                      Gold
                    </th>
                    <th className="px-3 py-3 text-center font-medium text-muted">
                      Platinum
                    </th>
                    <th className="px-3 py-3 text-center font-medium text-muted">
                      Enterprise
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {category.rows.map((row) => (
                    <tr
                      key={row.feature}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="py-3 pr-4 text-ink">{row.feature}</td>
                      <td className="px-3 py-3 text-center text-muted">
                        {row.starter}
                      </td>
                      <td className="px-3 py-3 text-center text-muted">
                        {row.silver}
                      </td>
                      <td className="px-3 py-3 text-center font-medium text-ink">
                        {row.gold}
                      </td>
                      <td className="px-3 py-3 text-center text-muted">
                        {row.platinum}
                      </td>
                      <td className="px-3 py-3 text-center text-muted">
                        {row.enterprise}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Accordion>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FAQ Section                                                        */
/* ------------------------------------------------------------------ */

function FAQSection() {
  return (
    <div className="mt-24">
      <SectionHeading
        eyebrow="FAQ"
        title="Frequently asked questions"
        centered
      />

      <div className="mx-auto mt-12 max-w-3xl">
        {faqs.map((faq) => (
          <Accordion key={faq.question} title={faq.question}>
            <p className="text-sm leading-relaxed text-muted">{faq.answer}</p>
          </Accordion>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page client component                                         */
/* ------------------------------------------------------------------ */

export default function PricingPageClient() {
  const [isMonthly, setIsMonthly] = useState(false);

  return (
    <div className="bg-white">
      {/* Hero */}
      <div className="bg-surface py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-3 text-sm font-semibold uppercase tracking-widest text-green"
          >
            Pricing
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="text-4xl font-extrabold leading-tight text-ink font-heading md:text-5xl lg:text-6xl"
          >
            Simple, Transparent Pricing
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mx-auto mt-5 max-w-2xl text-lg text-muted md:text-xl"
          >
            Start free. Upgrade when you grow.
          </motion.p>

          {/* Billing toggle */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mt-10 flex items-center justify-center gap-4"
          >
            <span
              className={cn(
                "text-sm font-medium transition-colors",
                isMonthly ? "text-ink" : "text-muted"
              )}
            >
              Monthly
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={!isMonthly}
              aria-label="Toggle annual billing"
              onClick={() => setIsMonthly((m) => !m)}
              className={cn(
                "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-2",
                !isMonthly ? "bg-green" : "bg-border"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
                  !isMonthly ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </button>

            <span
              className={cn(
                "text-sm font-medium transition-colors",
                !isMonthly ? "text-ink" : "text-muted"
              )}
            >
              Annual
              <span className="ml-1.5 rounded-full bg-green/10 px-2 py-0.5 text-xs font-bold text-green">
                Save 20%
              </span>
            </span>
          </motion.div>
        </div>
      </div>

      {/* Plan cards */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-4">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {pricingPlans.map((plan, i) => (
            <PlanCard
              key={plan.name}
              plan={plan}
              isMonthly={isMonthly}
              index={i}
            />
          ))}
        </div>
      </div>

      {/* Comparison table */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ComparisonTable />
      </div>

      {/* FAQ */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20 md:pb-28">
        <FAQSection />
      </div>
    </div>
  );
}
