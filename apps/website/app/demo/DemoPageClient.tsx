"use client";

import { useState } from "react";
import { motion } from "motion/react";
import {
  Play,
  CheckCircle,
  Shield,
  Clock,
  Users,
  Send,
} from "lucide-react";
import SectionHeading from "@/components/shared/SectionHeading";
import CTAButton from "@/components/shared/CTAButton";

const benefits = [
  {
    icon: Play,
    title: "Personalised walkthrough",
    description: "See exactly how Kontafy works for your industry and use case.",
  },
  {
    icon: Clock,
    title: "30-minute session",
    description: "Quick, focused demo with time for all your questions.",
  },
  {
    icon: Users,
    title: "Expert-led",
    description: "Conducted by our product specialists who understand Indian accounting.",
  },
  {
    icon: Shield,
    title: "No commitment",
    description: "Explore the platform risk-free. No credit card required.",
  },
];

const trustBadges = [
  "256-bit encryption",
  "Data hosted in India",
  "14-day free trial",
  "Cancel anytime",
];

const companySizes = ["1-5 employees", "6-25 employees", "26-100 employees", "100+ employees"];
const interests = [
  "Accounting & Bookkeeping",
  "Invoicing & Billing",
  "GST Compliance",
  "Inventory Management",
  "All of the above",
];

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-green focus:ring-2 focus:ring-green/20";

export default function DemoPageClient() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    console.log("Demo form:", Object.fromEntries(formData));
    setSubmitted(true);
  };

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SectionHeading
              eyebrow="Book a Demo"
              title="See Kontafy in action"
              greenText="in action"
              description="Get a personalised walkthrough of the Kontafy platform. Our product specialist will show you how Kontafy can simplify your accounting, invoicing, and GST compliance."
            />

            <div className="mt-10 space-y-6">
              {benefits.map((b) => (
                <div key={b.title} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green/10">
                    <b.icon className="h-5 w-5 text-green" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-ink">{b.title}</h3>
                    <p className="mt-0.5 text-sm text-muted">{b.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              {trustBadges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted"
                >
                  <CheckCircle className="h-3.5 w-3.5 text-green" />
                  {badge}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="rounded-2xl border border-border bg-white p-8 shadow-lg"
          >
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-12 text-center"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green/10">
                  <CheckCircle className="h-8 w-8 text-green" />
                </div>
                <h3 className="font-heading text-2xl font-bold text-ink">
                  Demo request received!
                </h3>
                <p className="mt-3 max-w-sm text-muted">
                  Our team will reach out within 24 hours to schedule your
                  personalised demo. Check your email for confirmation.
                </p>
                <CTAButton href="/" variant="ghost" size="md" className="mt-6">
                  Back to Home
                </CTAButton>
              </motion.div>
            ) : (
              <>
                <h3 className="font-heading text-xl font-bold text-ink">
                  Request your free demo
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Fill in your details and we&apos;ll schedule a time that works
                  for you.
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Full Name">
                      <input
                        name="name"
                        type="text"
                        required
                        placeholder="Rahul Sharma"
                        className={inputClass}
                      />
                    </FormField>
                    <FormField label="Email Address">
                      <input
                        name="email"
                        type="email"
                        required
                        placeholder="rahul@company.com"
                        className={inputClass}
                      />
                    </FormField>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Phone Number">
                      <input
                        name="phone"
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        className={inputClass}
                      />
                    </FormField>
                    <FormField label="Company Name">
                      <input
                        name="company"
                        type="text"
                        required
                        placeholder="Your Business Name"
                        className={inputClass}
                      />
                    </FormField>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Company Size">
                      <select name="companySize" required className={inputClass}>
                        <option value="">Select size</option>
                        {companySizes.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Primary Interest">
                      <select name="interest" required className={inputClass}>
                        <option value="">Select interest</option>
                        {interests.map((interest) => (
                          <option key={interest} value={interest}>
                            {interest}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>

                  <CTAButton
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                  >
                    <Send className="h-4 w-4" />
                    Book My Free Demo
                  </CTAButton>

                  <p className="text-center text-xs text-muted">
                    By submitting, you agree to our{" "}
                    <a
                      href="/privacy"
                      className="text-green underline underline-offset-2"
                    >
                      Privacy Policy
                    </a>
                    . No spam, ever.
                  </p>
                </form>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
