"use client";

import { motion } from "motion/react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  UserPlus,
  Upload,
  CheckCircle,
  Rocket,
  Clock,
  Gift,
  HelpCircle,
} from "lucide-react";
import SectionHeading from "@/components/shared/SectionHeading";
import CTAButton from "@/components/shared/CTAButton";

const steps = [
  {
    icon: Download,
    step: "Step 1",
    title: "Export Data from Tally",
    description:
      "Open Tally ERP/Prime and export your data in XML or Excel format. Go to Gateway of Tally > Export > select the masters and vouchers you want to migrate. Export your Chart of Accounts, Party Ledgers, Stock Items, Sales & Purchase Vouchers, and Journal Entries.",
    tip: "Export data for the current financial year at minimum. For a complete migration, export the last 2-3 years.",
  },
  {
    icon: UserPlus,
    step: "Step 2",
    title: "Sign Up for Kontafy",
    description:
      "Create your Kontafy account at app.kontafy.com/signup. Set up your company profile with your business name, GSTIN, address, and financial year. This takes about 2 minutes.",
    tip: "Start with the free trial — no credit card required. You get full access to all features for 14 days.",
  },
  {
    icon: Upload,
    step: "Step 3",
    title: "Upload & Import Data",
    description:
      "Go to Settings > Import Data in Kontafy and upload the files you exported from Tally. Our import wizard will automatically map Tally fields to Kontafy fields. Review the mapping and click Import.",
    tip: "For large datasets, the import may take a few minutes. You will receive an email notification when it is complete.",
  },
  {
    icon: CheckCircle,
    step: "Step 4",
    title: "Verify Migrated Data",
    description:
      "After import, review your Chart of Accounts, party balances, opening stock, and recent transactions in Kontafy. Run a Trial Balance and compare it with your Tally Trial Balance to ensure everything matches.",
    tip: "Our team performs a free verification for all migration customers. We will flag any discrepancies before you go live.",
  },
  {
    icon: Rocket,
    step: "Step 5",
    title: "Start Using Kontafy",
    description:
      "Once verified, you are ready to go. Create your first invoice, record a payment, or file GST — all from the cloud. Invite your team members and accountant to collaborate in real time.",
    tip: "Bookmark our Help Centre at kontafy.com/help for quick answers to common questions.",
  },
];

const migratedData = [
  "Chart of Accounts (all ledger groups and sub-groups)",
  "Party Master (customers and suppliers with GSTIN, addresses, balances)",
  "Stock Items (with opening quantities, rates, HSN codes, and units)",
  "Sales & Purchase Invoices (with line items, tax details, and narrations)",
  "Journal Entries and Contra Entries",
  "Bank & Cash Transactions",
  "Opening Balances for all accounts",
  "Cost Centres and Cost Categories",
];

const faqs = [
  {
    q: "Will I lose any data during migration?",
    a: "No. Our import process preserves all transaction details, narrations, and relationships. We run automated checks post-import and our team does a manual review for every migration.",
  },
  {
    q: "Can I migrate data from Tally Prime and older Tally ERP 9?",
    a: "Yes. We support exports from both Tally Prime (2.x, 3.x, 4.x) and Tally ERP 9. The export format is the same.",
  },
  {
    q: "How long does the entire migration take?",
    a: "Most migrations are completed within 48 hours. The actual import takes minutes — the rest is verification and review. For large businesses with 5+ years of data, it may take up to 72 hours.",
  },
  {
    q: "Do I need to keep my Tally licence active after migration?",
    a: "No. Once your data is migrated and verified in Kontafy, you can discontinue your Tally subscription. We recommend keeping it active for 30 days as a safety net.",
  },
  {
    q: "Is there a cost for migration?",
    a: "Migration is completely free for all paid plans. We even assign a dedicated migration specialist to guide you through the process.",
  },
  {
    q: "Can I migrate mid-financial year?",
    a: "Absolutely. You can migrate at any point in the financial year. We will import your opening balances as of the migration date and all subsequent transactions.",
  },
];

const fade = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45 },
  }),
};

export default function SwitchFromTallyClient() {
  return (
    <div className="bg-white">
      <section className="bg-gradient-to-b from-surface to-white">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <Link
            href="/resources"
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Resources
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl"
          >
            <SectionHeading
              eyebrow="Migration Guide"
              title="Switch from Tally to Kontafy"
              greenText="Kontafy"
              description="Move your entire accounting from Tally to Kontafy in 5 simple steps. Free migration, dedicated support, and zero data loss — guaranteed."
            />
            <div className="mt-8 flex flex-wrap gap-4">
              <CTAButton href="https://app.app.kontafy.com/signup" variant="primary" size="lg">
                Start Free Migration
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
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-green" />
            <span className="text-sm font-semibold text-ink">48-hour migration</span>
          </div>
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-green" />
            <span className="text-sm font-semibold text-ink">100% free for paid plans</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green" />
            <span className="text-sm font-semibold text-ink">Zero data loss</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          title="5 steps to move from Tally to Kontafy"
          centered
        />
        <div className="mt-12 space-y-8">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fade}
              className="flex gap-6 rounded-2xl border border-border bg-white p-6 md:p-8"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green/10">
                <s.icon className="h-6 w-6 text-green" />
              </div>
              <div className="flex-1">
                <span className="text-xs font-bold uppercase tracking-widest text-green">
                  {s.step}
                </span>
                <h3 className="mt-1 font-heading text-xl font-bold text-ink">
                  {s.title}
                </h3>
                <p className="mt-2 text-muted leading-relaxed">{s.description}</p>
                <p className="mt-3 rounded-lg bg-surface px-4 py-2 text-sm text-muted">
                  <strong className="text-ink">Tip:</strong> {s.tip}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionHeading
            title="What data gets migrated"
            description="Everything you need to continue your accounting seamlessly."
            centered
          />
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {migratedData.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-xl border border-border bg-white p-4"
              >
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green" />
                <span className="text-sm text-ink">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading title="Frequently asked questions" centered />
        <div className="mt-10 space-y-6">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fade}
              className="rounded-xl border border-border bg-white p-6"
            >
              <div className="flex items-start gap-3">
                <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-green" />
                <div>
                  <h3 className="font-heading font-bold text-ink">{faq.q}</h3>
                  <p className="mt-2 text-sm text-muted leading-relaxed">{faq.a}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-navy p-12 text-center">
          <h2 className="font-heading text-3xl font-extrabold text-white md:text-4xl">
            Ready to leave Tally behind?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
            Start your free trial and we will migrate your data at no cost. Our
            team is ready to help.
          </p>
          <div className="mt-8">
            <CTAButton href="https://app.app.kontafy.com/signup" variant="primary" size="lg">
              Start Free Migration
            </CTAButton>
          </div>
        </div>
      </section>
    </div>
  );
}
