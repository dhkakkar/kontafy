"use client";

import { motion } from "motion/react";
import {
  Lock,
  ShieldCheck,
  Server,
  RefreshCw,
  AlertTriangle,
  KeyRound,
  FileSearch,
  Bug,
  Globe,
  Database,
  Eye,
  UserCheck,
} from "lucide-react";
import SectionHeading from "@/components/shared/SectionHeading";

const securityFeatures = [
  {
    icon: Lock,
    title: "256-bit AES Encryption",
    description:
      "All data at rest is encrypted using AES-256, the same standard used by banks and governments worldwide.",
  },
  {
    icon: ShieldCheck,
    title: "SSL/TLS Encryption",
    description:
      "Every connection to Kontafy is protected with TLS 1.2+ encryption, ensuring data in transit is never exposed.",
  },
  {
    icon: Server,
    title: "Indian Data Centres",
    description:
      "Your data is hosted on AWS Mumbai (ap-south-1) — within India's borders, subject to Indian data protection laws.",
  },
  {
    icon: RefreshCw,
    title: "Daily Encrypted Backups",
    description:
      "Automated daily backups with 30-day retention, stored in geographically separate Indian data centres for disaster recovery.",
  },
  {
    icon: KeyRound,
    title: "Access Controls",
    description:
      "Role-based access control (RBAC) for your team. Multi-factor authentication (MFA) available for all accounts.",
  },
  {
    icon: Eye,
    title: "Audit Logging",
    description:
      "Every action in your account is logged with timestamps and user identity. View your complete activity trail anytime.",
  },
  {
    icon: AlertTriangle,
    title: "Incident Response",
    description:
      "Dedicated incident response process with 4-hour acknowledgement SLA. All incidents documented and reviewed post-resolution.",
  },
  {
    icon: Bug,
    title: "Penetration Testing",
    description:
      "Regular third-party penetration testing and vulnerability assessments to identify and remediate potential threats.",
  },
  {
    icon: FileSearch,
    title: "SOC 2 Compliance",
    description:
      "We are actively working towards SOC 2 Type II certification, with controls already implemented across our infrastructure.",
  },
  {
    icon: Globe,
    title: "GDPR Awareness",
    description:
      "While primarily serving Indian businesses, our data practices align with GDPR principles for data minimization and user rights.",
  },
  {
    icon: Database,
    title: "Data Isolation",
    description:
      "Each business account's data is logically isolated. No cross-account data access is possible, even at the infrastructure level.",
  },
  {
    icon: UserCheck,
    title: "Employee Security",
    description:
      "All team members undergo security training. Production access requires MFA and is limited to essential personnel only.",
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

export default function SecurityPageClient() {
  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-b from-surface to-white">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-3xl text-center"
          >
            <span className="mb-4 inline-block rounded-full bg-green/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-green">
              Security
            </span>
            <h1 className="font-heading text-4xl font-extrabold text-ink md:text-5xl lg:text-6xl">
              Your data is{" "}
              <span className="text-green">our responsibility</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              Financial data is the most sensitive information your business has.
              We treat it with the seriousness it deserves — using bank-grade
              security at every layer of the Kontafy platform.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Security Grid */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Security & Compliance"
          title="How we protect your business data"
          centered
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {securityFeatures.map((feature, i) => (
            <motion.div
              key={feature.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fade}
              className="rounded-2xl border border-border bg-white p-6 transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-green/10">
                <feature.icon className="h-6 w-6 text-green" />
              </div>
              <h3 className="font-heading text-lg font-bold text-ink">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Trust Banner */}
      <section className="bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-3xl text-center"
          >
            <h2 className="font-heading text-3xl font-extrabold text-ink md:text-4xl">
              Our security commitment
            </h2>
            <div className="mt-8 space-y-6 text-left text-muted leading-relaxed">
              <p>
                <strong className="text-ink">Data sovereignty:</strong> Your
                financial data never leaves India. Our primary infrastructure
                runs on AWS Mumbai, with backups in a separate Indian region.
              </p>
              <p>
                <strong className="text-ink">Transparency:</strong> We believe
                you have the right to know exactly how your data is handled. We
                will never sell your data, use it for advertising, or share it
                with third parties beyond what is necessary to operate the
                service.
              </p>
              <p>
                <strong className="text-ink">Continuous improvement:</strong> Security
                is not a destination — it is a process. We continuously invest in
                upgrading our defences, training our team, and adopting industry
                best practices.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-heading text-2xl font-bold text-ink">
            Report a vulnerability
          </h2>
          <p className="mt-4 text-muted leading-relaxed">
            If you discover a security vulnerability in Kontafy, please report
            it responsibly to{" "}
            <a
              href="mailto:security@kontafy.com"
              className="text-green underline underline-offset-2 hover:text-green/80"
            >
              security@kontafy.com
            </a>
            . We take all reports seriously and will respond within 24 hours.
          </p>
        </div>
      </section>
    </div>
  );
}
