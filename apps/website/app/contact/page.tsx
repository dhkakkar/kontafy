import type { Metadata } from "next";
import ContactPageClient from "./ContactPageClient";

export const metadata: Metadata = {
  title: "Contact Us — Kontafy",
  description:
    "Get in touch with the Kontafy team. Whether you have a question about features, pricing, or need a demo — we are here to help.",
};

export default function ContactPage() {
  return <ContactPageClient />;
}
