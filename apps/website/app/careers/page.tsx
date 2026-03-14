"use client";

import { motion } from "motion/react";
import {
  Globe,
  Rocket,
  TrendingUp,
  Heart,
  Users,
  Lightbulb,
  Zap,
  MapPin,
  Briefcase,
  Mail,
  ArrowRight,
} from "lucide-react";
import SectionHeading from "@/components/shared/SectionHeading";
import CTAButton from "@/components/shared/CTAButton";

/* ------------------------------------------------------------------ */
/*  Data                                                                */
/* ------------------------------------------------------------------ */

const whyJoin = [
  {
    icon: Globe,
    title: "Remote-First Culture",
    description:
      "Work from anywhere in India. We believe great work happens when you have the freedom to choose your environment. Async-first communication, flexible hours.",
  },
  {
    icon: Rocket,
    title: "Real Impact",
    description:
      "Indian SMBs are stuck with 30-year-old software. You will build products that modernise accounting for millions of businesses across the country.",
  },
  {
    icon: TrendingUp,
    title: "Growth & Learning",
    description:
      "Annual learning budget, conference sponsorship, and the opportunity to work on hard engineering problems — from GST compliance to real-time bank reconciliation.",
  },
];

const values = [
  {
    icon: Heart,
    title: "Customer Obsession",
    description:
      "Every decision starts with the question: does this make life simpler for the business owner?",
  },
  {
    icon: Users,
    title: "Ownership Over Hierarchy",
    description:
      "We hire people who take initiative. No micro-management — you own your work end to end.",
  },
  {
    icon: Lightbulb,
    title: "Ship Fast, Learn Faster",
    description:
      "We favour speed over perfection. Weekly releases, tight feedback loops, and a bias toward action.",
  },
  {
    icon: Zap,
    title: "Transparency by Default",
    description:
      "Open roadmaps, public Slack channels, shared financials. Everyone sees the full picture.",
  },
];

const positions = [
  {
    title: "Full Stack Developer",
    type: "Full-time",
    location: "Remote (India)",
    tech: "Next.js, Node.js, PostgreSQL",
    description:
      "Build and ship user-facing features across our web application. You will work closely with design and product to deliver delightful accounting workflows — from invoice creation to GST filing.",
  },
  {
    title: "Senior Backend Engineer",
    type: "Full-time",
    location: "Remote (India)",
    tech: "Kotlin, Spring Boot, PostgreSQL",
    description:
      "Design and scale the core APIs powering Kontafy. You will own critical services including ledger engine, bank reconciliation, and multi-tenant data isolation.",
  },
  {
    title: "Product Designer",
    type: "Full-time",
    location: "Yamunanagar / Remote",
    tech: "Figma, Prototyping, User Research",
    description:
      "Turn complex accounting concepts into simple, intuitive interfaces. Lead user research with Indian SMB owners and translate insights into pixel-perfect designs.",
  },
  {
    title: "DevOps Engineer",
    type: "Full-time",
    location: "Remote (India)",
    tech: "AWS, Docker, Kubernetes, Terraform",
    description:
      "Build and maintain our cloud infrastructure for reliability and scale. Implement CI/CD pipelines, monitoring, and security best practices across all services.",
  },
  {
    title: "Sales Executive",
    type: "Full-time",
    location: "Pan India",
    tech: "B2B SaaS, CRM, Outbound Sales",
    description:
      "Drive Kontafy adoption among CAs, accountants, and SMB owners across India. Conduct product demos, manage your pipeline, and close deals that grow our customer base.",
  },
];

/* ------------------------------------------------------------------ */
/*  Animations                                                          */
/* ------------------------------------------------------------------ */

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function CareersPage() {
  return (
    <div className="bg-white">
      {/* ── Hero ── */}
      <section className="bg-navy py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.p
            {...fadeUp}
            transition={{ duration: 0.4 }}
            className="mb-4 text-sm font-semibold uppercase tracking-widest text-green"
          >
            Careers
          </motion.p>
          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="mx-auto max-w-4xl text-4xl font-extrabold leading-tight text-white font-heading md:text-5xl lg:text-6xl"
          >
            Build the future of{" "}
            <span className="text-green">accounting in India</span>
          </motion.h1>
          <motion.p
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-white/70"
          >
            We are a small, ambitious team replacing legacy accounting software
            with a cloud-native platform built for how Indian businesses
            actually work. Come help us get there.
          </motion.p>
        </div>
      </section>

      {/* ── Why Join Kontafy ── */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Why Kontafy"
            title="Why you should join us"
            greenText="join us"
            description="We are building something meaningful — and we want the best people alongside us."
            centered
          />

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {whyJoin.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  {...fadeUp}
                  transition={{ duration: 0.4, delay: 0.1 * i }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="rounded-2xl border border-border bg-surface p-8"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green/10 text-green">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 text-xl font-bold text-ink font-heading">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-muted leading-relaxed">
                    {item.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Culture & Values ── */}
      <section className="bg-surface py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Culture"
            title="Our values drive everything we build"
            greenText="values"
            description="These are not posters on a wall. They are the principles we use to make decisions every day."
            centered
          />

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.08 * i }}
                  className="rounded-2xl border border-border bg-white p-6"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-navy/10 text-navy">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-ink font-heading">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted leading-relaxed">
                    {item.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Open Positions ── */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Open Positions"
            title="Join our growing team"
            greenText="growing team"
            description="We are hiring across engineering, design, and sales. All roles are remote-friendly unless stated otherwise."
            centered
          />

          <div className="mt-14 space-y-5">
            {positions.map((pos, i) => (
              <motion.div
                key={pos.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.06 * i }}
                className="group rounded-2xl border border-border bg-white p-6 transition-colors hover:border-green/40 md:p-8"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-ink font-heading">
                      {pos.title}
                    </h3>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" />
                        {pos.type}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {pos.location}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-medium text-green">
                      {pos.tech}
                    </p>
                    <p className="mt-3 max-w-2xl text-muted leading-relaxed">
                      {pos.description}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <CTAButton
                      variant="ghost"
                      size="sm"
                      href="mailto:careers@kontafy.com"
                    >
                      Apply
                      <ArrowRight className="h-4 w-4" />
                    </CTAButton>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Apply CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mt-16 rounded-2xl bg-navy p-10 text-center md:p-14"
          >
            <Mail className="mx-auto h-10 w-10 text-green" />
            <h3 className="mt-5 text-2xl font-extrabold text-white font-heading md:text-3xl">
              Do not see your role listed?
            </h3>
            <p className="mx-auto mt-3 max-w-lg text-white/70">
              We are always looking for talented people. Send your resume and a
              short note about what excites you to:
            </p>
            <p className="mt-4">
              <a
                href="mailto:careers@kontafy.com"
                className="text-lg font-bold text-green underline underline-offset-4 hover:text-green/80"
              >
                careers@kontafy.com
              </a>
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
