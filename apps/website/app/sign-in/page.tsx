"use client";

import { motion } from "motion/react";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  BarChart3,
  FileText,
  ArrowRight,
  Info,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import CTAButton from "@/components/shared/CTAButton";

/* ------------------------------------------------------------------ */
/*  Input classes                                                       */
/* ------------------------------------------------------------------ */

const inputClasses =
  "w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-ink placeholder:text-muted/60 transition-colors focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20";

/* ------------------------------------------------------------------ */
/*  Side panel highlights                                               */
/* ------------------------------------------------------------------ */

const highlights = [
  {
    icon: FileText,
    title: "GST-Ready Invoicing",
    description: "Create compliant invoices in under 30 seconds.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Dashboard",
    description: "Track cash flow, receivables, and profit at a glance.",
  },
  {
    icon: ShieldCheck,
    title: "Bank-Grade Security",
    description: "256-bit encryption, SOC 2 practices, your data stays in India.",
  },
];

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-80px)] bg-white">
      {/* ── Left: Branding Panel ── */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="hidden w-[480px] shrink-0 flex-col justify-between bg-navy p-12 lg:flex xl:w-[540px]"
      >
        <div>
          <a href="/" className="text-2xl font-extrabold text-white font-heading">
            Kontafy
          </a>
          <h2 className="mt-10 text-3xl font-extrabold leading-tight text-white font-heading">
            Accounting that{" "}
            <span className="text-green">works for India</span>
          </h2>
          <p className="mt-4 text-white/60 leading-relaxed">
            Cloud-native, GST-ready, built for how Indian businesses actually
            operate. No installations, no annual fees, no friction.
          </p>
        </div>

        <div className="mt-12 space-y-6">
          {highlights.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + 0.1 * i }}
                className="flex items-start gap-4"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-green">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-sm text-white/50">
                    {item.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <p className="mt-12 text-xs text-white/30">
          &copy; {new Date().getFullYear()} Kontafy by Syscode Technology Pvt Ltd
        </p>
      </motion.div>

      {/* ── Right: Sign In Form ── */}
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <a
            href="/"
            className="mb-8 block text-2xl font-extrabold text-ink font-heading lg:hidden"
          >
            Kontafy
          </a>

          <h1 className="text-3xl font-extrabold text-ink font-heading">
            Welcome back
          </h1>
          <p className="mt-2 text-muted">
            Sign in to your Kontafy account to continue.
          </p>

          <form
            className="mt-8 space-y-5"
            onSubmit={(e) => e.preventDefault()}
          >
            {/* Email / Phone */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                Email or Phone
              </label>
              <input
                type="text"
                placeholder="you@company.com or +91 98765 43210"
                className={inputClasses}
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className={cn(inputClasses, "pr-11")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border text-green accent-green"
                />
                Remember me
              </label>
              <a
                href="#"
                className="text-sm font-medium text-green hover:text-green/80"
              >
                Forgot password?
              </a>
            </div>

            {/* Submit */}
            <CTAButton variant="primary" size="lg" className="w-full">
              Sign In
              <ArrowRight className="h-4 w-4" />
            </CTAButton>
          </form>

          {/* Sign up link */}
          <p className="mt-6 text-center text-sm text-muted">
            Do not have an account?{" "}
            <a
              href="/signup"
              className="font-semibold text-green hover:text-green/80"
            >
              Sign up
            </a>
          </p>

          {/* Coming soon note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="mt-8 flex items-start gap-3 rounded-xl border border-border bg-surface p-4"
          >
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-navy" />
            <p className="text-sm text-muted">
              <span className="font-semibold text-ink">Coming soon</span> — Sign
              in will be available when Kontafy launches. Join our waitlist to
              get early access.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
