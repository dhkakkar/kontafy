"use client";

import { motion } from "motion/react";
import { Send, CreditCard, Bell } from "lucide-react";

const features = [
  {
    icon: Send,
    title: "Send invoices via WhatsApp",
    description:
      "Deliver professional GST invoices directly to your customer's WhatsApp in one click.",
  },
  {
    icon: CreditCard,
    title: "One-tap UPI payment",
    description:
      "Customers pay instantly with UPI links embedded right inside the WhatsApp message.",
  },
  {
    icon: Bell,
    title: "Auto-tracked reminders",
    description:
      "Overdue? Kontafy sends gentle payment reminders on WhatsApp automatically.",
  },
];

export default function WhatsAppSpotlight() {
  return (
    <section className="bg-navy py-14 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Left — Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-extrabold leading-tight text-white md:text-4xl">
              Bill Your Customers Where They Already Are —{" "}
              <span className="text-green">WhatsApp</span>
            </h2>

            <div className="mt-8 flex flex-col gap-6">
              {features.map((f) => (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
                    <f.icon className="h-5 w-5 text-green" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{f.title}</p>
                    <p className="mt-1 text-sm text-white/70">
                      {f.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <a
              href="#demo"
              className="mt-8 inline-flex items-center rounded-lg border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              See WhatsApp Billing in Action
            </a>
          </motion.div>

          {/* Right — Phone mockup */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="flex justify-center"
          >
            <div className="w-full max-w-[300px] overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="aspect-[9/16] max-h-[500px] flex flex-col">
                {/* WhatsApp header */}
                <div className="flex items-center gap-3 bg-green px-4 py-3">
                  <div className="h-8 w-8 rounded-full bg-white/30" />
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Kontafy Business
                    </p>
                    <p className="text-xs text-white/70">Online</p>
                  </div>
                </div>

                {/* Chat area */}
                <div className="flex flex-1 flex-col gap-3 bg-[#ece5dd] p-3">
                  {/* Business message — invoice */}
                  <div className="max-w-[85%] self-start rounded-lg rounded-tl-none bg-white p-3 shadow-sm">
                    <p className="text-xs font-semibold text-ink">
                      Invoice #INV-1042
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Sharma Electronics
                    </p>
                    <p className="mt-1 text-sm font-bold text-ink">
                      &#8377;48,500
                    </p>
                    <div className="mt-2 rounded bg-green/10 px-2 py-1 text-center">
                      <p className="text-xs font-semibold text-green">
                        Pay Now via UPI
                      </p>
                    </div>
                    <p className="mt-1 text-right text-[10px] text-muted">
                      10:32 AM
                    </p>
                  </div>

                  {/* Customer reply */}
                  <div className="max-w-[70%] self-end rounded-lg rounded-tr-none bg-[#dcf8c6] p-3 shadow-sm">
                    <p className="text-sm text-ink">Paid &#9989;</p>
                    <p className="mt-1 text-right text-[10px] text-muted">
                      10:34 AM
                    </p>
                  </div>

                  {/* Payment confirmation */}
                  <div className="max-w-[85%] self-start rounded-lg rounded-tl-none bg-white p-3 shadow-sm">
                    <p className="text-xs text-green font-semibold">
                      &#9989; Payment received
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      &#8377;48,500 from Sharma Electronics via UPI. Invoice
                      marked as Paid.
                    </p>
                    <p className="mt-1 text-right text-[10px] text-muted">
                      10:34 AM
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
