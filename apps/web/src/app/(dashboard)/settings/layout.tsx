"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  Building2,
  Users,
  FileText,
  Landmark,
  Plug,
  Download,
  Upload,
  Brain,
  Shield,
  ClipboardList,
  CreditCard,
  Wallet,
  UserCog,
} from "lucide-react";

// Business types where Capital Structure and Directors apply. Anything
// else (proprietorship, HUF) hides those nav items entirely.
const INCORPORATED_TYPES = new Set([
  "pvt_ltd",
  "public_ltd",
  "opc",
  "llp",
  "partnership",
  "trust",
  "society",
]);

// Label override for the directors page based on entity type — LLPs have
// "Designated Partners", trusts have "Trustees", everyone else "Directors".
function directorsLabel(businessType: string): string {
  if (businessType === "llp" || businessType === "partnership")
    return "Partners";
  if (businessType === "trust") return "Trustees";
  if (businessType === "society") return "Office Bearers";
  return "Directors & Signatories";
}

type NavItem = {
  label: string;
  href: string;
  icon: any;
  description: string;
};

function buildNav(businessType: string): NavItem[] {
  const showIncorporated = INCORPORATED_TYPES.has(businessType);
  const items: NavItem[] = [
    {
      label: "Organization",
      href: "/settings",
      icon: Building2,
      description: "Company profile and details",
    },
  ];
  if (showIncorporated) {
    items.push({
      label: "Capital Structure",
      href: "/settings/capital",
      icon: Wallet,
      description: "Authorized and paid-up capital",
    });
    items.push({
      label: directorsLabel(businessType),
      href: "/settings/directors",
      icon: UserCog,
      description: "Signatories and KYC details",
    });
  }
  items.push(
    {
      label: "Team",
      href: "/settings/team",
      icon: Users,
      description: "Members and roles",
    },
    {
      label: "Invoice Config",
      href: "/settings/invoices",
      icon: FileText,
      description: "Numbering, terms, bank details",
    },
    {
      label: "Tax / GST",
      href: "/settings/tax",
      icon: Landmark,
      description: "GST registration and TDS",
    },
    {
      label: "Integrations",
      href: "/settings/integrations",
      icon: Plug,
      description: "Connected services",
    },
    {
      label: "Export Data",
      href: "/settings/data",
      icon: Download,
      description: "Download data as CSV or Excel",
    },
    {
      label: "Import Data",
      href: "/settings/import",
      icon: Upload,
      description: "Import or migrate data",
    },
    {
      label: "AI Features",
      href: "/settings/ai",
      icon: Brain,
      description: "AI-powered insights and automation",
    },
    {
      label: "CA Portal",
      href: "/settings/ca",
      icon: Shield,
      description: "Manage CA access and permissions",
    },
    {
      label: "Audit Log",
      href: "/settings/audit-log",
      icon: ClipboardList,
      description: "Activity trail and change history",
    },
    {
      label: "Billing",
      href: "/billing",
      icon: CreditCard,
      description: "Subscription and payment management",
    },
  );
  return items;
}

export default function SettingsLayout({
  children,
}: {
  children: any;
}) {
  const pathname = usePathname();

  // Fetch the org's business_type so we can hide Capital Structure /
  // Directors for sole proprietors. Cached so it doesn't refetch on every
  // route change within /settings.
  const { data: orgData } = useQuery<{ business_type?: string }>({
    queryKey: ["settings", "organization-meta"],
    queryFn: async () => {
      const res = await api.get<{ data: any }>("/settings/organization");
      return res.data || res;
    },
    staleTime: 5 * 60 * 1000,
  });
  const businessType = orgData?.business_type || "";
  const settingsNav = React.useMemo(() => buildNav(businessType), [businessType]);

  const isActive = (href: string) => {
    if (href === "/settings") return pathname === "/settings";
    return pathname.startsWith(href);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your organization and preferences
        </p>
      </div>

      {/* Mobile: horizontal tabs */}
      <div className="md:hidden">
        <div className="flex gap-1.5 overflow-x-auto pb-2 border-b border-gray-200 scrollbar-hide -mx-1 px-1">
          {settingsNav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "bg-primary-50 text-primary-800"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex gap-8">
        {/* Settings Sidebar — desktop only */}
        <nav className="w-56 shrink-0 hidden md:block">
          <div className="space-y-1">
            {settingsNav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                    active
                      ? "bg-primary-50 text-primary-800 font-medium"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Content Area */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
