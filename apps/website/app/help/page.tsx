import type { Metadata } from "next";
import HelpPageClient from "./HelpPageClient";

export const metadata: Metadata = {
  title: "Help Centre — Kontafy",
  description:
    "Guides, tutorials, and FAQs to help you get the most out of Kontafy.",
};

export default function HelpPage() {
  return <HelpPageClient />;
}
