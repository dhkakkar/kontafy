"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  Search,
  BookOpen,
  FileText,
  Package,
  Calculator,
  Landmark,
  BarChart3,
  Settings,
  ArrowRight,
  MessageCircle,
  Mail,
  Phone,
} from "lucide-react";
import SectionHeading from "@/components/shared/SectionHeading";
import CTAButton from "@/components/shared/CTAButton";

const categories = [
  {
    icon: BookOpen,
    title: "Getting Started",
    articles: [
      "Creating your Kontafy account",
      "Setting up your company profile",
      "Importing data from Tally or Excel",
      "Inviting team members",
    ],
  },
  {
    icon: FileText,
    title: "Invoicing",
    articles: [
      "Creating your first invoice",
      "Customising invoice templates",
      "Setting up recurring invoices",
      "Sending invoices via WhatsApp",
    ],
  },
  {
    icon: Package,
    title: "Inventory",
    articles: [
      "Adding products and stock items",
      "Managing stock levels and alerts",
      "Purchase orders and GRN",
      "Inventory valuation methods (FIFO/Weighted Avg)",
    ],
  },
  {
    icon: Calculator,
    title: "GST & Tax",
    articles: [
      "Configuring GST settings",
      "Generating GSTR-1 and GSTR-3B",
      "GSTR-2B reconciliation",
      "Setting up e-invoicing",
    ],
  },
  {
    icon: Landmark,
    title: "Banking",
    articles: [
      "Connecting your bank account",
      "Auto-matching bank transactions",
      "Recording payments and receipts",
      "Bank reconciliation walkthrough",
    ],
  },
  {
    icon: BarChart3,
    title: "Reports",
    articles: [
      "Understanding your dashboard",
      "Profit & Loss report",
      "Balance Sheet and Trial Balance",
      "Cash flow and receivables ageing",
    ],
  },
  {
    icon: Settings,
    title: "Account & Billing",
    articles: [
      "Upgrading or downgrading your plan",
      "Managing payment methods",
      "Downloading invoices and receipts",
      "Cancelling your subscription",
    ],
  },
];

const fade = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4 },
  }),
};

export default function HelpPageClient() {
  const [search, setSearch] = useState("");

  const filteredCategories = search
    ? categories
        .map((cat) => ({
          ...cat,
          articles: cat.articles.filter((a) =>
            a.toLowerCase().includes(search.toLowerCase())
          ),
        }))
        .filter((cat) => cat.articles.length > 0)
    : categories;

  return (
    <div className="bg-white">
      <section className="bg-gradient-to-b from-surface to-white">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-2xl text-center"
          >
            <SectionHeading
              eyebrow="Help Centre"
              title="How can we help you?"
              centered
            />
            <div className="relative mt-8">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search help articles..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full border border-border bg-white py-4 pl-12 pr-6 text-ink shadow-sm outline-none transition focus:border-green focus:ring-2 focus:ring-green/20"
              />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        {filteredCategories.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-lg text-muted">
              No articles found for &quot;{search}&quot;. Try a different search or{" "}
              <a href="#contact-support" className="text-green underline">
                contact support
              </a>
              .
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCategories.map((cat, i) => (
              <motion.div
                key={cat.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fade}
                className="rounded-2xl border border-border bg-white p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green/10">
                  <cat.icon className="h-6 w-6 text-green" />
                </div>
                <h3 className="font-heading text-lg font-bold text-ink">
                  {cat.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {cat.articles.map((article) => (
                    <li key={article}>
                      <a
                        href="#"
                        className="group flex items-center gap-2 text-sm text-muted transition hover:text-green"
                      >
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-0 transition group-hover:opacity-100" />
                        <span>{article}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <section id="contact-support" className="bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionHeading
            title="Still need help?"
            description="Our support team is available Monday to Saturday, 9 AM to 7 PM IST."
            centered
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl border border-border bg-white p-6 text-center"
            >
              <MessageCircle className="mx-auto mb-3 h-8 w-8 text-green" />
              <h3 className="font-heading font-bold text-ink">Live Chat</h3>
              <p className="mt-2 text-sm text-muted">
                Chat with our team in real time. Average response under 2
                minutes.
              </p>
              <CTAButton href="#" variant="ghost" size="sm" className="mt-4">
                Start Chat
              </CTAButton>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="rounded-2xl border border-border bg-white p-6 text-center"
            >
              <Mail className="mx-auto mb-3 h-8 w-8 text-green" />
              <h3 className="font-heading font-bold text-ink">Email Support</h3>
              <p className="mt-2 text-sm text-muted">
                Send us a detailed message and we&apos;ll respond within 4 hours.
              </p>
              <CTAButton
                href="mailto:support@kontafy.com"
                variant="ghost"
                size="sm"
                className="mt-4"
              >
                support@kontafy.com
              </CTAButton>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="rounded-2xl border border-border bg-white p-6 text-center"
            >
              <Phone className="mx-auto mb-3 h-8 w-8 text-green" />
              <h3 className="font-heading font-bold text-ink">Phone Support</h3>
              <p className="mt-2 text-sm text-muted">
                Available for Business and Enterprise plan customers during IST
                hours.
              </p>
              <CTAButton
                href="/contact"
                variant="ghost"
                size="sm"
                className="mt-4"
              >
                Contact Us
              </CTAButton>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
