import type { Metadata } from "next";
import ComparePageClient from "./ComparePageClient";

export const metadata: Metadata = {
  title: "Compare Accounting Software — Kontafy vs Tally vs Busy vs Zoho Books",
  description:
    "Compare Kontafy against Tally, Busy Accounting, and Zoho Books. Feature-by-feature breakdowns, pricing, and honest analysis to help you choose the best accounting software for your Indian business.",
  keywords: [
    "compare accounting software",
    "Kontafy vs Tally",
    "Kontafy vs Busy",
    "Kontafy vs Zoho Books",
    "best accounting software India",
    "accounting software comparison",
    "Tally alternative",
    "cloud accounting India",
  ],
  openGraph: {
    title: "Compare Accounting Software — Kontafy",
    description:
      "Feature-by-feature comparison of Kontafy vs Tally, Busy, and Zoho Books. Find the best accounting software for your business.",
    url: "https://kontafy.com/compare",
  },
};

export default function ComparePage() {
  return <ComparePageClient />;
}
