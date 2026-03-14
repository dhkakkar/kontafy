"use client";

import { motion } from "motion/react";
import { Upload, ArrowRightLeft, Rocket } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Upload Data",
    description:
      "Export your data from Tally, Busy, or any spreadsheet. We accept all common formats — no technical skills needed.",
  },
  {
    icon: ArrowRightLeft,
    title: "We Migrate",
    description:
      "Our migration team imports your chart of accounts, invoices, contacts, and ledgers — then verifies every entry.",
  },
  {
    icon: Rocket,
    title: "You're Live",
    description:
      "Log in to a fully set-up Kontafy account with all your historical data intact. You're ready to go.",
  },
];

export default function MigrationSection() {
  return (
    <section className="bg-navy py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mx-auto mb-6 max-w-3xl text-center"
        >
          <h2 className="text-3xl font-extrabold leading-tight text-white md:text-4xl">
            Switch from Tally or Busy —{" "}
            <span className="text-green">Free in 48 Hours</span>
          </h2>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          viewport={{ once: true }}
          className="mx-auto mb-10 max-w-2xl text-center text-lg text-white/70"
        >
          We handle the entire migration for you — completely free. Your chart of
          accounts, invoices, contacts, and ledgers move over with zero data loss.
        </motion.p>

        {/* Step cards */}
        <div className="relative mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
          {/* Dashed connector line (desktop) */}
          <div className="absolute top-14 left-[16.67%] right-[16.67%] hidden h-px border-t-2 border-dashed border-white/20 md:block" />

          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              viewport={{ once: true }}
              className="relative flex flex-col items-center text-center"
            >
              {/* Icon circle */}
              <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border-2 border-green bg-navy shadow-lg shadow-green/10">
                <step.icon className="h-8 w-8 text-green" />
              </div>

              <h3 className="mt-5 text-lg font-bold text-white">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-14 text-center"
        >
          <a
            href="#contact"
            className="inline-flex items-center rounded-lg bg-green px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
          >
            Book Free Migration
          </a>
          <p className="mt-4 text-sm text-white/60">
            Zero downtime. Zero cost. Under 48 hours.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
