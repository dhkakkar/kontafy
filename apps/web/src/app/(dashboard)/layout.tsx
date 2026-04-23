"use client";

import React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ExpiryBanner } from "@/components/subscription/expiry-banner";
import { AccessGate } from "@/components/subscription/access-gate";
import { useUIStore } from "@/stores/ui.store";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Topbar />
      <main
        className={cn(
          "pt-16 min-h-screen transition-all duration-300",
          sidebarCollapsed ? "pl-[72px]" : "pl-[260px]"
        )}
      >
        <ExpiryBanner />
        <div className="p-6">
          <AccessGate>{children}</AccessGate>
        </div>
      </main>
    </div>
  );
}
