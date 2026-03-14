import type { Metadata } from "next";
import PricingPageClient from "./PricingPageClient";

export const metadata: Metadata = {
  title: "Pricing — Kontafy",
  description:
    "Transparent pricing for every stage of your business. Start free, upgrade when you grow. No hidden fees, no surprises.",
};

export default function PricingPage() {
  return <PricingPageClient />;
}
