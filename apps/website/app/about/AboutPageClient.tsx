"use client";

import { motion } from "motion/react";
import {
  Lightbulb,
  Globe,
  Cloud,
  ShieldCheck,
  Target,
  Users,
  ArrowRight,
} from "lucide-react";
import SectionHeading from "@/components/shared/SectionHeading";
import CTAButton from "@/components/shared/CTAButton";

const values = [
  {
    icon: Lightbulb,
    title: "Simplicity",
    description:
      "Accounting shouldn't need a manual. We strip away complexity so you can create an invoice in 30 seconds flat.",
  },
  {
    icon: Globe,
    title: "India-first",
    description:
      "Built ground-up for Indian tax laws, GST workflows, TDS rules, and the way Indian businesses actually operate.",
  },
  {
    icon: Cloud,
    title: "Cloud-native",
    description:
      "Access your books from anywhere — laptop, phone, or tablet. Your data is always synced, always safe.",
  },
  {
    icon: ShieldCheck,
    title: "Trust",
    description:
      "Bank-grade encryption, daily backups, and data hosted in Indian data centres. Your financial data is sacred to us.",
  },
];

const milestones = [
  { year: "2024", text: "Kontafy idea born at Syscode Technology" },
  { year: "2025", text: "Development begins — core accounting engine built" },
  { year: "2026", text: "Public launch with GST, invoicing, inventory & AI insights" },
];

const fade = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

export default function AboutPageClient() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-surface to-white">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-3xl text-center"
          >
            <span className="mb-4 inline-block rounded-full bg-green/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-green">
              About Kontafy
            </span>
            <h1 className="font-heading text-4xl font-extrabold leading-tight text-ink md:text-5xl lg:text-6xl">
              Built in India,{" "}
              <span className="text-green">for India</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              Kontafy is a modern, cloud-native accounting platform created to
              make professional-grade financial management accessible to every
              Indian business — from a one-person shop in Yamunanagar to a
              100-person company in Mumbai.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Our Story */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <SectionHeading
              eyebrow="Our Story"
              title="From frustration to foundation"
              description="Kontafy was founded by Syscode Technology Pvt Ltd in Yamunanagar, Haryana. We watched small business owners struggle with clunky, outdated accounting software that was built for a different era. Tally installs that couldn't sync across devices. Excel sheets that became unmanageable. GST filing that felt like decoding hieroglyphics."
            />
            <p className="mt-4 text-lg leading-relaxed text-muted">
              We asked a simple question:{" "}
              <strong className="text-ink">
                What if accounting software was as intuitive as the apps you
                already love?
              </strong>{" "}
              That question became Kontafy — a platform that handles the
              complexity behind the scenes so you can focus on what matters:
              growing your business.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="rounded-2xl border border-border bg-surface p-8"
          >
            <h3 className="font-heading text-xl font-bold text-ink">
              Our Journey
            </h3>
            <div className="mt-6 space-y-6">
              {milestones.map((m, i) => (
                <div key={i} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green/10 text-sm font-bold text-green">
                    {m.year}
                  </span>
                  <p className="pt-2 text-muted">{m.text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl border border-border bg-white p-8"
            >
              <Target className="mb-4 h-10 w-10 text-green" />
              <h3 className="font-heading text-2xl font-bold text-ink">
                Our Mission
              </h3>
              <p className="mt-3 text-lg leading-relaxed text-muted">
                To make modern, GST-compliant accounting accessible to every
                Indian business — regardless of size, technical skill, or
                budget. No business should have to choose between affordability
                and capability.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-2xl border border-border bg-white p-8"
            >
              <Lightbulb className="mb-4 h-10 w-10 text-navy" />
              <h3 className="font-heading text-2xl font-bold text-ink">
                Our Vision
              </h3>
              <p className="mt-3 text-lg leading-relaxed text-muted">
                Make accounting so simple that business owners can stop worrying
                about books and start focusing on growth. When the numbers take
                care of themselves, entrepreneurs can do what they do best —
                build.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Our Values"
          title="What drives us every day"
          centered
        />
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v, i) => (
            <motion.div
              key={v.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fade}
              className="rounded-2xl border border-border bg-white p-6 text-center"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-green/10">
                <v.icon className="h-7 w-7 text-green" />
              </div>
              <h3 className="font-heading text-lg font-bold text-ink">
                {v.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {v.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Users className="mx-auto mb-4 h-12 w-12 text-green" />
              <SectionHeading
                title="Our Team"
                description="We're a tight-knit team of engineers, designers, and accounting enthusiasts based in Haryana. We combine deep technical expertise with a genuine understanding of how Indian businesses work — because many of us come from business families ourselves."
                centered
              />
              <p className="mx-auto mt-4 max-w-2xl text-muted">
                Every feature in Kontafy is shaped by real conversations with
                shopkeepers, manufacturers, service providers, and chartered
                accountants across the country. We don&apos;t just build
                software — we solve real problems.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl bg-navy p-12 text-center"
        >
          <h2 className="font-heading text-3xl font-extrabold text-white md:text-4xl">
            Ready to join the Kontafy journey?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
            Whether you want to try the product, partner with us, or join the
            team — we&apos;d love to hear from you.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <CTAButton href="https://app.kontafy.com/signup" variant="primary" size="lg">
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </CTAButton>
            <CTAButton href="/contact" variant="ghost" size="lg" className="border-white/20 text-white hover:bg-white/10">
              Contact Us
            </CTAButton>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
