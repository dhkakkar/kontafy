import type { Metadata } from "next";
import KontafyVsTallyClient from "./KontafyVsTallyClient";

export const metadata: Metadata = {
  title: "Kontafy vs Tally — Feature Comparison 2026 | Kontafy",
  description:
    "Compare Kontafy vs Tally feature-by-feature. Cloud vs desktop, pricing, GST filing, WhatsApp billing, AI insights, and more. See why businesses are switching from Tally to Kontafy.",
  keywords: [
    "Kontafy vs Tally",
    "Tally alternative",
    "Tally vs Kontafy",
    "cloud accounting vs Tally",
    "best Tally alternative India",
    "TallyPrime alternative",
    "GST accounting software",
  ],
  openGraph: {
    title: "Kontafy vs Tally — Cloud-Native Beats Desktop",
    description:
      "Feature-by-feature comparison showing why Indian businesses are switching from Tally to Kontafy. Save up to 78% and get WhatsApp billing, AI, and e-commerce sync.",
    url: "https://kontafy.com/compare/kontafy-vs-tally",
  },
};

export default function KontafyVsTallyPage() {
  return <KontafyVsTallyClient />;
}
