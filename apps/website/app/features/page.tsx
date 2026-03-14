import type { Metadata } from "next";
import FeaturesOverviewClient from "./FeaturesOverviewClient";

export const metadata: Metadata = {
  title: "Features — Kontafy",
  description:
    "Explore Kontafy's 9 powerful modules — from invoicing and GST compliance to AI insights and e-commerce sync. One platform for all your business needs.",
};

export default function FeaturesPage() {
  return <FeaturesOverviewClient />;
}
