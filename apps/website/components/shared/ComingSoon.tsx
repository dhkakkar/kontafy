"use client";

import { motion } from "motion/react";
import { ArrowLeft, Bell } from "lucide-react";
import Link from "next/link";

interface ComingSoonProps {
  title: string;
  description: string;
  eyebrow?: string;
}

export default function ComingSoon({
  title,
  description,
  eyebrow,
}: ComingSoonProps) {
  return (
    <div className="bg-white">
      <div className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {eyebrow && (
            <span className="mb-4 inline-block rounded-full bg-green/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-green">
              {eyebrow}
            </span>
          )}

          <h1 className="text-4xl font-extrabold text-ink font-heading md:text-5xl">
            {title}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
            {description}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-surface"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-green px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <Bell className="h-4 w-4" />
              Get Notified
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
