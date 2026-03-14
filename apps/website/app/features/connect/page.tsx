import type { Metadata } from "next";
import FeaturePageClient from "@/components/features/FeaturePageClient";
import type { FeaturePageData } from "@/components/features/FeaturePageClient";

export const metadata: Metadata = {
  title: "Kontafy Connect — Integrations | Kontafy",
  description:
    "Connect CRMs, payment gateways, logistics platforms, WhatsApp Business, CA collaboration portals, and use our API for custom integrations.",
};

const data: FeaturePageData = {
  eyebrow: "Kontafy Connect",
  title: "Integrate with the tools you already use",
  titleGreen: "already use",
  subtitle: "50+ integrations to connect your entire business workflow.",
  heroDescription:
    "Kontafy Connect brings together your CRM, payment gateways, logistics partners, and communication tools into one unified ecosystem. Plus, give your CA direct access and build custom integrations with our API.",
  features: [
    {
      icon: "Users",
      title: "CRM Integrations",
      description:
        "Connect Zoho CRM, HubSpot, Salesforce, and more. Sync customer data, deals, and contact information between your CRM and accounting system.",
    },
    {
      icon: "CreditCard",
      title: "Payment Gateways",
      description:
        "Integrate with Razorpay, PayU, Cashfree, Stripe, and other payment gateways. Transactions flow directly into your books.",
    },
    {
      icon: "Truck",
      title: "Logistics Platforms",
      description:
        "Connect Shiprocket, Delhivery, Bluedart, and other logistics partners. Auto-generate e-way bills and track shipment costs.",
    },
    {
      icon: "MessageCircle",
      title: "WhatsApp Business",
      description:
        "Send invoices, payment reminders, and receipts via WhatsApp Business API. Automate customer communication at every payment stage.",
    },
    {
      icon: "UserCheck",
      title: "CA Collaboration Portal",
      description:
        "Give your Chartered Accountant secure, read-only access to your books. They can review, comment, and download reports without needing your login.",
    },
    {
      icon: "Code",
      title: "API Access",
      description:
        "Build custom integrations with Kontafy's RESTful API. Webhooks, OAuth 2.0, and comprehensive documentation for developers.",
    },
  ],
  workflowTitle: "Connect once, automate forever",
  workflowDescription:
    "Set up your integrations in minutes and let data flow automatically between Kontafy and your favorite business tools.",
  workflowSteps: [
    {
      step: "Step 1",
      title: "Choose your integrations",
      description:
        "Browse 50+ pre-built integrations or use the API to connect custom tools. Each integration has a simple setup wizard.",
    },
    {
      step: "Step 2",
      title: "Authorize & configure",
      description:
        "Securely connect your accounts with OAuth or API keys. Configure what data syncs, how often, and in which direction.",
    },
    {
      step: "Step 3",
      title: "Data flows automatically",
      description:
        "Customer data from CRM, payments from gateways, shipment details from logistics -- everything flows into the right place automatically.",
    },
    {
      step: "Step 4",
      title: "Monitor & manage",
      description:
        "View sync status, resolve conflicts, and manage all integrations from a centralized dashboard. Get alerts if any sync fails.",
    },
  ],
  benefits: [
    {
      title: "Eliminate double entry",
      description:
        "Data entered in your CRM, payment gateway, or logistics platform automatically appears in Kontafy. Enter once, use everywhere.",
    },
    {
      title: "Real-time data sync",
      description:
        "Integrations sync in real time or near-real time. Your accounting data is always current across all connected systems.",
    },
    {
      title: "Empower your CA",
      description:
        "The CA collaboration portal gives your accountant direct access to reports and data, reducing back-and-forth communication.",
    },
    {
      title: "Automate communication",
      description:
        "WhatsApp Business integration automates invoice delivery, payment reminders, and receipt confirmations at scale.",
    },
    {
      title: "Build custom workflows",
      description:
        "Use the API and webhooks to build custom automations. Trigger actions in Kontafy from external events or vice versa.",
    },
    {
      title: "Enterprise-grade security",
      description:
        "All integrations use encrypted connections with granular permission controls. Revoke access anytime with one click.",
    },
  ],
  ctaTitle: "Connect your business ecosystem today",
  ctaDescription:
    "Set up your first integration in under 5 minutes. Browse 50+ pre-built connectors or use our API to build your own.",
};

export default function ConnectPage() {
  return <FeaturePageClient data={data} />;
}
