import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";
import LayoutShell from "@/components/layout/LayoutShell";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://kontafy.com"),
  title: "Kontafy — Accounting that works as hard as you do.",
  description:
    "Modern cloud accounting for Indian businesses. GST filing, WhatsApp billing, AI insights, e-commerce sync, and payroll — all in one platform.",
  keywords: [
    "accounting software",
    "GST billing",
    "Indian accounting",
    "cloud accounting",
    "invoicing",
    "WhatsApp billing",
    "inventory management",
    "tax compliance",
    "Kontafy",
  ],
  authors: [{ name: "Kontafy" }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://kontafy.com",
    siteName: "Kontafy",
    title: "Kontafy — Accounting that works as hard as you do.",
    description:
      "Modern cloud accounting for Indian businesses. GST filing, WhatsApp billing, AI insights, e-commerce sync, and payroll — all in one platform.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Kontafy — Cloud Accounting for Indian Businesses",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kontafy — Accounting that works as hard as you do.",
    description:
      "Modern cloud accounting for Indian businesses. GST filing, WhatsApp billing, AI insights, e-commerce sync, and payroll — all in one platform.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${inter.variable} antialiased`}>
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
