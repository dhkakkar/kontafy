"use client";

import { motion } from "motion/react";
import { TrendingUp, AlertTriangle, Lightbulb } from "lucide-react";

const bullets = [
  {
    icon: TrendingUp,
    title: "90-day cash flow forecast",
    description:
      "AI analyses your receivables, payables, and seasonal trends to project cash flow three months ahead.",
  },
  {
    icon: AlertTriangle,
    title: "Risk alerts before they hit",
    description:
      "Get notified about potential cash crunches, overdue receivables, and expense spikes early.",
  },
  {
    icon: Lightbulb,
    title: "Actionable suggestions",
    description:
      "Not just data — Kontafy tells you what to do next: collect from whom, when to pay vendors, and more.",
  },
];

export default function AIInsightSpotlight() {
  return (
    <section className="bg-white py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left — Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-extrabold leading-tight text-ink md:text-4xl">
              Stop Guessing Your Cash Flow.{" "}
              <span className="text-green">Let AI Predict It.</span>
            </h2>

            <p className="mt-4 text-lg text-muted">
              Kontafy&apos;s AI engine turns your financial data into clear,
              forward-looking insights so you can plan with confidence.
            </p>

            <div className="mt-8 flex flex-col gap-6">
              {bullets.map((b) => (
                <div key={b.title} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green/10">
                    <b.icon className="h-5 w-5 text-green" />
                  </div>
                  <div>
                    <p className="font-semibold text-ink">{b.title}</p>
                    <p className="mt-1 text-sm text-muted">{b.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <a
              href="#pricing"
              className="mt-8 inline-flex items-center rounded-lg bg-green px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
            >
              Try AI Insights Free
            </a>
          </motion.div>

          {/* Right — Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="flex justify-center"
          >
            <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
              {/* Header */}
              <div className="border-b border-border px-5 py-3">
                <p className="text-sm font-semibold text-ink">
                  Cash Flow Forecast
                </p>
                <p className="text-xs text-muted">Next 90 days</p>
              </div>

              {/* Chart mockup — CSS bars */}
              <div className="flex items-end gap-2 px-5 pt-6 pb-2">
                {[65, 80, 55, 90, 70, 45, 85, 75, 60, 50, 40, 30].map(
                  (h, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center">
                      <div
                        className="w-full rounded-t"
                        style={{
                          height: `${h}px`,
                          background:
                            h < 50
                              ? "linear-gradient(to top, #ef4444, #fca5a5)"
                              : "linear-gradient(to top, var(--color-green, #22c55e), #86efac)",
                        }}
                      />
                    </div>
                  )
                )}
              </div>
              <div className="flex justify-between px-5 pb-4">
                <span className="text-[10px] text-muted">Mar</span>
                <span className="text-[10px] text-muted">Apr</span>
                <span className="text-[10px] text-muted">May</span>
              </div>

              {/* Alert card */}
              <div className="mx-5 mb-5 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600" />
                  <div>
                    <p className="text-xs font-semibold text-yellow-800">
                      Cash crunch likely March 28
                    </p>
                    <p className="mt-0.5 text-xs text-yellow-700">
                      Collect &#8377;2.4L in receivables to avoid shortfall.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
