import type { Metadata } from "next";
import SecurityPageClient from "./SecurityPageClient";

export const metadata: Metadata = {
  title: "Security & Compliance — Kontafy",
  description:
    "Bank-grade security for your financial data. 256-bit encryption, Indian data centres, daily backups, and SOC 2 compliance roadmap.",
};

export default function SecurityPage() {
  return <SecurityPageClient />;
}
