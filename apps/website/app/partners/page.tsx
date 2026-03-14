import type { Metadata } from "next";
import PartnersPageClient from "./PartnersPageClient";

export const metadata: Metadata = {
  title: "CA Partner Program — Kontafy",
  description:
    "Join the Kontafy Partner Program for Chartered Accountants. Multi-client dashboard, bulk operations, revenue sharing, and dedicated support.",
};

export default function PartnersPage() {
  return <PartnersPageClient />;
}
