"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui.store";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Package,
  Landmark,
  Building,
  Building2,
  MessageSquare,
  Brain,
  ShoppingBag,
  Shield,
  CreditCard,
  BarChart3,
  RefreshCw,
  ClipboardList,
  ShoppingCart,
  FileCheck,
  PieChart,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: "Books",
    href: "/books",
    icon: <BookOpen className="h-5 w-5" />,
    children: [
      { label: "Chart of Accounts", href: "/books/accounts" },
      { label: "Journal Entries", href: "/books/journal" },
      { label: "Ledger", href: "/books/ledger" },
      { label: "Reports", href: "/books/reports" },
    ],
  },
  {
    label: "Invoicing",
    href: "/invoices",
    icon: <FileText className="h-5 w-5" />,
    children: [
      { label: "Sales Invoices", href: "/invoices" },
      { label: "Create Invoice", href: "/invoices/new" },
      { label: "Purchase Bills", href: "/purchases" },
      { label: "Credit Notes", href: "/credit-notes" },
      { label: "Debit Notes", href: "/debit-notes" },
      { label: "Proforma Invoice", href: "/proforma-invoices" },
      { label: "Delivery Challan", href: "/delivery-challans" },
      { label: "Quotations", href: "/quotations" },
      { label: "Purchase Orders", href: "/purchase-orders" },
      { label: "Recurring", href: "/recurring-invoices" },
    ],
  },
  {
    label: "E-Invoice",
    href: "/einvoice",
    icon: <FileCheck className="h-5 w-5" />,
    children: [
      { label: "Dashboard", href: "/einvoice" },
      { label: "Generate", href: "/einvoice/generate" },
      { label: "E-Way Bills", href: "/einvoice/eway-bills" },
      { label: "Settings", href: "/einvoice/settings" },
    ],
  },
  {
    label: "Contacts",
    href: "/contacts",
    icon: <Users className="h-5 w-5" />,
  },
  {
    label: "Branches",
    href: "/branches",
    icon: <Building2 className="h-5 w-5" />,
  },
  {
    label: "Budgets",
    href: "/budgets",
    icon: <BarChart3 className="h-5 w-5" />,
    children: [
      { label: "All Budgets", href: "/budgets" },
      { label: "Create Budget", href: "/budgets/new" },
      { label: "Variance Report", href: "/budgets/variance" },
    ],
  },
  {
    label: "Payments",
    href: "/payments",
    icon: <Wallet className="h-5 w-5" />,
    children: [
      { label: "Received", href: "/payments?tab=received" },
      { label: "Made", href: "/payments?tab=made" },
      { label: "Outstanding", href: "/payments/outstanding" },
      { label: "Expenses", href: "/expenses" },
    ],
  },
  {
    label: "Inventory",
    href: "/stock",
    icon: <Package className="h-5 w-5" />,
    children: [
      { label: "Products", href: "/stock/products" },
      { label: "Warehouses", href: "/stock/warehouses" },
      { label: "Stock Movements", href: "/stock/movements" },
      { label: "Stock Adjustment", href: "/stock/adjustments" },
    ],
  },
  {
    label: "Tax",
    href: "/tax",
    icon: <Landmark className="h-5 w-5" />,
    children: [
      { label: "GST Dashboard", href: "/tax" },
      { label: "GST Returns", href: "/tax/gst" },
      { label: "GST Compute", href: "/tax/gst/compute" },
      { label: "GSTR-3B", href: "/tax/gstr3b" },
      { label: "GSTR-1 Export", href: "/tax/gstr1-export" },
      { label: "TDS", href: "/tax/tds" },
    ],
  },
  {
    label: "Banking",
    href: "/bank",
    icon: <Building className="h-5 w-5" />,
    children: [
      { label: "Bank Accounts", href: "/bank" },
      { label: "Reconciliation", href: "/bank/reconciliation" },
    ],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: <PieChart className="h-5 w-5" />,
    children: [
      { label: "All Reports", href: "/reports" },
      { label: "Trial Balance", href: "/reports/trial-balance" },
      { label: "Profit & Loss", href: "/reports/profit-loss" },
      { label: "Balance Sheet", href: "/reports/balance-sheet" },
      { label: "Cash Flow", href: "/reports/cash-flow" },
      { label: "General Ledger", href: "/reports/general-ledger" },
      { label: "Day Book", href: "/reports/day-book" },
      { label: "AR Aging", href: "/reports/receivable-aging" },
      { label: "AP Aging", href: "/reports/payable-aging" },
      { label: "Sales Register", href: "/reports/sales-register" },
      { label: "GST Summary", href: "/reports/gst-summary" },
    ],
  },
  {
    label: "E-commerce",
    href: "/commerce",
    icon: <ShoppingBag className="h-5 w-5" />,
    children: [
      { label: "Connections", href: "/commerce" },
      { label: "Synced Orders", href: "/commerce/orders" },
      { label: "Analytics", href: "/commerce/dashboard" },
    ],
  },
  {
    label: "WhatsApp",
    href: "/whatsapp",
    icon: <MessageSquare className="h-5 w-5" />,
    children: [
      { label: "Messages", href: "/whatsapp" },
      { label: "Settings", href: "/whatsapp/settings" },
    ],
  },
  {
    label: "AI Insights",
    href: "/insights",
    icon: <Brain className="h-5 w-5" />,
  },
  {
    label: "CA Portal",
    href: "/ca",
    icon: <Shield className="h-5 w-5" />,
    children: [
      { label: "My Clients", href: "/ca" },
    ],
  },
  {
    label: "Billing",
    href: "/billing",
    icon: <CreditCard className="h-5 w-5" />,
    children: [
      { label: "Overview", href: "/billing" },
      { label: "Plans", href: "/billing/plans" },
      { label: "Invoices", href: "/billing/invoices" },
      { label: "Settings", href: "/billing/settings" },
    ],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: <Settings className="h-5 w-5" />,
    children: [
      { label: "General", href: "/settings" },
      { label: "Audit Log", href: "/settings/audit-log" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const [expandedGroups, setExpandedGroups] = React.useState<string[]>([
    "Books",
  ]);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) =>
      prev.includes(label)
        ? prev.filter((g) => g !== label)
        : [...prev, label]
    );
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const isChildActive = (href: string) => {
    // For query-param routes, match on pathname portion
    const hrefPath = href.split("?")[0];
    if (href.includes("?")) {
      return pathname === hrefPath && typeof window !== "undefined" && window.location.search === `?${href.split("?")[1]}`;
    }
    return pathname === href;
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-primary-900 text-white",
        "flex flex-col transition-all duration-300",
        sidebarCollapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-primary-700/50">
        <div className="flex items-center gap-2.5">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
            <rect width="32" height="32" rx="7" fill="#0F2D5E" />
            <rect x="7" y="6" width="18" height="20" rx="2" fill="#1A3F7A" />
            <rect x="11" y="6" width="3" height="20" fill="#0A8A54" />
            <path d="M18 10v4.5l3.5-4.5h2.2l-3.8 4.8L24 20h-2.3l-3.7-4.7V20h-1.8V10H18Z" fill="white" />
          </svg>
          {!sidebarCollapsed && (
            <span className="text-lg font-bold tracking-tight text-white">Kontafy</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const expanded = expandedGroups.includes(item.label);

          if (item.children) {
            return (
              <div key={item.label}>
                <button
                  onClick={() =>
                    sidebarCollapsed ? undefined : toggleGroup(item.label)
                  }
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    active
                      ? "bg-white/15 text-white"
                      : "text-primary-200 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <span className="shrink-0">{item.icon}</span>
                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronRight
                        className={cn(
                          "h-4 w-4 transition-transform",
                          expanded && "rotate-90"
                        )}
                      />
                    </>
                  )}
                </button>
                {!sidebarCollapsed && expanded && (
                  <div className="ml-8 mt-1 space-y-0.5">
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "block px-3 py-2 rounded-lg text-sm transition-colors",
                          isChildActive(child.href)
                            ? "bg-white/15 text-white font-medium"
                            : "text-primary-300 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-white/15 text-white"
                  : "text-primary-200 hover:bg-white/10 hover:text-white"
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              {!sidebarCollapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-primary-700/50">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-3 px-3 py-2.5 rounded-lg text-sm text-primary-300 hover:bg-white/10 hover:text-white transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span className="flex-1 text-left">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
