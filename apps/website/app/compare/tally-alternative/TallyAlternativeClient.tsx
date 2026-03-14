"use client";

import { motion } from "motion/react";
import {
  Cloud,
  MessageSquare,
  Brain,
  ShoppingCart,
  IndianRupee,
  TrendingUp,
  Lock,
  RefreshCw,
  Users,
  Check,
  X,
  ArrowRight,
  Upload,
  Search,
  Rocket,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SectionHeading from "@/components/shared/SectionHeading";
import CTAButton from "@/components/shared/CTAButton";

/* ------------------------------------------------------------------ */
/*  Why businesses look for alternatives                               */
/* ------------------------------------------------------------------ */

const painPoints = [
  {
    icon: Cloud,
    title: "Desktop Lock-In",
    description:
      "Tally ties your data to a single PC. In 2026, businesses need cloud access — work from anywhere, collaborate remotely, and access real-time data on mobile.",
  },
  {
    icon: IndianRupee,
    title: "Rising Costs",
    description:
      "TallyPrime Silver costs ₹18,000/year and Gold costs ₹54,000/year — per device. For a team of 5, that is ₹90,000 to ₹2,70,000 annually just for software licences.",
  },
  {
    icon: RefreshCw,
    title: "No Modern Integrations",
    description:
      "No e-commerce sync, no WhatsApp billing, no payment links. Tally was built before marketplaces and instant messaging became business essentials.",
  },
  {
    icon: Brain,
    title: "No AI or Automation",
    description:
      "Tally shows you data. Modern tools give you insights — cash flow forecasts, anomaly detection, and automated categorisation powered by AI.",
  },
  {
    icon: Lock,
    title: "Data Security Risks",
    description:
      "Local hard drives fail. Manual backups are forgotten. Cloud platforms offer automated backups, encryption, and disaster recovery by default.",
  },
  {
    icon: Users,
    title: "LAN-Only Multi-User",
    description:
      "Tally's multi-user mode requires everyone on the same local network. Remote teams, branch offices, and CAs working from their office are locked out.",
  },
];

/* ------------------------------------------------------------------ */
/*  Top reasons to switch                                              */
/* ------------------------------------------------------------------ */

const switchReasons = [
  {
    number: "01",
    title: "Cloud Access from Any Device",
    description:
      "Access your accounts from your laptop, phone, or tablet — at the office, at home, or on a business trip. No VPN, no remote desktop, no LAN.",
  },
  {
    number: "02",
    title: "WhatsApp Billing & Payment Links",
    description:
      "Send professional GST invoices via WhatsApp with embedded UPI payment links. Your customers pay faster, you get paid sooner.",
  },
  {
    number: "03",
    title: "AI-Powered Business Insights",
    description:
      "Cash flow forecasting, smart expense categorisation, anomaly detection, and proactive alerts — not just reports, but actionable intelligence.",
  },
  {
    number: "04",
    title: "Transparent, Affordable Pricing",
    description:
      "Start free, pay as you grow. No per-device fees. Kontafy Gold (₹11,999/yr) gives you more than Tally Gold (₹54,000/yr) — saving you 78%.",
  },
  {
    number: "05",
    title: "E-Commerce Marketplace Sync",
    description:
      "Auto-sync orders, inventory, and payments from Amazon, Flipkart, Shopify, and WooCommerce. No manual data entry, no reconciliation headaches.",
  },
];

/* ------------------------------------------------------------------ */
/*  4-Way Comparison Table                                             */
/* ------------------------------------------------------------------ */

interface FourWayRow {
  feature: string;
  kontafy: string;
  tally: string;
  busy: string;
  zoho: string;
}

interface FourWayCategory {
  name: string;
  rows: FourWayRow[];
}

const fourWayData: FourWayCategory[] = [
  {
    name: "Platform",
    rows: [
      { feature: "Architecture", kontafy: "Cloud-native", tally: "Desktop-first", busy: "Desktop-only", zoho: "Cloud" },
      { feature: "Mobile app", kontafy: "Full-featured", tally: "Limited (Tally on the Go)", busy: "Not available", zoho: "Good" },
      { feature: "Multi-device access", kontafy: "Unlimited", tally: "Per-licence", busy: "Per-licence", zoho: "Per-user" },
      { feature: "Auto updates", kontafy: "Yes", tally: "Manual", busy: "Manual", zoho: "Yes" },
      { feature: "Operating system", kontafy: "Any (browser)", tally: "Windows only", busy: "Windows only", zoho: "Any (browser)" },
    ],
  },
  {
    name: "GST & Compliance",
    rows: [
      { feature: "GST invoicing", kontafy: "Yes", tally: "Yes", busy: "Yes", zoho: "Yes" },
      { feature: "Auto GSTR filing", kontafy: "Yes", tally: "Export only", busy: "Export only", zoho: "Export only" },
      { feature: "E-invoicing", kontafy: "Built-in", tally: "Built-in", busy: "Built-in", zoho: "Add-on" },
      { feature: "E-way bills", kontafy: "Built-in", tally: "Built-in", busy: "Built-in", zoho: "Built-in" },
      { feature: "GST reconciliation", kontafy: "Automated", tally: "Manual", busy: "Semi-auto", zoho: "Semi-auto" },
    ],
  },
  {
    name: "Modern Features",
    rows: [
      { feature: "WhatsApp billing", kontafy: "Yes", tally: "No", busy: "No", zoho: "No" },
      { feature: "Payment links (UPI)", kontafy: "Yes", tally: "No", busy: "No", zoho: "Limited" },
      { feature: "AI cash flow forecast", kontafy: "Yes", tally: "No", busy: "No", zoho: "Limited" },
      { feature: "AI expense categorisation", kontafy: "Yes", tally: "No", busy: "No", zoho: "Basic" },
      { feature: "E-commerce sync", kontafy: "Amazon, Flipkart, Shopify, WooCommerce", tally: "No", busy: "No", zoho: "Shopify only" },
    ],
  },
  {
    name: "Inventory",
    rows: [
      { feature: "Multi-warehouse", kontafy: "Yes", tally: "Yes (godown)", busy: "Yes", zoho: "No" },
      { feature: "Batch & serial tracking", kontafy: "Yes", tally: "Yes", busy: "Yes", zoho: "Yes" },
      { feature: "E-commerce inventory sync", kontafy: "Yes", tally: "No", busy: "No", zoho: "Limited" },
    ],
  },
  {
    name: "Payroll",
    rows: [
      { feature: "Built-in payroll", kontafy: "Yes (Platinum+)", tally: "Yes (payroll add-on)", busy: "Yes (Enterprise)", zoho: "Separate product" },
      { feature: "PF / ESI / TDS", kontafy: "Built-in", tally: "Built-in", busy: "Built-in", zoho: "Separate product" },
    ],
  },
  {
    name: "Pricing (Annual)",
    rows: [
      { feature: "Free plan", kontafy: "Yes", tally: "No", busy: "No", zoho: "Yes (limited)" },
      { feature: "Entry plan", kontafy: "₹4,999", tally: "₹18,000 (Silver)", busy: "₹7,500 (Basic)", zoho: "₹11,999 (Standard)" },
      { feature: "Mid plan", kontafy: "₹11,999 (Gold)", tally: "₹54,000 (Gold)", busy: "₹15,000 (Standard)", zoho: "₹23,999 (Professional)" },
      { feature: "Premium plan", kontafy: "₹24,999 (Platinum)", tally: "₹54,000+ (Gold Multi)", busy: "₹24,000 (Enterprise)", zoho: "₹29,999 (Premium)" },
      { feature: "Per-device/user fees", kontafy: "No", tally: "Yes — per device", busy: "Yes — per device", zoho: "Yes — per user" },
    ],
  },
  {
    name: "Support",
    rows: [
      { feature: "Live chat", kontafy: "Yes", tally: "No", busy: "No", zoho: "Yes" },
      { feature: "Phone support", kontafy: "Yes", tally: "Yes", busy: "Yes", zoho: "Yes" },
      { feature: "Free migration help", kontafy: "Yes", tally: "N/A", busy: "N/A", zoho: "Limited" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Migration Steps                                                    */
/* ------------------------------------------------------------------ */

const migrationSteps = [
  {
    icon: Download,
    step: "Step 1",
    title: "Export Your Tally Data",
    description:
      "Use Tally's built-in export utility to export your masters (ledgers, stock items, parties) and transactions (vouchers, invoices) in XML or Excel format. Alternatively, use Kontafy's free migration tool that connects directly to your TallyPrime database.",
    time: "15-30 minutes",
  },
  {
    icon: Upload,
    step: "Step 2",
    title: "Upload to Kontafy",
    description:
      "Upload the exported files into Kontafy's import wizard. Our smart importer automatically maps Tally fields to Kontafy fields — ledger groups, voucher types, stock categories, and more. No manual data entry required.",
    time: "10-20 minutes",
  },
  {
    icon: Search,
    step: "Step 3",
    title: "Review & Verify",
    description:
      "Review the imported data using our side-by-side comparison tool. Check opening balances, outstanding invoices, inventory counts, and party balances. Our migration team joins a call to verify everything with you.",
    time: "30-60 minutes",
  },
  {
    icon: Rocket,
    step: "Step 4",
    title: "Go Live & Get Trained",
    description:
      "Start using Kontafy for all new transactions. We provide free onboarding training for your entire team — covering invoicing, GST filing, inventory, and reports. Dedicated support for the first 30 days.",
    time: "1 day",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function CellValue({ value }: { value: string }) {
  if (value === "Yes" || value === "Built-in" || value === "Automated") {
    return (
      <span className="flex items-center gap-1 text-green font-medium">
        <Check className="h-4 w-4" /> {value}
      </span>
    );
  }
  if (value === "No" || value === "Not available") {
    return (
      <span className="flex items-center gap-1 text-red-500">
        <X className="h-4 w-4" /> {value}
      </span>
    );
  }
  return <span>{value}</span>;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TallyAlternativeClient() {
  return (
    <>
      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy to-navy/90 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="mb-4 inline-block rounded-full bg-green/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-green">
                Tally Alternative 2026
              </span>
              <h1 className="font-heading text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-6xl">
                The Best{" "}
                <span className="text-green">Tally Alternative</span> for Indian
                Businesses in 2026
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-white/70">
                Tally has been India&apos;s accounting standard for decades. But as
                businesses embrace cloud, e-commerce, and WhatsApp, Tally&apos;s
                desktop-first approach is showing its age. Here is a
                comprehensive guide to the best Tally alternatives — and why
                Kontafy leads the pack.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <CTAButton variant="primary" size="lg" href="/signup">
                  Try Kontafy Free
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
        </div>
      </section>

      {/* ---- Why Businesses Are Looking ---- */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="The Problem"
            title="Why Businesses Are Looking for Tally Alternatives in 2026"
            greenText="Tally Alternatives"
            description="Tally served Indian businesses well for 30+ years. But the world has changed — and Tally hasn't kept up."
            centered
          />

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {painPoints.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-xl border border-border bg-white p-8"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-50">
                  <p.icon className="h-6 w-6 text-red-500" />
                </div>
                <h4 className="mt-4 font-heading text-lg font-bold text-ink">
                  {p.title}
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {p.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Top Reasons to Switch ---- */}
      <section className="bg-surface py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Why Switch"
            title="Top 5 Reasons to Switch from Tally to Kontafy"
            greenText="Kontafy"
            description="Here is what you gain when you move from desktop to cloud."
            centered
          />

          <div className="mx-auto mt-16 max-w-3xl space-y-8">
            {switchReasons.map((r, i) => (
              <motion.div
                key={r.number}
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex gap-6 rounded-xl border border-border bg-white p-8"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green/10 font-heading text-lg font-extrabold text-green">
                  {r.number}
                </div>
                <div>
                  <h4 className="font-heading text-lg font-bold text-ink">
                    {r.title}
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {r.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- 4-Way Comparison Table ---- */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Feature Comparison"
            title="Kontafy vs Tally vs Busy vs Zoho Books"
            greenText="Kontafy"
            description="A comprehensive, side-by-side comparison of the top 4 accounting software options for Indian businesses."
            centered
          />

          <div className="mt-16 space-y-12">
            {fourWayData.map((category, ci) => (
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
                  <table className="w-full min-w-[800px] text-left text-sm">
                    <thead>
                      <tr className="bg-surface">
                        <th className="px-5 py-4 font-semibold text-muted">
                          Feature
                        </th>
                        <th className="px-5 py-4 font-semibold text-green">
                          Kontafy
                        </th>
                        <th className="px-5 py-4 font-semibold text-muted">
                          Tally
                        </th>
                        <th className="px-5 py-4 font-semibold text-muted">
                          Busy
                        </th>
                        <th className="px-5 py-4 font-semibold text-muted">
                          Zoho Books
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
                          <td className="px-5 py-4 font-medium text-ink">
                            {row.feature}
                          </td>
                          <td className="px-5 py-4">
                            <CellValue value={row.kontafy} />
                          </td>
                          <td className="px-5 py-4 text-muted">
                            <CellValue value={row.tally} />
                          </td>
                          <td className="px-5 py-4 text-muted">
                            <CellValue value={row.busy} />
                          </td>
                          <td className="px-5 py-4 text-muted">
                            <CellValue value={row.zoho} />
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

      {/* ---- Migration Guide ---- */}
      <section className="bg-surface py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Migration Guide"
            title="How to Migrate from Tally to Kontafy"
            greenText="Migrate from Tally"
            description="A step-by-step guide to switching from Tally to Kontafy. Our team handles the heavy lifting — for free."
            centered
          />

          <div className="mx-auto mt-16 max-w-4xl space-y-8">
            {migrationSteps.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex gap-6 rounded-xl border border-border bg-white p-8"
              >
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-green/10">
                  <s.icon className="h-6 w-6 text-green" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-green">
                      {s.step}
                    </span>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-muted">
                      ~{s.time}
                    </span>
                  </div>
                  <h4 className="mt-1 font-heading text-lg font-bold text-ink">
                    {s.title}
                  </h4>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {s.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mx-auto mt-12 max-w-2xl rounded-xl border border-green/20 bg-green/5 p-6 text-center"
          >
            <p className="text-sm font-medium text-ink">
              <strong>Total migration time:</strong> Most businesses complete the
              switch in under half a day. Our migration team is with you every step
              of the way — completely free.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ---- FAQ / Content for SEO ---- */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="FAQ"
            title="Frequently Asked Questions"
            greenText="Questions"
            centered
          />

          <div className="mt-12 space-y-8">
            {[
              {
                q: "Can I import all my Tally data into Kontafy?",
                a: "Yes. Kontafy supports importing ledgers, vouchers, stock items, party masters, opening balances, and transaction history from TallyPrime and older Tally versions. Our migration tool handles the conversion automatically.",
              },
              {
                q: "Will my CA be able to use Kontafy?",
                a: "Absolutely. You can invite your CA as a user with read-only or full access. Since Kontafy is cloud-based, your CA can access your books from their own office — no physical data sharing or LAN required.",
              },
              {
                q: "Is Kontafy compliant with Indian GST regulations?",
                a: "Yes. Kontafy supports GST invoicing, e-invoicing (IRN generation), e-way bills, GSTR-1 and GSTR-3B auto-filing, TDS compliance, and GST reconciliation with GSTN — all built into the platform.",
              },
              {
                q: "What if I need help during migration?",
                a: "Our migration team provides free, hands-on assistance. We join a video call, walk you through the process, verify your data, and stay available for 30 days after you go live.",
              },
              {
                q: "Is my data secure in the cloud?",
                a: "Yes. Kontafy uses 256-bit AES encryption, automated daily backups, and SOC-2 aligned security practices. Your data is safer in the cloud than on a local hard drive that could fail or be stolen.",
              },
              {
                q: "Can I use Kontafy offline?",
                a: "Kontafy is designed for cloud use, but our mobile app supports offline invoice creation. Once you are back online, everything syncs automatically.",
              },
            ].map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <h3 className="font-heading text-lg font-bold text-ink">
                  {faq.q}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {faq.a}
                </p>
              </motion.div>
            ))}
          </div>
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
              Make 2026 the Year You{" "}
              <span className="text-green">Upgrade</span>
            </h2>
            <p className="mt-4 text-lg text-white/70">
              Join thousands of Indian businesses that have moved from Tally to
              Kontafy. Start free — no credit card, no installation, no lock-in.
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
            <p className="mt-6 text-sm text-white/50">
              Free migration assistance included. No credit card required.
            </p>
          </motion.div>
        </div>
      </section>
    </>
  );
}
