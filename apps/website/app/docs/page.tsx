"use client";

import { motion } from "motion/react";
import {
  Code2,
  Lock,
  FileText,
  Users,
  Package,
  CreditCard,
  BarChart3,
  Gauge,
  ArrowRight,
  Terminal,
  Copy,
  Mail,
  Info,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import SectionHeading from "@/components/shared/SectionHeading";
import CTAButton from "@/components/shared/CTAButton";

/* ------------------------------------------------------------------ */
/*  Data                                                                */
/* ------------------------------------------------------------------ */

const apiSections = [
  {
    icon: Lock,
    title: "Authentication",
    endpoints: 3,
    description:
      "OAuth 2.0 and API key authentication. Generate tokens, refresh sessions, and manage scopes for your integrations.",
  },
  {
    icon: FileText,
    title: "Invoices",
    endpoints: 12,
    description:
      "Create, update, and manage GST-compliant invoices. Supports e-invoicing, credit notes, debit notes, and bulk operations.",
  },
  {
    icon: Users,
    title: "Contacts",
    endpoints: 8,
    description:
      "Manage customers, vendors, and supplier records. GSTIN validation, outstanding balances, and transaction history.",
  },
  {
    icon: Package,
    title: "Inventory",
    endpoints: 10,
    description:
      "Track stock levels, manage items, set reorder points, and handle multi-warehouse inventory with batch and serial tracking.",
  },
  {
    icon: CreditCard,
    title: "Payments",
    endpoints: 7,
    description:
      "Record payments, manage receipts, and handle payment reconciliation. Supports UPI, bank transfer, and cash entries.",
  },
  {
    icon: BarChart3,
    title: "Reports",
    endpoints: 9,
    description:
      "Generate profit & loss, balance sheet, GST returns, trial balance, ageing reports, and custom financial summaries.",
  },
];

const rateLimits = [
  { plan: "Free", limit: "100 requests/min", burst: "20 req/sec" },
  { plan: "Pro", limit: "500 requests/min", burst: "50 req/sec" },
  { plan: "Business", limit: "2,000 requests/min", burst: "200 req/sec" },
];

const curlSnippet = `curl -X GET "https://api.kontafy.com/v1/invoices" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`;

const jsSnippet = `const response = await fetch(
  "https://api.kontafy.com/v1/invoices",
  {
    method: "POST",
    headers: {
      "Authorization": "Bearer YOUR_API_KEY",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customer_id: "cust_abc123",
      line_items: [
        {
          description: "Web Development Services",
          quantity: 1,
          rate: 25000,
          hsn_code: "998314",
          gst_rate: 18,
        },
      ],
      due_date: "2026-04-15",
    }),
  }
);

const invoice = await response.json();
console.log(invoice.data.invoice_number);
// → "INV-2026-0042"`;

const responseSnippet = `{
  "success": true,
  "data": {
    "id": "inv_7x9k2m",
    "invoice_number": "INV-2026-0042",
    "status": "draft",
    "customer": {
      "id": "cust_abc123",
      "name": "Acme Solutions Pvt Ltd",
      "gstin": "07AAACA1234A1Z5"
    },
    "subtotal": 25000,
    "cgst": 2250,
    "sgst": 2250,
    "total": 29500,
    "due_date": "2026-04-15",
    "created_at": "2026-03-14T10:30:00Z"
  }
}`;

/* ------------------------------------------------------------------ */
/*  Code block component                                                */
/* ------------------------------------------------------------------ */

function CodeBlock({
  code,
  language,
  active,
}: {
  code: string;
  language: string;
  active?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("relative", !active && "hidden")}>
      <button
        onClick={handleCopy}
        className="absolute right-3 top-3 flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs text-white/60 transition-colors hover:bg-white/20 hover:text-white cursor-pointer"
      >
        <Copy className="h-3 w-3" />
        {copied ? "Copied!" : "Copy"}
      </button>
      <pre className="overflow-x-auto rounded-xl bg-[#0D1117] p-5 text-sm leading-relaxed text-green-400">
        <code>{code}</code>
      </pre>
    </div>
  );
}

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

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<"curl" | "javascript">("curl");

  return (
    <div className="bg-white">
      {/* ── Hero ── */}
      <section className="bg-navy py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.4 }}
            className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-green"
          >
            <Code2 className="h-3.5 w-3.5" />
            Developers
          </motion.div>
          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="mx-auto max-w-4xl text-4xl font-extrabold leading-tight text-white font-heading md:text-5xl lg:text-6xl"
          >
            Kontafy <span className="text-green">API Documentation</span>
          </motion.h1>
          <motion.p
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-white/70"
          >
            Build powerful accounting integrations with our RESTful API.
            Everything you need to create invoices, manage contacts, track
            inventory, and generate reports programmatically.
          </motion.p>
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mt-8 inline-flex items-center gap-3 rounded-lg bg-white/5 px-5 py-2.5 font-mono text-sm text-white/80"
          >
            <Terminal className="h-4 w-4 text-green" />
            Base URL: https://api.kontafy.com/v1
          </motion.div>
        </div>
      </section>

      {/* ── Quick Start ── */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Quick Start"
            title="Make your first API call in minutes"
            greenText="first API call"
            description="Authenticate with your API key and start interacting with Kontafy resources right away."
          />

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            {/* Request */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-lg font-bold text-ink font-heading">
                  Request
                </h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => setActiveTab("curl")}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
                      activeTab === "curl"
                        ? "bg-navy text-white"
                        : "bg-surface text-muted hover:text-ink"
                    )}
                  >
                    cURL
                  </button>
                  <button
                    onClick={() => setActiveTab("javascript")}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
                      activeTab === "javascript"
                        ? "bg-navy text-white"
                        : "bg-surface text-muted hover:text-ink"
                    )}
                  >
                    JavaScript
                  </button>
                </div>
              </div>
              <CodeBlock
                code={curlSnippet}
                language="bash"
                active={activeTab === "curl"}
              />
              <CodeBlock
                code={jsSnippet}
                language="javascript"
                active={activeTab === "javascript"}
              />
            </motion.div>

            {/* Response */}
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <h3 className="mb-3 text-lg font-bold text-ink font-heading">
                Response
              </h3>
              <CodeBlock code={responseSnippet} language="json" active />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── API Sections ── */}
      <section className="bg-surface py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="API Reference"
            title="Everything you need to integrate with Kontafy"
            greenText="integrate"
            description="Our API covers the full accounting lifecycle — from creating invoices to generating compliance-ready reports."
            centered
          />

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {apiSections.map((section, i) => {
              const Icon = section.icon;
              return (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.06 * i }}
                  className="group rounded-2xl border border-border bg-white p-6 transition-colors hover:border-green/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-green/10 text-green">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-semibold text-muted">
                      {section.endpoints} endpoints
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-ink font-heading">
                    {section.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted leading-relaxed">
                    {section.description}
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-sm font-medium text-green opacity-0 transition-opacity group-hover:opacity-100">
                    View endpoints
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Rate Limits ── */}
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <SectionHeading
                eyebrow="Rate Limits"
                title="Built for scale"
                greenText="scale"
                description="Our API is designed to handle high-throughput workloads. Rate limits increase with your plan, and we support burst capacity for peak operations."
              />
              <div className="mt-6 space-y-2 text-sm text-muted">
                <p>
                  Rate limit headers are included in every response:{" "}
                  <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs text-ink">
                    X-RateLimit-Remaining
                  </code>
                  ,{" "}
                  <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs text-ink">
                    X-RateLimit-Reset
                  </code>
                </p>
                <p>
                  Exceeded limits return{" "}
                  <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs text-ink">
                    429 Too Many Requests
                  </code>{" "}
                  with a{" "}
                  <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs text-ink">
                    Retry-After
                  </code>{" "}
                  header.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 16 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="overflow-hidden rounded-2xl border border-border"
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface">
                    <th className="px-6 py-3.5 text-left font-semibold text-ink">
                      Plan
                    </th>
                    <th className="px-6 py-3.5 text-left font-semibold text-ink">
                      Rate Limit
                    </th>
                    <th className="px-6 py-3.5 text-left font-semibold text-ink">
                      Burst
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rateLimits.map((row) => (
                    <tr key={row.plan} className="bg-white">
                      <td className="px-6 py-3.5 font-medium text-ink">
                        {row.plan}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs text-muted">
                        {row.limit}
                      </td>
                      <td className="px-6 py-3.5 font-mono text-xs text-muted">
                        {row.burst}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── SDKs + CTA ── */}
      <section className="bg-surface py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2">
            {/* SDKs coming soon */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl border border-border bg-white p-8"
            >
              <Gauge className="h-8 w-8 text-navy" />
              <h3 className="mt-4 text-xl font-bold text-ink font-heading">
                Official SDKs — Coming Soon
              </h3>
              <p className="mt-3 text-muted leading-relaxed">
                We are building official client libraries to make integration
                even faster. First up:
              </p>
              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3 rounded-lg bg-surface px-4 py-3">
                  <span className="rounded bg-[#339933]/10 px-2 py-0.5 text-xs font-bold text-[#339933]">
                    Node.js
                  </span>
                  <code className="font-mono text-xs text-muted">
                    npm install @kontafy/sdk
                  </code>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-surface px-4 py-3">
                  <span className="rounded bg-[#3776AB]/10 px-2 py-0.5 text-xs font-bold text-[#3776AB]">
                    Python
                  </span>
                  <code className="font-mono text-xs text-muted">
                    pip install kontafy
                  </code>
                </div>
              </div>
            </motion.div>

            {/* Contact for API access */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex flex-col justify-between rounded-2xl bg-navy p-8"
            >
              <div>
                <Mail className="h-8 w-8 text-green" />
                <h3 className="mt-4 text-xl font-bold text-white font-heading">
                  Get API Access
                </h3>
                <p className="mt-3 text-white/60 leading-relaxed">
                  Want to build an integration with Kontafy? Reach out to our
                  developer relations team for early access, sandbox
                  credentials, and integration support.
                </p>
              </div>
              <div className="mt-6">
                <CTAButton variant="primary" href="mailto:api@kontafy.com">
                  Contact api@kontafy.com
                  <ArrowRight className="h-4 w-4" />
                </CTAButton>
              </div>
            </motion.div>
          </div>

          {/* Full docs coming soon note */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mt-8 flex items-start gap-3 rounded-xl border border-border bg-white p-5"
          >
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-navy" />
            <div>
              <p className="text-sm font-semibold text-ink">
                Full API documentation coming soon
              </p>
              <p className="mt-1 text-sm text-muted">
                We are actively building out our interactive API reference with
                request/response examples, webhook documentation, and sandbox
                environment. Subscribe to our developer newsletter or contact{" "}
                <a
                  href="mailto:api@kontafy.com"
                  className="font-medium text-green hover:text-green/80 underline underline-offset-2"
                >
                  api@kontafy.com
                </a>{" "}
                for early access.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
