"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  FileText,
  TrendingUp,
  Lightbulb,
  Calculator,
  Mail,
  ArrowRight,
} from "lucide-react";
import SectionHeading from "@/components/shared/SectionHeading";
import CTAButton from "@/components/shared/CTAButton";

const categories = [
  {
    icon: Calculator,
    name: "GST Tips",
    description:
      "Practical GST filing tips, deadline reminders, and compliance strategies for Indian businesses.",
    count: "Coming soon",
    color: "bg-green/10 text-green",
  },
  {
    icon: TrendingUp,
    name: "Product Updates",
    description:
      "New features, improvements, and release notes from the Kontafy team.",
    count: "Coming soon",
    color: "bg-navy/10 text-navy",
  },
  {
    icon: Lightbulb,
    name: "Business Insights",
    description:
      "Cash flow management, pricing strategies, and growth tips for small business owners.",
    count: "Coming soon",
    color: "bg-amber-100 text-amber-700",
  },
  {
    icon: FileText,
    name: "Tax Guides",
    description:
      "In-depth guides on TDS, income tax, GST, and other Indian tax regulations.",
    count: "Coming soon",
    color: "bg-purple-100 text-purple-700",
  },
];

const upcomingArticles = [
  {
    category: "GST Tips",
    title: "GSTR-3B Filing: A Step-by-Step Guide for 2026-27",
    description: "Everything you need to file GSTR-3B correctly and on time.",
  },
  {
    category: "Business Insights",
    title: "5 Cash Flow Mistakes That Kill Small Businesses",
    description: "Common cash flow traps and how to avoid them.",
  },
  {
    category: "Product Updates",
    title: "Introducing AI-Powered Expense Categorisation",
    description: "Let Kontafy automatically categorise your expenses.",
  },
  {
    category: "Tax Guides",
    title: "TDS on Professional Services: Rates, Due Dates & Forms",
    description: "A complete guide to TDS deduction for service payments.",
  },
  {
    category: "GST Tips",
    title: "E-invoicing in 2026: What's Changed and What You Need to Do",
    description: "Updated e-invoicing thresholds and compliance requirements.",
  },
  {
    category: "Business Insights",
    title: "How to Price Your Services Without Undercharging",
    description: "A framework for service-based businesses to set profitable rates.",
  },
];

const fade = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
};

export default function BlogPageClient() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      console.log("Newsletter subscription:", email);
      setSubscribed(true);
    }
  };

  return (
    <div className="bg-white">
      <section className="bg-gradient-to-b from-surface to-white">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-3xl text-center"
          >
            <SectionHeading
              eyebrow="Blog"
              title="Insights for Indian businesses"
              greenText="Indian businesses"
              description="GST tips, accounting best practices, product updates, and business growth strategies — all in one place."
              centered
            />
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <h2 className="mb-8 text-center font-heading text-2xl font-bold text-ink">
          Browse by category
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fade}
              className="rounded-2xl border border-border bg-white p-6 text-center transition-shadow hover:shadow-md"
            >
              <div
                className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl ${cat.color}`}
              >
                <cat.icon className="h-7 w-7" />
              </div>
              <h3 className="font-heading text-lg font-bold text-ink">
                {cat.name}
              </h3>
              <p className="mt-2 text-sm text-muted">{cat.description}</p>
              <span className="mt-3 inline-block rounded-full bg-surface px-3 py-1 text-xs font-medium text-muted">
                {cat.count}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionHeading
            title="Coming up on the blog"
            description="Here's a preview of articles we're working on. Subscribe to get notified when they go live."
            centered
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingArticles.map((article, i) => (
              <motion.div
                key={article.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fade}
                className="flex flex-col rounded-2xl border border-border bg-white p-6"
              >
                <span className="mb-3 inline-block w-fit rounded-full bg-green/10 px-3 py-1 text-xs font-semibold text-green">
                  {article.category}
                </span>
                <h3 className="font-heading text-lg font-bold text-ink">
                  {article.title}
                </h3>
                <p className="mt-2 flex-1 text-sm text-muted">
                  {article.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-muted">
                  Coming soon <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-xl text-center"
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green/10">
            <Mail className="h-8 w-8 text-green" />
          </div>
          <h2 className="font-heading text-3xl font-extrabold text-ink">
            Stay in the loop
          </h2>
          <p className="mt-4 text-muted">
            Get GST tips, product updates, and business insights delivered to
            your inbox. No spam — just useful content for Indian businesses.
          </p>

          {subscribed ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-8 rounded-xl border border-green/20 bg-green/5 p-6"
            >
              <p className="font-semibold text-green">
                You&apos;re subscribed! We&apos;ll notify you when we publish new articles.
              </p>
            </motion.div>
          ) : (
            <form
              onSubmit={handleSubscribe}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <input
                type="email"
                required
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-full border border-border bg-white px-5 py-3 text-sm text-ink outline-none transition focus:border-green focus:ring-2 focus:ring-green/20"
              />
              <CTAButton type="submit" variant="primary" size="md">
                Subscribe
              </CTAButton>
            </form>
          )}
        </motion.div>
      </section>
    </div>
  );
}
