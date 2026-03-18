"use client";

import { motion } from "motion/react";
import {
  ArrowRight,
  Cloud,
  MessageSquare,
  Brain,
  ShoppingCart,
  IndianRupee,
  Shield,
  Smartphone,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SectionHeading from "@/components/shared/SectionHeading";
import CTAButton from "@/components/shared/CTAButton";

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const comparisons = [
  {
    slug: "kontafy-vs-tally",
    competitor: "Tally",
    tagline: "Cloud-native accounting vs India's desktop giant",
    description:
      "Tally has been the standard for decades, but businesses are moving to the cloud. See how Kontafy gives you everything Tally does — plus WhatsApp billing, AI insights, and e-commerce sync — without the desktop lock-in.",
    highlights: [
      "Access from anywhere, not just your office PC",
      "Auto GST filing — no manual exports",
      "Starts free vs Tally's ₹18,000/year",
    ],
    color: "bg-blue-50",
    accent: "text-blue-600",
  },
  {
    slug: "kontafy-vs-busy",
    competitor: "Busy Accounting",
    tagline: "Modern cloud platform vs legacy desktop software",
    description:
      "Busy is affordable, but its dated interface and desktop-only approach hold businesses back. Kontafy delivers a modern experience with cloud access, WhatsApp billing, and marketplace sync.",
    highlights: [
      "Modern UI that your team will love",
      "WhatsApp invoicing built right in",
      "E-commerce marketplace sync",
    ],
    color: "bg-orange-50",
    accent: "text-orange-600",
  },
  {
    slug: "kontafy-vs-zoho-books",
    competitor: "Zoho Books",
    tagline: "India-first accounting vs a global tool adapted for India",
    description:
      "Zoho Books is a solid cloud tool, but it was built for global markets. Kontafy is designed ground-up for Indian businesses with deeper GST integration, WhatsApp billing, and built-in payroll.",
    highlights: [
      "Deeper GST — auto GSTR filing & e-invoicing",
      "WhatsApp billing (Zoho doesn't offer this)",
      "Built-in payroll vs separate Zoho Payroll add-on",
    ],
    color: "bg-purple-50",
    accent: "text-purple-600",
  },
];

const switchReasons = [
  {
    icon: Cloud,
    title: "Cloud-Native Access",
    description:
      "Work from your office, home, or on the go. No installations, no LAN, no VPN. Just open your browser.",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp Billing",
    description:
      "Send invoices, payment reminders, and receipts on WhatsApp — the app your customers already use daily.",
  },
  {
    icon: Brain,
    title: "AI-Powered Insights",
    description:
      "Cash flow forecasting, expense categorisation, and smart alerts that help you make better decisions.",
  },
  {
    icon: ShoppingCart,
    title: "E-Commerce Sync",
    description:
      "Auto-sync orders and inventory from Amazon, Flipkart, Shopify, and WooCommerce in real time.",
  },
  {
    icon: IndianRupee,
    title: "Transparent Pricing",
    description:
      "Start free and scale as you grow. No per-device fees, no hidden charges, no surprise renewals.",
  },
  {
    icon: Shield,
    title: "Bank-Grade Security",
    description:
      "256-bit encryption, daily backups, and SOC-2 aligned practices. Your data is safer in the cloud than on a local hard drive.",
  },
  {
    icon: Smartphone,
    title: "Mobile App",
    description:
      "Full-featured Android and iOS apps — create invoices, check reports, and manage inventory on the go.",
  },
  {
    icon: Zap,
    title: "Effortless Migration",
    description:
      "Import your Tally, Busy, or Zoho data in minutes. Our team helps you switch for free.",
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ComparePageClient() {
  return (
    <>
      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-surface to-white py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="mb-4 inline-block rounded-full bg-green/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-green">
              Compare
            </span>
            <h1 className="font-heading text-4xl font-extrabold leading-tight text-ink md:text-5xl lg:text-6xl">
              See How Kontafy{" "}
              <span className="text-green">Stacks Up</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              Thinking of switching your accounting software? Compare Kontafy
              against Tally, Busy, and Zoho Books feature-by-feature to find the
              perfect fit for your business.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ---- Comparison Cards ---- */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Head-to-Head"
            title="Pick a Comparison"
            greenText="Comparison"
            description="Detailed, honest breakdowns so you can make an informed decision."
            centered
          />

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {comparisons.map((c, i) => (
              <motion.a
                key={c.slug}
                href={`/compare/${c.slug}`}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={cn(
                  "group relative flex flex-col rounded-2xl border border-border p-8 transition-shadow hover:shadow-xl",
                  c.color,
                )}
              >
                <span
                  className={cn(
                    "mb-2 text-sm font-semibold uppercase tracking-wide",
                    c.accent,
                  )}
                >
                  Kontafy vs
                </span>
                <h3 className="font-heading text-2xl font-extrabold text-ink">
                  {c.competitor}
                </h3>
                <p className="mt-1 text-sm font-medium text-muted">
                  {c.tagline}
                </p>
                <p className="mt-4 text-base leading-relaxed text-muted/80">
                  {c.description}
                </p>

                <ul className="mt-6 space-y-2">
                  {c.highlights.map((h) => (
                    <li
                      key={h}
                      className="flex items-start gap-2 text-sm text-ink"
                    >
                      <span className="mt-0.5 text-green">&#10003;</span>
                      {h}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-6">
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-green transition-transform group-hover:translate-x-1">
                    View full comparison <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </motion.a>
            ))}
          </div>

          {/* SEO page card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8"
          >
            <a
              href="/compare/tally-alternative"
              className="group flex items-center justify-between rounded-2xl border border-border bg-navy/5 p-8 transition-shadow hover:shadow-xl"
            >
              <div>
                <span className="mb-1 block text-sm font-semibold uppercase tracking-wide text-navy">
                  SEO Guide
                </span>
                <h3 className="font-heading text-xl font-extrabold text-ink">
                  Best Tally Alternative in 2026
                </h3>
                <p className="mt-1 text-base text-muted">
                  A comprehensive guide comparing Tally alternatives — Kontafy,
                  Busy, and Zoho Books — with a step-by-step migration plan.
                </p>
              </div>
              <ArrowRight className="h-6 w-6 shrink-0 text-green transition-transform group-hover:translate-x-1" />
            </a>
          </motion.div>
        </div>
      </section>

      {/* ---- Why Businesses Switch ---- */}
      <section className="bg-surface py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Why Switch"
            title="Why Businesses Switch to Kontafy"
            greenText="Kontafy"
            description="From desktop lock-in to cloud freedom — here's what makes Kontafy the smart choice."
            centered
          />

          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {switchReasons.map((r, i) => (
              <motion.div
                key={r.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="rounded-xl border border-border bg-white p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green/10">
                  <r.icon className="h-6 w-6 text-green" />
                </div>
                <h4 className="mt-4 font-heading text-lg font-bold text-ink">
                  {r.title}
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {r.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="py-20 md:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="font-heading text-3xl font-extrabold text-ink md:text-4xl">
              Ready to Make the <span className="text-green">Switch</span>?
            </h2>
            <p className="mt-4 text-lg text-muted">
              Start free — no credit card required. Import your existing data in
              minutes and see the difference yourself.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <CTAButton variant="primary" size="lg" href="https://app.kontafy.com/signup">
                Start Free Trial
              </CTAButton>
              <CTAButton variant="ghost" size="lg" href="/demo">
                Book a Demo
              </CTAButton>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
