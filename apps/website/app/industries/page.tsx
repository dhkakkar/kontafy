"use client";

import { motion } from "motion/react";
import Link from "next/link";
import {
  ShoppingCart,
  Factory,
  Briefcase,
  Globe,
  TrendingUp,
  User,
  ArrowRight,
} from "lucide-react";
import SectionHeading from "@/components/shared/SectionHeading";
import CTAButton from "@/components/shared/CTAButton";

const industries = [
  {
    slug: "retail",
    title: "Retail & FMCG",
    description:
      "POS billing, real-time inventory tracking, and GST-compliant invoicing built for retail shops, chains, and FMCG distributors.",
    icon: ShoppingCart,
    modules: ["Books", "Bill", "Stock", "Tax", "Pay"],
    color: "bg-blue-50 text-blue-600",
  },
  {
    slug: "manufacturing",
    title: "Manufacturing",
    description:
      "BOM management, production costing, and multi-warehouse inventory designed for manufacturers of all sizes.",
    icon: Factory,
    modules: ["Books", "Bill", "Stock", "Tax", "Bank", "Insight"],
    color: "bg-orange-50 text-orange-600",
  },
  {
    slug: "services",
    title: "Professional Services",
    description:
      "Time-based billing, project invoicing, and expense tracking tailored for consultancies, agencies, and firms.",
    icon: Briefcase,
    modules: ["Books", "Bill", "Tax", "Bank", "Pay"],
    color: "bg-purple-50 text-purple-600",
  },
  {
    slug: "ecommerce",
    title: "E-Commerce Sellers",
    description:
      "Multi-marketplace sync, channel-wise inventory management, and automated returns accounting for online sellers.",
    icon: Globe,
    modules: ["Books", "Bill", "Stock", "Tax", "Commerce", "Connect"],
    color: "bg-green-50 text-green-600",
  },
  {
    slug: "traders",
    title: "Traders & Distributors",
    description:
      "Purchase-sale tracking, party-wise ledgers, credit management, and bulk GST filing for traders and distributors.",
    icon: TrendingUp,
    modules: ["Books", "Bill", "Stock", "Tax", "Bank"],
    color: "bg-red-50 text-red-600",
  },
  {
    slug: "freelancers",
    title: "Freelancers & Consultants",
    description:
      "Simple invoicing, expense tracking, and automated tax estimation for independent professionals.",
    icon: User,
    modules: ["Books", "Bill", "Tax", "Pay"],
    color: "bg-teal-50 text-teal-600",
  },
];

export default function IndustriesPage() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-white py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-3xl text-center"
          >
            <span className="mb-4 inline-block rounded-full bg-green/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-green">
              Industries
            </span>
            <h1 className="font-heading text-4xl font-extrabold leading-tight text-ink md:text-5xl lg:text-6xl">
              Accounting Built for{" "}
              <span className="text-green">Your Industry</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-muted">
              Every industry has unique financial workflows. Kontafy adapts to
              yours with purpose-built modules, industry-specific reports, and
              compliance features that actually make sense for your business.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Industries Grid */}
      <section className="bg-surface py-14 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {industries.map((industry, i) => {
              const Icon = industry.icon;
              return (
                <motion.div
                  key={industry.slug}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  viewport={{ once: true }}
                >
                  <Link
                    href={`/industries/${industry.slug}`}
                    className="group flex h-full flex-col rounded-2xl border border-border bg-white p-8 transition hover:border-green/30 hover:shadow-lg"
                  >
                    <div
                      className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl ${industry.color}`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>

                    <h3 className="font-heading text-xl font-bold text-ink">
                      {industry.title}
                    </h3>

                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                      {industry.description}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {industry.modules.map((mod) => (
                        <span
                          key={mod}
                          className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium text-muted"
                        >
                          {mod}
                        </span>
                      ))}
                    </div>

                    <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-green transition group-hover:gap-2.5">
                      Learn more
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
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
              Don&apos;t see your industry?
            </h2>
            <p className="mt-4 text-lg text-muted">
              Kontafy is flexible enough to work for any business. Talk to our
              team and we&apos;ll show you how it fits your workflow.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <CTAButton variant="primary" size="lg" href="/demo">
                Book a Demo
              </CTAButton>
              <CTAButton variant="ghost" size="lg" href="/contact">
                Contact Sales
              </CTAButton>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
