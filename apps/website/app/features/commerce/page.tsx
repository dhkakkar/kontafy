import type { Metadata } from "next";
import FeaturePageClient from "@/components/features/FeaturePageClient";
import type { FeaturePageData } from "@/components/features/FeaturePageClient";

export const metadata: Metadata = {
  title: "Kontafy Commerce — E-Commerce Integration | Kontafy",
  description:
    "Sync orders and inventory from Amazon, Flipkart, Shopify, and WooCommerce. Manage orders, handle returns, and track everything from one dashboard.",
};

const data: FeaturePageData = {
  eyebrow: "Kontafy Commerce",
  title: "E-commerce accounting on autopilot",
  titleGreen: "on autopilot",
  subtitle: "Sync every marketplace. Track every order. Automate every entry.",
  heroDescription:
    "Kontafy Commerce connects your Amazon, Flipkart, Shopify, and WooCommerce stores to your accounting automatically. Orders, inventory, payments, and returns all flow into your books without manual effort.",
  features: [
    {
      icon: "ShoppingCart",
      title: "Amazon & Flipkart Sync",
      description:
        "Connect your marketplace seller accounts and sync orders, payments, fees, and settlements automatically. No manual downloads or data entry.",
    },
    {
      icon: "Store",
      title: "Shopify & WooCommerce",
      description:
        "Integrate your own online store built on Shopify or WooCommerce. Orders and payments flow into Kontafy in real time.",
    },
    {
      icon: "ClipboardList",
      title: "Order Management",
      description:
        "View all orders from every channel in a unified dashboard. Track order status, fulfillment, and delivery from one place.",
    },
    {
      icon: "RefreshCw",
      title: "Inventory Sync",
      description:
        "Keep inventory levels synchronized across all channels. Sell on Amazon and your Shopify stock updates automatically, preventing overselling.",
    },
    {
      icon: "Undo2",
      title: "Returns Handling",
      description:
        "Manage returns and refunds from every channel. Kontafy creates the correct accounting entries -- credit notes, inventory adjustments, and refund tracking.",
    },
    {
      icon: "LayoutDashboard",
      title: "Multi-Channel Dashboard",
      description:
        "See revenue, profit, fees, and performance metrics across all channels in one view. Compare channel profitability and make informed decisions.",
    },
  ],
  workflowTitle: "Sell anywhere, manage everywhere -- from one place",
  workflowDescription:
    "Kontafy Commerce eliminates the chaos of multi-channel selling by bringing everything into a single, organized system.",
  workflowSteps: [
    {
      step: "Step 1",
      title: "Connect your channels",
      description:
        "Link your Amazon, Flipkart, Shopify, or WooCommerce accounts. Kontafy pulls in your existing orders and starts syncing in real time.",
    },
    {
      step: "Step 2",
      title: "Orders flow in automatically",
      description:
        "Every new order from any channel appears in your unified dashboard. Invoices are auto-generated and inventory is auto-adjusted.",
    },
    {
      step: "Step 3",
      title: "Track fees & settlements",
      description:
        "Marketplace fees, commissions, shipping charges, and settlements are recorded automatically. Know your true profit per order.",
    },
    {
      step: "Step 4",
      title: "Reconcile & report",
      description:
        "Match marketplace settlements to orders. Generate channel-wise P&L, GST reports, and TDS summaries for marketplace deductions.",
    },
  ],
  benefits: [
    {
      title: "Eliminate manual data entry",
      description:
        "No more downloading reports from each marketplace and entering them manually. Everything syncs automatically.",
    },
    {
      title: "True profitability per channel",
      description:
        "After accounting for marketplace fees, shipping, returns, and commissions, know exactly how much you make per channel.",
    },
    {
      title: "Prevent overselling",
      description:
        "Real-time inventory sync across all channels ensures you never sell a product you do not have in stock.",
    },
    {
      title: "GST compliance for e-commerce",
      description:
        "Handle marketplace TDS (Section 194-O), GST on marketplace fees, and reverse charge -- all automated.",
    },
    {
      title: "Simplified returns accounting",
      description:
        "Returns are complex accounting events. Kontafy handles credit notes, inventory adjustments, and refund entries automatically.",
    },
    {
      title: "Scale without accounting chaos",
      description:
        "Add new channels and increase order volume without worrying about your accounting keeping up. Kontafy scales with you.",
    },
  ],
  ctaTitle: "Connect your first store in 5 minutes",
  ctaDescription:
    "Link your Amazon, Flipkart, Shopify, or WooCommerce account and watch orders flow into your books automatically. Free to start.",
};

export default function CommercePage() {
  return <FeaturePageClient data={data} />;
}
