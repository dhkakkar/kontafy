"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import { cta } from "@/lib/constants";

const trustBadges = [
  "No Credit Card Required",
  "Free Plan Available",
  "GST Compliant",
  "256-bit Encrypted",
];

export default function FinalCTA() {
  return (
    <section className="bg-white py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mx-auto max-w-3xl text-center"
        >
          {/* Headline */}
          <h2 className="text-3xl font-extrabold text-ink md:text-4xl lg:text-5xl">
            {cta.headline}
          </h2>

          {/* Subheading */}
          <p className="mt-5 text-lg text-muted">{cta.subtext}</p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#pricing"
              className="inline-flex items-center rounded-lg bg-green px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:opacity-90"
            >
              {cta.ctaPrimary}
            </a>
            <a
              href="/demo"
              className="inline-flex items-center rounded-lg border border-border px-8 py-4 text-base font-semibold text-ink transition hover:bg-surface"
            >
              {cta.ctaSecondary}
            </a>
          </div>

          {/* Trust badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {trustBadges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center gap-1.5 text-sm text-muted"
              >
                <Check className="h-4 w-4 text-green" />
                {badge}
              </span>
            ))}
          </div>

          {/* Fine print */}
          <p className="mt-4 text-xs text-muted">No credit card required. Cancel anytime.</p>
        </motion.div>
      </div>
    </section>
  );
}
