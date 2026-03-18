"use client";

import Navbar from "./Navbar";
import Footer from "./Footer";
import WhatsAppWidget from "@/components/shared/WhatsAppWidget";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <WhatsAppWidget />
    </>
  );
}
