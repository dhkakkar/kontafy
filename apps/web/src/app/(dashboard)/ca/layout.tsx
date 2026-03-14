"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCaClients } from "@/hooks/use-ca-portal";
import { Select } from "@/components/ui/select";
import {
  LayoutDashboard,
  MessageSquareText,
  ClipboardCheck,
  ChevronLeft,
  Building2,
} from "lucide-react";

export default function CaPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: clients } = useCaClients();

  // Extract orgId from the path if present
  const pathParts = pathname.split("/");
  const caIndex = pathParts.indexOf("ca");
  const currentOrgId = caIndex >= 0 ? pathParts[caIndex + 1] : undefined;

  // Only show sub-navigation when viewing a specific client
  const isClientView = currentOrgId && currentOrgId !== "";
  const clientNavItems = isClientView
    ? [
        {
          label: "Dashboard",
          href: `/ca/${currentOrgId}`,
          icon: <LayoutDashboard className="h-4 w-4" />,
        },
        {
          label: "Annotations",
          href: `/ca/${currentOrgId}/annotations`,
          icon: <MessageSquareText className="h-4 w-4" />,
        },
        {
          label: "Approvals",
          href: `/ca/${currentOrgId}/approvals`,
          icon: <ClipboardCheck className="h-4 w-4" />,
        },
      ]
    : [];

  const clientOptions =
    clients?.map((c) => ({
      value: c.orgId,
      label: c.name,
      description: c.gstin || undefined,
    })) || [];

  return (
    <div className="space-y-0">
      {/* CA Portal Header Bar */}
      <div className="bg-white border-b border-gray-200 -m-6 mb-6 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/ca"
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <Building2 className="h-5 w-5 text-primary-800" />
              <span className="font-semibold text-primary-800">CA Portal</span>
            </Link>

            {isClientView && (
              <>
                <span className="text-gray-300">/</span>
                <div className="w-64">
                  <Select
                    options={clientOptions}
                    value={currentOrgId}
                    onChange={(val) => {
                      window.location.href = `/ca/${val}`;
                    }}
                    placeholder="Switch client..."
                    searchable
                  />
                </div>
              </>
            )}
          </div>

          {isClientView && (
            <Link href="/ca">
              <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                <ChevronLeft className="h-4 w-4" />
                All Clients
              </button>
            </Link>
          )}
        </div>

        {/* Client Sub-Navigation */}
        {isClientView && clientNavItems.length > 0 && (
          <div className="flex items-center gap-1 mt-3 -mb-3">
            {clientNavItems.map((item) => {
              const isActive =
                item.href === `/ca/${currentOrgId}`
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2",
                    isActive
                      ? "text-primary-800 border-primary-800 bg-primary-50/50"
                      : "text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {children}
    </div>
  );
}
