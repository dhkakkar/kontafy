"use client";

import { motion } from "motion/react";
import {
  Eye,
  EyeOff,
  CreditCard,
  IndianRupee,
  Gift,
  ArrowRight,
  Info,
  Check,
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
/*  Side panel benefits                                                 */
/* ------------------------------------------------------------------ */

const benefits = [
  {
    icon: Gift,
    title: "Free Forever Plan",
    description:
      "Start with a generous free tier. No trial limits, no surprise charges. Upgrade only when you need more.",
  },
  {
    icon: CreditCard,
    title: "No Credit Card Required",
    description:
      "Sign up instantly with just your email or phone. We will never ask for payment details upfront.",
  },
  {
    icon: IndianRupee,
    title: "GST Ready from Day One",
    description:
      "GSTIN validation, e-invoicing, GSTR-1/3B prep, and TDS tracking — all built in from the start.",
  },
];

const checklist = [
  "Unlimited invoices on Free plan",
  "Multi-user access with role-based permissions",
  "Bank feeds & automatic reconciliation",
  "Inventory tracking & stock alerts",
  "Mobile app for Android & iOS",
];

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="flex min-h-screen bg-white">
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
            Start your{" "}
            <span className="text-green">accounting journey</span>
          </h2>
          <p className="mt-4 text-white/60 leading-relaxed">
            Join thousands of Indian businesses switching from legacy software
            to modern, cloud-native accounting.
          </p>
        </div>

        <div className="mt-10 space-y-6">
          {benefits.map((item, i) => {
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

          {/* Checklist */}
          <div className="mt-8 space-y-2.5 border-t border-white/10 pt-6">
            {checklist.map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <Check className="h-4 w-4 shrink-0 text-green" />
                <span className="text-sm text-white/70">{item}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-12 text-xs text-white/30">
          &copy; {new Date().getFullYear()} Kontafy by Syscode Technology Pvt Ltd
        </p>
      </motion.div>

      {/* ── Right: Sign Up Form ── */}
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
            Create your account
          </h1>
          <p className="mt-2 text-muted">
            Get started in under a minute. No credit card needed.
          </p>

          <form
            className="mt-8 space-y-5"
            onSubmit={(e) => e.preventDefault()}
          >
            {/* Full Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Rajesh Kumar"
                className={inputClasses}
              />
            </div>

            {/* Email + Phone */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="you@company.com"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink">
                  Phone
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  className={inputClasses}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
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
              <p className="mt-1 text-xs text-muted">
                Minimum 8 characters with at least one number
              </p>
            </div>

            {/* Business Name (optional) */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">
                Business Name{" "}
                <span className="font-normal text-muted">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="Your company or trade name"
                className={inputClasses}
              />
            </div>

            {/* Terms checkbox */}
            <label className="flex items-start gap-2.5 text-sm text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={() => setAgreed(!agreed)}
                className="mt-0.5 h-4 w-4 rounded border-border text-green accent-green"
              />
              <span>
                I agree to the{" "}
                <a
                  href="/terms"
                  className="font-medium text-green hover:text-green/80 underline underline-offset-2"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="/privacy"
                  className="font-medium text-green hover:text-green/80 underline underline-offset-2"
                >
                  Privacy Policy
                </a>
              </span>
            </label>

            {/* Submit */}
            <CTAButton variant="primary" size="md" className="w-full">
              Create Account
              <ArrowRight className="h-4 w-4" />
            </CTAButton>
          </form>

          {/* Sign in link */}
          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{" "}
            <a
              href="/sign-in"
              className="font-semibold text-green hover:text-green/80"
            >
              Sign in
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
              up will be available when Kontafy launches. Join our waitlist to be
              first in line.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
