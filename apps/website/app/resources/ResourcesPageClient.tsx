"use client";

import { motion } from "motion/react";
import {
  FileText,
  BookOpen,
  ArrowRightLeft,
  Rss,
  ArrowRight,
} from "lucide-react";
import SectionHeading from "@/components/shared/SectionHeading";

const resources = [
  {
    icon: FileText,
    title: "GST Compliance Guide",
    description:
      "A comprehensive guide to GST registration, returns, e-invoicing, and input tax credit for Indian businesses. Everything you need to stay compliant.",
    href: "/resources/gst-guide",
    color: "bg-green/10 text-green",
  },
  {
    icon: BookOpen,
    title: "Accounting Glossary",
    description:
      "40+ accounting and tax terms explained in plain language. From Accounts Payable to Trial Balance — a quick-reference dictionary for business owners.",
    href: "/resources/accounting-glossary",
    color: "bg-navy/10 text-navy",
  },
  {
    icon: ArrowRightLeft,
    title: "Switch from Tally",
    description:
      "Step-by-step migration guide to move from Tally to Kontafy. Export your data, import it into Kontafy, and be up and running in 48 hours.",
    href: "/resources/switch-from-tally",
    color: "bg-amber-100 text-amber-700",
  },
  {
    icon: Rss,
    title: "Blog",
    description:
      "GST tips, product updates, business insights, and tax guides written for Indian SMBs. Stay informed and ahead of compliance changes.",
    href: "/blog",
    color: "bg-purple-100 text-purple-700",
  },
];

const fade = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.45 },
  }),
};

export default function ResourcesPageClient() {
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
              eyebrow="Resources"
              title="Learn, migrate, and master your finances"
              greenText="master your finances"
              description="Guides, glossaries, and playbooks curated for Indian businesses. Whether you're filing GST for the first time or switching from Tally — we've got you covered."
              centered
            />
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2">
          {resources.map((resource, i) => (
            <motion.a
              key={resource.title}
              href={resource.href}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fade}
              className="group flex flex-col rounded-2xl border border-border bg-white p-8 transition-all hover:border-green/30 hover:shadow-lg"
            >
              <div
                className={`mb-5 flex h-14 w-14 items-center justify-center rounded-xl ${resource.color}`}
              >
                <resource.icon className="h-7 w-7" />
              </div>
              <h3 className="font-heading text-xl font-bold text-ink">
                {resource.title}
              </h3>
              <p className="mt-3 flex-1 text-muted leading-relaxed">
                {resource.description}
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-green transition-transform group-hover:translate-x-1">
                Read more <ArrowRight className="h-4 w-4" />
              </span>
            </motion.a>
          ))}
        </div>
      </section>
    </div>
  );
}
