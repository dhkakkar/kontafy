import type { Metadata } from "next";
import BlogPageClient from "./BlogPageClient";

export const metadata: Metadata = {
  title: "Blog — Kontafy",
  description:
    "Accounting tips, GST guides, product updates, and business insights for Indian SMBs.",
};

export default function BlogPage() {
  return <BlogPageClient />;
}
