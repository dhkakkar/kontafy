"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "motion/react";
import {
  MessageCircle,
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import CTAButton from "@/components/shared/CTAButton";

/* ------------------------------------------------------------------ */
/*  Validation schema                                                  */
/* ------------------------------------------------------------------ */

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z
    .string()
    .min(10, "Please enter a valid phone number")
    .regex(/^[+]?\d[\d\s-]{8,}$/, "Please enter a valid phone number"),
  businessName: z.string().min(1, "Business name is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  source: z.string().min(1, "Please select how you heard about us"),
});

type ContactFormData = z.infer<typeof contactSchema>;

const sourceOptions = [
  "Google Search",
  "Social Media",
  "Referral from a friend",
  "Blog / Article",
  "YouTube",
  "CA / Accountant recommendation",
  "Other",
];

/* ------------------------------------------------------------------ */
/*  Form field wrapper                                                 */
/* ------------------------------------------------------------------ */

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Contact form                                                       */
/* ------------------------------------------------------------------ */

function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    // Placeholder: replace with actual API call
    console.log("Contact form submitted:", data);
    await new Promise((r) => setTimeout(r, 1000));
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center rounded-2xl border border-green/20 bg-green/5 p-12 text-center"
      >
        <CheckCircle className="h-16 w-16 text-green" />
        <h3 className="mt-6 text-2xl font-bold text-ink font-heading">
          Thank you!
        </h3>
        <p className="mt-3 max-w-sm text-muted">
          We have received your message and will get back to you within 24
          hours.
        </p>
      </motion.div>
    );
  }

  const inputClasses =
    "w-full rounded-lg border border-border bg-white px-4 py-2.5 text-sm text-ink placeholder:text-muted/60 transition-colors focus:border-green focus:outline-none focus:ring-2 focus:ring-green/20";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Name" error={errors.name?.message}>
          <input
            type="text"
            placeholder="Your full name"
            className={cn(inputClasses, errors.name && "border-red-400")}
            {...register("name")}
          />
        </FormField>

        <FormField label="Email" error={errors.email?.message}>
          <input
            type="email"
            placeholder="you@company.com"
            className={cn(inputClasses, errors.email && "border-red-400")}
            {...register("email")}
          />
        </FormField>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Phone" error={errors.phone?.message}>
          <input
            type="tel"
            placeholder="+91 98765 43210"
            className={cn(inputClasses, errors.phone && "border-red-400")}
            {...register("phone")}
          />
        </FormField>

        <FormField label="Business Name" error={errors.businessName?.message}>
          <input
            type="text"
            placeholder="Your business name"
            className={cn(
              inputClasses,
              errors.businessName && "border-red-400"
            )}
            {...register("businessName")}
          />
        </FormField>
      </div>

      <FormField
        label="How did you hear about us?"
        error={errors.source?.message}
      >
        <select
          className={cn(
            inputClasses,
            "appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2012%2012%22%3E%3Cpath%20fill%3D%22%235A7A9A%22%20d%3D%22M6%208L1%203h10z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat pr-10",
            errors.source && "border-red-400"
          )}
          defaultValue=""
          {...register("source")}
        >
          <option value="" disabled>
            Select an option
          </option>
          {sourceOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Message" error={errors.message?.message}>
        <textarea
          rows={5}
          placeholder="Tell us how we can help..."
          className={cn(
            inputClasses,
            "resize-none",
            errors.message && "border-red-400"
          )}
          {...register("message")}
        />
      </FormField>

      <button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          "inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green px-6 py-3 text-base font-bold text-white font-heading transition-colors duration-200 hover:bg-green-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          "cursor-pointer"
        )}
      >
        {isSubmitting ? (
          "Sending..."
        ) : (
          <>
            <Send className="h-4 w-4" aria-hidden="true" />
            Send Message
          </>
        )}
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Contact info sidebar                                               */
/* ------------------------------------------------------------------ */

function ContactInfo() {
  const items = [
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: "+91 98765 43210",
      href: "https://wa.me/919876543210",
      color: "bg-[#25D366]/10 text-[#25D366]",
    },
    {
      icon: Mail,
      label: "Email",
      value: "hello@kontafy.com",
      href: "mailto:hello@kontafy.com",
      color: "bg-green/10 text-green",
    },
    {
      icon: Phone,
      label: "Phone",
      value: "+91 98765 43210",
      href: "tel:+919876543210",
      color: "bg-navy/10 text-navy",
    },
    {
      icon: MapPin,
      label: "Office",
      value: "Syscode Technology Pvt Ltd, Yamunanagar, Haryana 135001",
      href: null,
      color: "bg-navy/10 text-navy",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold text-ink font-heading">
          Get in touch
        </h2>
        <p className="mt-2 text-muted">
          Have a question or need a demo? Reach out through any channel below
          and our team will respond within 24 hours.
        </p>
      </div>

      <div className="space-y-5">
        {items.map((item) => {
          const Icon = item.icon;
          const content = (
            <div className="flex items-start gap-4">
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
                  item.color
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {item.label}
                </p>
                <p className="mt-0.5 text-sm font-medium text-ink">
                  {item.value}
                </p>
              </div>
            </div>
          );

          if (item.href) {
            return (
              <a
                key={item.label}
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={
                  item.href.startsWith("http")
                    ? "noopener noreferrer"
                    : undefined
                }
                className="block rounded-xl border border-border p-4 transition-colors hover:border-green/30 hover:bg-green/5"
              >
                {content}
              </a>
            );
          }

          return (
            <div
              key={item.label}
              className="rounded-xl border border-border p-4"
            >
              {content}
            </div>
          );
        })}
      </div>

      {/* Google Maps placeholder */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="flex h-56 items-center justify-center bg-surface">
          <div className="text-center">
            <MapPin className="mx-auto h-10 w-10 text-muted/40" />
            <p className="mt-2 text-sm font-medium text-muted">Map</p>
            <p className="mt-1 text-xs text-muted/70">
              Yamunanagar, Haryana 135001
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main client component                                              */
/* ------------------------------------------------------------------ */

export default function ContactPageClient() {
  return (
    <div className="bg-white">
      {/* Hero strip */}
      <div className="bg-surface py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-3 text-sm font-semibold uppercase tracking-widest text-green"
          >
            Contact
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="text-4xl font-extrabold leading-tight text-ink font-heading md:text-5xl"
          >
            We would love to hear from you
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mx-auto mt-4 max-w-2xl text-lg text-muted"
          >
            Whether you have a question about features, pricing, or anything
            else — our team is ready to answer.
          </motion.p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left — Form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <h2 className="mb-6 text-xl font-bold text-ink font-heading">
              Send us a message
            </h2>
            <ContactForm />
          </motion.div>

          {/* Right — Contact info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <ContactInfo />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
