"use client";

import { motion } from "motion/react";
import { RefreshCw, Package, FileCheck } from "lucide-react";

const bullets = [
  {
    icon: RefreshCw,
    title: "Auto-sync orders & returns",
    description:
      "Every sale, return, and cancellation from your marketplace flows into Kontafy automatically.",
  },
  {
    icon: Package,
    title: "Real-time inventory updates",
    description:
      "Sell on one platform, stock updates everywhere. No overselling, no manual counts.",
  },
  {
    icon: FileCheck,
    title: "Settlement reconciliation",
    description:
      "Match marketplace payouts against orders instantly. Know exactly what you earned after fees.",
  },
];

const marketplaces = ["Amazon", "Flipkart", "Shopify"];

export default function EcommerceSpotlight() {
  return (
    <section className="bg-surface py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left — Visual diagram */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="flex items-center justify-center"
          >
            <div className="relative flex w-full max-w-md items-center justify-center gap-6">
              {/* Marketplace badges */}
              <div className="flex flex-col gap-4">
                {marketplaces.map((name) => (
                  <div
                    key={name}
                    className="rounded-lg border border-border bg-white px-5 py-3 text-center text-sm font-semibold text-ink shadow-sm"
                  >
                    {name}
                  </div>
                ))}
              </div>

              {/* Arrows */}
              <div className="flex flex-col items-center justify-center gap-4">
                {marketplaces.map((name) => (
                  <span
                    key={name}
                    className="text-2xl text-muted"
                  >
                    &rarr;
                  </span>
                ))}
              </div>

              {/* Kontafy center card */}
              <div className="rounded-xl border-2 border-green bg-white px-6 py-8 text-center shadow-lg">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green/10">
                  <span className="text-lg font-bold text-green">K</span>
                </div>
                <p className="text-sm font-bold text-ink">Kontafy</p>
                <p className="mt-1 text-xs text-muted">
                  Unified accounting
                </p>
              </div>
            </div>
          </motion.div>

          {/* Right — Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-extrabold leading-tight text-ink md:text-4xl">
              Sell on Amazon, Flipkart, Shopify?{" "}
              <span className="text-green">
                Your Accounting Should Know.
              </span>
            </h2>

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
          </motion.div>
        </div>
      </div>
    </section>
  );
}
