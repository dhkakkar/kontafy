import type { Metadata } from "next";
import KontafyVsBusyClient from "./KontafyVsBusyClient";

export const metadata: Metadata = {
  title: "Kontafy vs Busy Accounting — Feature Comparison 2026 | Kontafy",
  description:
    "Compare Kontafy vs Busy Accounting. Cloud vs desktop, modern UI, GST auto-filing, WhatsApp billing, e-commerce sync, and pricing. See why businesses are choosing Kontafy over Busy.",
  keywords: [
    "Kontafy vs Busy",
    "Busy alternative",
    "Busy Accounting alternative",
    "cloud accounting vs Busy",
    "best Busy alternative India",
    "GST accounting software comparison",
  ],
  openGraph: {
    title: "Kontafy vs Busy Accounting — Modern Cloud Beats Legacy Desktop",
    description:
      "Detailed comparison of Kontafy vs Busy Accounting across features, pricing, UI, and more.",
    url: "https://kontafy.com/compare/kontafy-vs-busy",
  },
};

export default function KontafyVsBusyPage() {
  return <KontafyVsBusyClient />;
}
