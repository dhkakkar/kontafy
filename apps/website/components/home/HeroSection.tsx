"use client";

import { motion } from "motion/react";
import { Check, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  hero,
  dashboardMetrics,
  dashboardInvoices,
} from "@/lib/constants";

const statusColor: Record<string, string> = {
  Paid: "bg-green-100 text-green-700",
  Pending: "bg-yellow-100 text-yellow-700",
  Overdue: "bg-red-100 text-red-700",
};

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left column */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="flex flex-col gap-6"
          >
            {/* Eyebrow pill */}
            <span className="inline-flex w-fit items-center rounded-full bg-green/10 px-4 py-1.5 text-sm font-medium text-green">
              {hero.eyebrow}
            </span>

            {/* Headline */}
            <h1 className="text-4xl font-extrabold leading-tight text-ink md:text-5xl lg:text-6xl">
              {hero.headline.replace(hero.greenText, "")}{" "}
              <span className="text-green">{hero.greenText}</span>
            </h1>

            {/* Subheading */}
            <p className="max-w-lg text-lg text-muted">
              {hero.subheading}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="#pricing"
                className="inline-flex items-center rounded-lg bg-green px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
              >
                {hero.ctaPrimary}
              </a>
              <a
                href="#demo"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-semibold text-ink transition hover:bg-surface"
              >
                <Play className="h-4 w-4" />
                {hero.ctaSecondary}
              </a>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2">
              {hero.trustBadges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1.5 text-sm text-muted"
                >
                  <Check className="h-4 w-4 text-green" />
                  {badge}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Right column — Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
              {/* Top bar */}
              <div className="flex items-center gap-2 bg-navy px-4 py-2.5">
                <span className="h-3 w-3 rounded-full bg-red-400" />
                <span className="h-3 w-3 rounded-full bg-yellow-400" />
                <span className="h-3 w-3 rounded-full bg-green-400" />
                <span className="ml-3 text-xs font-medium text-white/80">
                  Kontafy Dashboard
                </span>
              </div>

              {/* Metric tiles */}
              <div className="grid grid-cols-3 gap-3 p-4">
                {dashboardMetrics.map((m) => (
                  <div
                    key={m.label}
                    className="rounded-lg border border-border bg-surface p-3"
                  >
                    <p className="text-xs text-muted">{m.label}</p>
                    <p className="mt-1 text-xl font-bold text-ink">
                      {m.value}
                    </p>
                    {m.trend && (
                      <span
                        className={cn(
                          "mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium",
                          m.trendDirection === "up"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        )}
                      >
                        {m.trend}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Invoice list */}
              <div className="px-4 pb-4">
                <p className="mb-2 text-xs font-semibold text-muted uppercase">
                  Recent Invoices
                </p>
                <div className="divide-y divide-border rounded-lg border border-border">
                  {dashboardInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-muted">
                          {inv.id}
                        </span>
                        <span className="text-ink">{inv.client}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-ink">
                          {inv.amount}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            statusColor[inv.status]
                          )}
                        >
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating notification */}
            <div className="animate-float absolute -bottom-4 -left-4 rounded-lg border-l-4 border-l-green bg-white px-4 py-3 shadow-lg sm:-left-8">
              <p className="text-xs font-semibold text-ink">
                GSTR-3B filed successfully &#10003;
              </p>
              <p className="text-xs text-muted">Just now</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
