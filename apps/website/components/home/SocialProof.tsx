"use client";

import { motion } from "motion/react";
import { Shield, Server, RefreshCw, Lock } from "lucide-react";

const testimonials = [
  {
    name: "Rajesh Sharma",
    business: "Sharma Electronics",
    city: "Yamunanagar",
    quote:
      "Kontafy replaced three different tools we were juggling. GST filing that used to take a full day now happens in minutes. Best decision for our business.",
  },
  {
    name: "Priya Mehta",
    business: "Mehta Traders",
    city: "Ambala",
    quote:
      "The WhatsApp billing feature alone was worth switching. Our customers pay faster because the invoice lands right in their chat. Outstanding collections dropped 40%.",
  },
  {
    name: "Vikram Patel",
    business: "Patel Hardware",
    city: "Karnal",
    quote:
      "We migrated from Tally and didn't lose a single entry. The Kontafy team handled everything. The AI cash flow predictions have been surprisingly accurate.",
  },
];

const securityBadges = [
  { icon: Shield, label: "256-bit encrypted" },
  { icon: Server, label: "Data hosted in India" },
  { icon: RefreshCw, label: "Daily backups" },
  { icon: Lock, label: "GDPR-ready" },
];

export default function SocialProof() {
  return (
    <section className="bg-surface py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Founding story */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="mx-auto mb-10 max-w-3xl text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-green">
            Our Story
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-ink md:text-4xl">
            Built by Syscode Technology, Yamunanagar
          </h2>
          <p className="mt-4 text-muted">
            We started Kontafy because we saw Indian businesses struggle with
            outdated accounting software that wasn&apos;t built for how India
            works — GST complexity, WhatsApp-first communication, patchy
            internet, and the need for affordable tools. Built from the ground
            up in Yamunanagar, Haryana, Kontafy is designed for the real India.
          </p>
        </motion.div>

        {/* Testimonials */}
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              viewport={{ once: true }}
              className="rounded-xl border border-border bg-white p-6 shadow-sm"
            >
              <p className="text-sm leading-relaxed text-muted">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-sm font-semibold text-ink">{t.name}</p>
                <p className="text-xs text-muted">
                  {t.business}, {t.city}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Security badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
          className="mt-16 flex flex-wrap items-center justify-center gap-8"
        >
          {securityBadges.map((badge) => (
            <div
              key={badge.label}
              className="flex items-center gap-2 text-sm text-muted"
            >
              <badge.icon className="h-5 w-5 text-green" />
              <span>{badge.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
