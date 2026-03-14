"use client";

import { motion } from "motion/react";
import { painPoints } from "@/lib/constants";

export default function PainSolutionBridge() {
  return (
    <section className="bg-surface py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section heading */}
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold text-ink md:text-4xl">
            The Old Way vs{" "}
            <span className="text-green">The Kontafy Way</span>
          </h2>
        </div>

        {/* Rows */}
        <div className="flex flex-col gap-6">
          {painPoints.map((point, i) => (
            <motion.div
              key={point.category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              viewport={{ once: true }}
              className="grid gap-4 md:grid-cols-2"
            >
              {/* Old way */}
              <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-5">
                <span className="mt-0.5 text-lg">&#10060;</span>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-muted">
                    {point.category} — Old Way
                  </p>
                  <p className="text-sm text-muted">{point.oldWay}</p>
                </div>
              </div>

              {/* Kontafy way */}
              <div className="flex items-start gap-3 rounded-xl border border-green/20 bg-green/5 p-5">
                <span className="mt-0.5 text-lg">&#9989;</span>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-green">
                    {point.category} — Kontafy Way
                  </p>
                  <p className="text-sm text-ink">{point.newWay}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
