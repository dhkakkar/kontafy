import type { Metadata } from "next";
import AboutPageClient from "./AboutPageClient";

export const metadata: Metadata = {
  title: "About Us — Kontafy",
  description:
    "Built in India, for India. Learn about Kontafy's mission to make modern accounting accessible to every Indian business. Founded by Syscode Technology in Yamunanagar, Haryana.",
};

export default function AboutPage() {
  return <AboutPageClient />;
}
