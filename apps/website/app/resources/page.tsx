import type { Metadata } from "next";
import ResourcesPageClient from "./ResourcesPageClient";

export const metadata: Metadata = {
  title: "Resources — Kontafy",
  description:
    "GST guides, migration playbooks, accounting glossaries, and more — curated for Indian businesses.",
};

export default function ResourcesPage() {
  return <ResourcesPageClient />;
}
