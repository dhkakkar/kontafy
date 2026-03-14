"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { industries } from "@/lib/constants";
import { cn } from "@/lib/utils";

const industryModules: Record<string, string[]> = {
  "Retail & Shops": ["Bill", "Stock", "Tax"],
  Manufacturing: ["Books", "Stock", "Tax"],
  "Professional Services": ["Bill", "Books", "Insight"],
  "E-Commerce": ["Commerce", "Stock", "Bank"],
  "Traders & Distributors": ["Bill", "Stock", "Books"],
  "Freelancers & Consultants": ["Bill", "Books", "Tax"],
};

export default function IndustryTabs() {
  const [activeTab, setActiveTab] = useState(0);
  const active = industries[activeTab];

  return (
    <section className="bg-white py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section heading */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-extrabold text-ink md:text-4xl">
            Built for <span className="text-green">Your Industry</span>
          </h2>
        </div>

        {/* Tab buttons */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {industries.map((ind, i) => (
            <button
              key={ind.name}
              onClick={() => setActiveTab(i)}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-medium transition",
                i === activeTab
                  ? "bg-green text-white shadow-sm"
                  : "bg-surface text-muted hover:bg-green/10 hover:text-green"
              )}
            >
              {ind.name}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="mx-auto max-w-2xl text-center"
          >
            <p className="text-lg text-muted">{active.description}</p>

            {/* Module badges */}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {(industryModules[active.name] ?? []).map((mod) => (
                <span
                  key={mod}
                  className="rounded-full bg-green/10 px-4 py-1.5 text-sm font-medium text-green"
                >
                  {mod}
                </span>
              ))}
            </div>

            {/* CTA link */}
            <a
              href={`/industries/${active.name.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")}`}
              className="mt-6 inline-block text-sm font-semibold text-green hover:underline"
            >
              Learn more about Kontafy for {active.name} &rarr;
            </a>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
