import type { Metadata } from "next";
import FeaturePageClient from "@/components/features/FeaturePageClient";
import type { FeaturePageData } from "@/components/features/FeaturePageClient";

export const metadata: Metadata = {
  title: "Kontafy Stock — Inventory Management | Kontafy",
  description:
    "Multi-warehouse inventory tracking with batch & serial numbers, low stock alerts, reorder points, stock transfers, and barcode support.",
};

const data: FeaturePageData = {
  eyebrow: "Kontafy Stock",
  title: "Inventory management without the guesswork",
  titleGreen: "without the guesswork",
  subtitle: "Real-time stock visibility across every warehouse, every channel.",
  heroDescription:
    "Kontafy Stock gives you complete control over your inventory with multi-warehouse tracking, automated alerts, batch management, and barcode scanning -- so you never overstock or run out.",
  features: [
    {
      icon: "Warehouse",
      title: "Multi-Warehouse Tracking",
      description:
        "Manage inventory across unlimited warehouses, stores, and locations. See consolidated stock levels or drill into any individual location.",
    },
    {
      icon: "Hash",
      title: "Batch & Serial Numbers",
      description:
        "Track products by batch or serial number for complete traceability. Essential for pharma, electronics, and food businesses.",
    },
    {
      icon: "BellRing",
      title: "Low Stock Alerts",
      description:
        "Get instant notifications when stock falls below your defined thresholds. Never miss a sale due to stockouts again.",
    },
    {
      icon: "RotateCcw",
      title: "Reorder Points",
      description:
        "Set automatic reorder points for each product. Kontafy generates purchase orders when stock hits the minimum level.",
    },
    {
      icon: "ArrowLeftRight",
      title: "Stock Transfer",
      description:
        "Transfer inventory between warehouses with full tracking. Record in-transit stock and confirm receipt at the destination.",
    },
    {
      icon: "ScanBarcode",
      title: "Barcode Support",
      description:
        "Scan barcodes to add, move, or sell products instantly. Generate and print barcode labels directly from Kontafy.",
    },
  ],
  workflowTitle: "From purchase to sale, fully tracked",
  workflowDescription:
    "Kontafy Stock connects your purchase orders, warehouse operations, and sales channels in a single flow.",
  workflowSteps: [
    {
      step: "Step 1",
      title: "Receive stock",
      description:
        "Record incoming stock from purchase orders or manual entries. Assign batch/serial numbers and allocate to warehouses automatically.",
    },
    {
      step: "Step 2",
      title: "Organize & track",
      description:
        "View real-time stock levels across all locations. Use barcode scanning for fast physical counts and cycle audits.",
    },
    {
      step: "Step 3",
      title: "Get alerts & reorder",
      description:
        "Receive low stock alerts and auto-generated purchase suggestions. Approve reorders with a single click.",
    },
    {
      step: "Step 4",
      title: "Sell & sync",
      description:
        "Stock levels update automatically when invoices are created or e-commerce orders come in. Every sale reduces inventory in real time.",
    },
  ],
  benefits: [
    {
      title: "Eliminate stockouts",
      description:
        "Smart alerts and reorder points ensure you always have the right products in stock when customers need them.",
    },
    {
      title: "Reduce excess inventory",
      description:
        "Trend analysis and demand insights help you avoid overstocking, freeing up cash tied in unsold goods.",
    },
    {
      title: "Complete traceability",
      description:
        "Track every item from purchase to sale with batch and serial number visibility. Meet regulatory requirements effortlessly.",
    },
    {
      title: "Multi-channel sync",
      description:
        "Inventory stays accurate whether you sell from your warehouse, retail store, or online marketplaces.",
    },
    {
      title: "Faster warehouse operations",
      description:
        "Barcode scanning and streamlined workflows reduce picking errors and speed up fulfillment.",
    },
    {
      title: "Accurate costing",
      description:
        "FIFO, weighted average, and specific identification costing methods keep your margins precise.",
    },
  ],
  ctaTitle: "Take control of your inventory today",
  ctaDescription:
    "Set up Kontafy Stock in minutes. Import your existing inventory from spreadsheets or other tools -- we handle the migration.",
};

export default function StockPage() {
  return <FeaturePageClient data={data} />;
}
