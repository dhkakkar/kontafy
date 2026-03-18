"use client";

import { motion } from "motion/react";
import {
  BookOpen,
  FileText,
  Package,
  Scale,
  Landmark,
  BarChart3,
  CreditCard,
  ShoppingBag,
  Plug,
} from "lucide-react";
import { modules } from "@/lib/constants";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  BookOpen,
  FileText,
  Package,
  Scale,
  Landmark,
  BarChart3,
  CreditCard,
  ShoppingBag,
  Plug,
};

export default function ModuleCarousel() {
  return (
    <section className="bg-white py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section heading */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-extrabold text-ink md:text-4xl">
            9 Modules. <span className="text-green">One Platform.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
            Everything your business needs to manage finances — from invoicing
            to inventory, GST to payroll — all connected.
          </p>
        </div>

        {/* Scrollable container */}
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 scrollbar-hide">
          {modules.map((mod, i) => {
            const Icon = iconMap[mod.icon] ?? BookOpen;
            return (
              <motion.div
                key={mod.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                viewport={{ once: true }}
                className="w-[85vw] max-w-[400px] flex-shrink-0 snap-start rounded-xl border border-border bg-white p-6 transition hover:shadow-lg sm:w-[calc(50%-8px)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy/10">
                  <Icon className="h-6 w-6 text-navy" />
                </div>
                <h3 className="mt-4 font-bold text-ink">{mod.name}</h3>
                <p className="mt-1 text-sm font-medium text-green">
                  {mod.subtitle}
                </p>
                <p className="mt-2 text-sm text-muted">{mod.description}</p>
                <a
                  href={`/products/${mod.name.toLowerCase()}`}
                  className="mt-4 inline-block text-sm font-medium text-green hover:underline"
                >
                  Learn more &rarr;
                </a>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Hide scrollbar CSS */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </section>
  );
}
