import {
  FileText,
  Receipt,
  Landmark,
  BarChart3,
  Wallet,
  Package,
  Users,
  ClipboardList,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";

// ─── Type Definitions ───────────────────────────────────────────────────────

export interface NavLink {
  label: string;
  href: string;
  dropdown?: boolean;
}

export interface NavModule {
  name: string;
  href: string;
  description: string;
  icon: LucideIcon;
}

export interface Hero {
  eyebrow: string;
  headline: string;
  greenText: string;
  subheading: string;
  ctaPrimary: string;
  ctaSecondary: string;
  trustBadges: string[];
}

export interface DashboardMetric {
  label: string;
  value: string;
  trend: string;
  trendDirection?: "up" | "down";
}

export interface DashboardInvoice {
  id: string;
  client: string;
  amount: string;
  status: "Paid" | "Pending" | "Overdue";
}

export interface PainPoint {
  category: string;
  oldWay: string;
  newWay: string;
}

export interface Feature {
  title: string;
  description: string;
  icon: string;
}

export interface Stat {
  value: string;
  label: string;
}

export interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  popular: boolean;
  modules: string[];
  cta: string;
}

export interface Module {
  name: string;
  subtitle: string;
  description: string;
  icon: string;
}

export interface Industry {
  name: string;
  slug: string;
  description: string;
  relevantModules: string[];
}

export interface CTA {
  headline: string;
  subtext: string;
  ctaPrimary: string;
  ctaSecondary: string;
  finePrint: string;
}

export interface FooterLinkColumn {
  title: string;
  links: { label: string; href: string }[];
}

export interface FooterSocial {
  label: string;
  href: string;
  icon: "linkedin" | "twitter" | "youtube";
}

export interface FooterInfo {
  tagline: string;
  company: string;
  copyright: string;
  socials: FooterSocial[];
}

// ─── Navigation ─────────────────────────────────────────────────────────────

export const navLinks: NavLink[] = [
  { label: "Products", href: "#products", dropdown: true },
  { label: "Pricing", href: "/pricing" },
  { label: "Industries", href: "/industries" },
  { label: "Resources", href: "/resources" },
  { label: "Compare", href: "/compare" },
];

export const productModules: NavModule[] = [
  {
    name: "Invoicing & Billing",
    href: "/features/bill",
    description: "GST-compliant invoices in seconds",
    icon: FileText,
  },
  {
    name: "Expense Tracking",
    href: "/features/books",
    description: "Auto-categorise every rupee spent",
    icon: Receipt,
  },
  {
    name: "GST & Compliance",
    href: "/features/tax",
    description: "File GSTR-1, 3B & more automatically",
    icon: Landmark,
  },
  {
    name: "Reports & Insights",
    href: "/features/insight",
    description: "Real-time P&L, balance sheet & cash flow",
    icon: BarChart3,
  },
  {
    name: "Banking & Reconciliation",
    href: "/features/bank",
    description: "Connect banks & reconcile in one click",
    icon: Wallet,
  },
  {
    name: "Inventory",
    href: "/features/stock",
    description: "Track stock, batches & warehouses",
    icon: Package,
  },
  {
    name: "Payroll",
    href: "/features/pay",
    description: "Run payroll with PF, ESI & TDS built in",
    icon: Users,
  },
  {
    name: "Purchase & Vendor Management",
    href: "/features/commerce",
    description: "Purchase orders, GRN & vendor ledgers",
    icon: ClipboardList,
  },
  {
    name: "WhatsApp Billing",
    href: "/features/connect",
    description: "Send invoices & reminders via WhatsApp",
    icon: MessageSquare,
  },
];

// ─── Hero ───────────────────────────────────────────────────────────────────

export const hero: Hero = {
  eyebrow: "Built for Indian businesses · GST ready",
  headline:
    "Your Business Runs on the Cloud. Why Is Your Accounting Stuck on a Desktop?",
  greenText: "Stuck on a Desktop?",
  subheading:
    "Kontafy is cloud-native accounting built for Indian businesses — with WhatsApp billing, AI-powered insights, e-commerce sync, and GST compliance baked in from day one.",
  ctaPrimary: "Start Free — No Credit Card",
  ctaSecondary: "Watch 2-Min Demo",
  trustBadges: [
    "GST Compliant",
    "E-Invoice Ready",
    "256-bit Encrypted",
    "Free Data Migration",
  ],
};

// ─── Dashboard Preview ──────────────────────────────────────────────────────

export const dashboardMetrics: DashboardMetric[] = [
  { label: "Revenue", value: "₹24.8L", trend: "+12%", trendDirection: "up" },
  { label: "Outstanding", value: "₹3.2L", trend: "-8%", trendDirection: "down" },
  { label: "GST Due", value: "₹1.4L", trend: "Due 20th", trendDirection: "up" },
];

export const dashboardInvoices: DashboardInvoice[] = [
  { id: "INV-001", client: "Reliance Retail", amount: "₹1,24,500", status: "Paid" },
  { id: "INV-002", client: "TCS Supplies", amount: "₹87,200", status: "Pending" },
  { id: "INV-003", client: "Flipkart Seller Hub", amount: "₹2,15,000", status: "Overdue" },
];

// ─── Pain Points / Bridge Section ───────────────────────────────────────────

export const painPoints: PainPoint[] = [
  {
    category: "Data Access",
    oldWay: "Stuck on a single desktop — can't access data from anywhere else",
    newWay: "Cloud-native: access your books from any device, anywhere, anytime",
  },
  {
    category: "Invoicing",
    oldWay: "Manually creating invoices in Word or Excel and emailing PDFs",
    newWay: "One-click GST invoices sent instantly via WhatsApp or email",
  },
  {
    category: "Bookkeeping",
    oldWay: "Spreadsheet chaos — manual entries, formula errors, no audit trail",
    newWay: "AI-powered bookkeeping with smart categorization and real-time dashboards",
  },
  {
    category: "GST Filing",
    oldWay: "Dreading GST filing season — scrambling to reconcile mismatched data",
    newWay: "Auto-reconciliation with GSTN, one-click GSTR filing, zero stress",
  },
  {
    category: "Cash Flow",
    oldWay: "No idea about cash flow until the bank balance hits zero",
    newWay: "30-day AI cash flow forecasting so you always know what's coming",
  },
];

// ─── Features ───────────────────────────────────────────────────────────────

export const features: Feature[] = [
  {
    title: "GST Compliance, Automated",
    description:
      "Auto-generate GSTR-1, GSTR-3B, and e-invoices. Reconcile with GSTN in real time — no more last-minute filing panic.",
    icon: "Shield",
  },
  {
    title: "WhatsApp Billing",
    description:
      "Send professional GST invoices, payment reminders, and receipts directly on WhatsApp. Your clients already live there.",
    icon: "MessageCircle",
  },
  {
    title: "AI Cash Flow Forecasting",
    description:
      "Get 30-day cash flow predictions powered by AI. Know exactly when money comes in and goes out before it happens.",
    icon: "Brain",
  },
  {
    title: "Free Data Migration",
    description:
      "Switch from Tally, Busy, or spreadsheets with zero hassle. We migrate your data for free — no technical skills needed.",
    icon: "ArrowRightLeft",
  },
  {
    title: "E-Commerce Sync",
    description:
      "Connect Amazon, Flipkart, Shopify, and WooCommerce. Orders, inventory, and payments sync automatically.",
    icon: "ShoppingCart",
  },
  {
    title: "Works Offline Too",
    description:
      "Internet unreliable? Keep working offline. Kontafy syncs everything automatically when you're back online.",
    icon: "WifiOff",
  },
];

// ─── Stats ──────────────────────────────────────────────────────────────────

export const stats: Stat[] = [
  { value: "9", label: "Modules" },
  { value: "₹0", label: "Migration Cost" },
  { value: "30+", label: "Days Forecast" },
  { value: "5", label: "Plans" },
];

// ─── Pricing Plans ──────────────────────────────────────────────────────────

export const pricingPlans: PricingPlan[] = [
  {
    name: "Starter",
    price: "Free",
    period: "forever",
    description: "Perfect for freelancers and micro-businesses just getting started.",
    popular: false,
    modules: ["Books (basic)", "Bill (5 invoices/month)", "Tax (GST summary)", "1 user", "Email support"],
    cta: "Get Started Free",
  },
  {
    name: "Silver",
    price: "₹5,999",
    period: "/year",
    description: "For growing businesses that need core accounting features.",
    popular: false,
    modules: ["Books", "Bill (unlimited)", "Stock (basic)", "Tax (GSTR-1, 3B)", "Bank (auto-reconciliation)", "3 users", "WhatsApp billing"],
    cta: "Start 14-Day Trial",
  },
  {
    name: "Gold",
    price: "₹11,999",
    period: "/year",
    description: "The complete suite for established businesses ready to scale.",
    popular: true,
    modules: ["Books", "Bill (unlimited)", "Stock (multi-warehouse)", "Tax (full GST + TDS)", "Bank", "Insight (AI reports)", "Pay (payment links)", "5 users"],
    cta: "Start 14-Day Trial",
  },
  {
    name: "Platinum",
    price: "₹19,999",
    period: "/year",
    description: "For power users who need every module and advanced features.",
    popular: false,
    modules: ["All 9 modules", "Commerce (e-commerce sync)", "Connect (CA collaboration)", "AI cash flow forecasting", "Custom invoice templates", "10 users"],
    cta: "Start 14-Day Trial",
  },
  {
    name: "Enterprise",
    price: "₹29,999",
    period: "/year",
    description: "Custom solutions for multi-branch businesses and large teams.",
    popular: false,
    modules: ["All 9 modules", "Unlimited users", "Multi-branch support", "Custom API integrations", "Dedicated migration team", "SLA guarantee"],
    cta: "Contact Sales",
  },
];

// ─── Modules ────────────────────────────────────────────────────────────────

export const modules: Module[] = [
  {
    name: "Books",
    subtitle: "Accounting",
    description:
      "Double-entry bookkeeping, journal entries, ledgers, and trial balance — all automated with smart categorization.",
    icon: "BookOpen",
  },
  {
    name: "Bill",
    subtitle: "Invoicing",
    description:
      "Create GST-compliant invoices in seconds. Send via WhatsApp, email, or SMS with payment links built in.",
    icon: "FileText",
  },
  {
    name: "Stock",
    subtitle: "Inventory",
    description:
      "Track stock levels, set reorder points, manage batches, and get low-stock alerts across multiple warehouses.",
    icon: "Package",
  },
  {
    name: "Tax",
    subtitle: "GST & Compliance",
    description:
      "Auto-compute GST, generate returns (GSTR-1, 3B, 9), e-invoicing, e-way bills, and TDS — fully compliant.",
    icon: "Scale",
  },
  {
    name: "Bank",
    subtitle: "Banking",
    description:
      "Connect bank accounts for auto-reconciliation. Match transactions intelligently and keep books always up to date.",
    icon: "Landmark",
  },
  {
    name: "Insight",
    subtitle: "Analytics & AI",
    description:
      "AI-powered dashboards, cash flow forecasting, profit trends, and custom reports that surface what matters most.",
    icon: "BarChart3",
  },
  {
    name: "Pay",
    subtitle: "Payments",
    description:
      "Accept payments via UPI, cards, and net banking. Auto-match received payments to outstanding invoices.",
    icon: "CreditCard",
  },
  {
    name: "Commerce",
    subtitle: "E-Commerce",
    description:
      "Sync orders, inventory, and payments from Amazon, Flipkart, Shopify, and WooCommerce in real time.",
    icon: "ShoppingBag",
  },
  {
    name: "Connect",
    subtitle: "Integrations",
    description:
      "Plug into CRMs, payment gateways, logistics platforms, and 50+ tools your business already uses.",
    icon: "Plug",
  },
];

// ─── Industries ─────────────────────────────────────────────────────────────

export const industries: Industry[] = [
  {
    name: "Retail",
    slug: "retail",
    description:
      "POS billing, inventory tracking, and GST invoicing tailored for retail shops and chains.",
    relevantModules: ["Books", "Bill", "Stock", "Tax", "Pay"],
  },
  {
    name: "Manufacturing",
    slug: "manufacturing",
    description:
      "BOM management, production costing, multi-warehouse stock, and compliance for manufacturers.",
    relevantModules: ["Books", "Bill", "Stock", "Tax", "Bank", "Insight"],
  },
  {
    name: "Services",
    slug: "services",
    description:
      "Time-based billing, project invoicing, expense tracking, and TDS management for service firms.",
    relevantModules: ["Books", "Bill", "Tax", "Bank", "Pay"],
  },
  {
    name: "E-Commerce",
    slug: "e-commerce",
    description:
      "Marketplace sync, multi-channel inventory, automated reconciliation for online sellers.",
    relevantModules: ["Books", "Bill", "Stock", "Tax", "Commerce", "Connect"],
  },
  {
    name: "Traders",
    slug: "traders",
    description:
      "Purchase-sale tracking, party-wise ledgers, and GST returns built for wholesale and distribution.",
    relevantModules: ["Books", "Bill", "Stock", "Tax", "Bank"],
  },
  {
    name: "Freelancers",
    slug: "freelancers",
    description:
      "Simple invoicing, expense tracking, and tax estimation for independent professionals.",
    relevantModules: ["Books", "Bill", "Tax", "Pay"],
  },
];

// ─── CTA Section ────────────────────────────────────────────────────────────

export const cta: CTA = {
  headline: "Ready to move your accounting to the cloud?",
  subtext:
    "Join thousands of Indian businesses that switched from desktop software to Kontafy. Start free, upgrade when you grow.",
  ctaPrimary: "Start Free — No Credit Card",
  ctaSecondary: "Book a Demo",
  finePrint:
    "No credit card required. Free plan includes Books, Bill, and Tax modules.",
};

// ─── Footer ─────────────────────────────────────────────────────────────────

export const footerLinks: FooterLinkColumn[] = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Modules", href: "#modules" },
      { label: "Pricing", href: "/pricing" },
      { label: "Integrations", href: "/features/connect" },
      { label: "What's New", href: "/blog" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { label: "For Retail", href: "/industries/retail" },
      { label: "For Manufacturing", href: "/industries/manufacturing" },
      { label: "For E-Commerce", href: "/industries/ecommerce" },
      { label: "For Freelancers", href: "/industries/freelancers" },
      { label: "For CAs", href: "/partners" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "Help Centre", href: "/help" },
      { label: "API Docs", href: "/docs" },
      { label: "GST Guide", href: "/resources/gst-guide" },
      { label: "Webinars", href: "/resources/webinars" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

export const footer: FooterInfo = {
  tagline: "Modern cloud accounting for Indian businesses.",
  company: "A product of Syscode Technology Pvt Ltd · Yamunanagar, Haryana",
  copyright: `© ${new Date().getFullYear()} Kontafy. All rights reserved.`,
  socials: [
    { label: "LinkedIn", href: "https://linkedin.com/company/kontafy", icon: "linkedin" },
    { label: "X (Twitter)", href: "https://x.com/kontafy", icon: "twitter" },
    { label: "YouTube", href: "https://youtube.com/@kontafy", icon: "youtube" },
  ],
};
