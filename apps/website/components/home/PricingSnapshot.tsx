"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { pricingPlans } from "@/lib/constants";
import { Check } from "lucide-react";

const planDescriptions: Record<string, string> = {
  Starter: "Everything you need to get started — free forever.",
  Silver: "For growing businesses that need inventory and banking.",
  Gold: "AI insights, payments, and advanced modules for scaling teams.",
};

// Only show Starter, Silver, Gold
const snapshotPlans = pricingPlans.filter((p) =>
  ["Starter", "Silver", "Gold"].includes(p.name)
);

export default function PricingSnapshot() {
  return (
    <section className="bg-surface py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section heading */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-extrabold text-ink md:text-4xl">
            Start Free.{" "}
            <span className="text-green">Scale When You&apos;re Ready.</span>
          </h2>
        </div>

        {/* Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {snapshotPlans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              viewport={{ once: true }}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition hover:shadow-lg",
                plan.popular
                  ? "border-green ring-2 ring-green/20"
                  : "border-border"
              )}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-green px-4 py-1 text-xs font-semibold text-white shadow-sm">
                  Most Popular
                </span>
              )}

              <h3 className="text-lg font-bold text-ink">{plan.name}</h3>

              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-ink">
                  {plan.price}
                </span>
                {plan.period && (
                  <span className="text-sm text-muted">{plan.period}</span>
                )}
              </div>

              <p className="mt-2 text-sm text-muted">{planDescriptions[plan.name]}</p>

              <ul className="mt-6 flex flex-1 flex-col gap-2">
                {plan.modules.map((mod) => (
                  <li
                    key={mod}
                    className="flex items-start gap-2 text-sm text-ink"
                  >
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green" />
                    {mod}
                  </li>
                ))}
              </ul>

              <a
                href="#pricing"
                className={cn(
                  "mt-6 block rounded-lg py-3 text-center text-sm font-semibold transition",
                  plan.popular
                    ? "bg-green text-white hover:opacity-90"
                    : "border border-border text-ink hover:bg-surface"
                )}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>

        {/* See all plans */}
        <div className="mt-8 text-center">
          <a
            href="/pricing"
            className="text-sm font-semibold text-green hover:underline"
          >
            See All Plans &rarr;
          </a>
        </div>
      </div>
    </section>
  );
}
