import type { Metadata } from "next";
import KontafyVsZohoBooksClient from "./KontafyVsZohoBooksClient";

export const metadata: Metadata = {
  title: "Kontafy vs Zoho Books — Feature Comparison 2026 | Kontafy",
  description:
    "Compare Kontafy vs Zoho Books. India-first vs global-first, GST depth, WhatsApp billing, built-in payroll, pricing, and more. Find the right cloud accounting software for your Indian business.",
  keywords: [
    "Kontafy vs Zoho Books",
    "Zoho Books alternative",
    "Zoho Books vs Kontafy",
    "India accounting software",
    "best Zoho Books alternative",
    "cloud accounting India comparison",
    "GST accounting software",
  ],
  openGraph: {
    title: "Kontafy vs Zoho Books — India-First Beats Global-First",
    description:
      "Detailed comparison of Kontafy vs Zoho Books. Deeper GST integration, WhatsApp billing, built-in payroll, and better value for Indian businesses.",
    url: "https://kontafy.com/compare/kontafy-vs-zoho-books",
  },
};

export default function KontafyVsZohoBooksPage() {
  return <KontafyVsZohoBooksClient />;
}
