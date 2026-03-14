import type { Metadata } from "next";
import DemoPageClient from "./DemoPageClient";

export const metadata: Metadata = {
  title: "Book a Demo — Kontafy",
  description:
    "See Kontafy in action with a personalised walkthrough. Book a free 30-minute demo with our product team.",
};

export default function DemoPage() {
  return <DemoPageClient />;
}
