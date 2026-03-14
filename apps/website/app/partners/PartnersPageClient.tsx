"use client";

import { motion } from "motion/react";
import {
  Users,
  Layers,
  HeadphonesIcon,
  IndianRupee,
  GraduationCap,
  BarChart3,
  ArrowRight,
  CheckCircle,
  Shield,
  Zap,
  Building2,
} from "lucide-react";
import SectionHeading from "@/components/shared/SectionHeading";
import CTAButton from "@/components/shared/CTAButton";

const benefits = [
  {
    icon: Users,
    title: "Multi-Client Dashboard",
    description:
      "Manage all your clients from a single dashboard. Switch between businesses instantly without logging in and out.",
  },
  {
    icon: Layers,
    title: "Bulk Operations",
    description:
      "File GST returns, reconcile accounts, and generate reports for multiple clients in one go. Save hours every month.",
  },
  {
    icon: HeadphonesIcon,
    title: "Dedicated Support",
    description:
      "Priority support with a dedicated account manager. Direct phone and WhatsApp access for urgent queries.",
  },
  {
    icon: IndianRupee,
    title: "Revenue Sharing",
    description:
      "Earn recurring commissions for every client you bring to Kontafy. The more clients you manage, the more you earn.",
  },
  {
    icon: GraduationCap,
    title: "Free Training & Certification",
    description:
      "Get certified as a Kontafy Partner. Access exclusive training modules, webinars, and a partner knowledge base.",
  },
  {
    icon: BarChart3,
    title: "Client Insights",
    description:
      "AI-powered health scores, cash flow alerts, and compliance dashboards across your entire client portfolio.",
  },
];

const partnerTiers = [
  {
    name: "Silver",
    clients: "1-10 clients",
    features: [
      "Multi-client dashboard",
      "Email & chat support",
      "Partner badge",
      "10% commission",
    ],
  },
  {
    name: "Gold",
    clients: "11-50 clients",
    features: [
      "Everything in Silver",
      "Dedicated account manager",
      "Bulk operations",
      "15% commission",
      "Priority support",
    ],
    highlighted: true,
  },
  {
    name: "Platinum",
    clients: "50+ clients",
    features: [
      "Everything in Gold",
      "Custom branding options",
      "API access",
      "20% commission",
      "Quarterly business reviews",
      "Co-marketing opportunities",
    ],
  },
];

const fade = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45 },
  }),
};

export default function PartnersPageClient() {
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
              eyebrow="Partner Program"
              title="Grow your CA practice with Kontafy"
              greenText="Kontafy"
              description="Join the Kontafy Partner Program and give your clients modern, cloud-based accounting — while earning recurring revenue and managing everything from one dashboard."
              centered
            />
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <CTAButton href="/contact" variant="primary" size="lg">
                Become a Partner
                <ArrowRight className="h-5 w-5" />
              </CTAButton>
              <CTAButton href="/demo" variant="ghost" size="lg">
                Book a Demo
              </CTAButton>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-8 px-4 py-8 sm:px-6 lg:px-8">
          {[
            { icon: Building2, text: "Chartered Accountants" },
            { icon: Shield, text: "Tax Consultants" },
            { icon: Zap, text: "Accounting Firms" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-2">
              <item.icon className="h-5 w-5 text-green" />
              <span className="text-sm font-semibold text-ink">{item.text}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          title="Why CAs love partnering with Kontafy"
          centered
        />
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fade}
              className="rounded-2xl border border-border bg-white p-6 transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green/10">
                <b.icon className="h-6 w-6 text-green" />
              </div>
              <h3 className="font-heading text-lg font-bold text-ink">
                {b.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {b.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionHeading
            title="Partner tiers"
            description="The more clients you manage on Kontafy, the more benefits you unlock."
            centered
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {partnerTiers.map((tier, i) => (
              <motion.div
                key={tier.name}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fade}
                className={`rounded-2xl border p-8 ${
                  tier.highlighted
                    ? "border-green bg-white shadow-lg ring-2 ring-green/20"
                    : "border-border bg-white"
                }`}
              >
                {tier.highlighted && (
                  <span className="mb-4 inline-block rounded-full bg-green px-3 py-1 text-xs font-bold uppercase tracking-widest text-white">
                    Most Popular
                  </span>
                )}
                <h3 className="font-heading text-2xl font-extrabold text-ink">
                  {tier.name}
                </h3>
                <p className="mt-1 text-sm font-medium text-muted">
                  {tier.clients}
                </p>
                <ul className="mt-6 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green" />
                      <span className="text-sm text-ink">{feature}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading title="How to get started" centered />
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {[
            {
              step: "1",
              title: "Apply",
              description:
                "Fill out the partner application form. We review applications within 48 hours.",
            },
            {
              step: "2",
              title: "Onboard",
              description:
                "Complete a 30-minute onboarding session. Get certified and receive your partner credentials.",
            },
            {
              step: "3",
              title: "Grow",
              description:
                "Add your clients, manage their books from one dashboard, and earn commissions on every subscription.",
            },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fade}
              className="text-center"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green text-xl font-extrabold text-white">
                {item.step}
              </div>
              <h3 className="font-heading text-lg font-bold text-ink">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-muted">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl bg-navy p-12 text-center"
        >
          <h2 className="font-heading text-3xl font-extrabold text-white md:text-4xl">
            Ready to modernise your practice?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
            Join the growing network of CAs and tax professionals using Kontafy
            to manage their clients more efficiently.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <CTAButton href="/contact" variant="primary" size="lg">
              Apply Now
              <ArrowRight className="h-5 w-5" />
            </CTAButton>
            <CTAButton
              href="mailto:partners@kontafy.com"
              variant="ghost"
              size="lg"
              className="border-white/20 text-white hover:bg-white/10"
            >
              partners@kontafy.com
            </CTAButton>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
