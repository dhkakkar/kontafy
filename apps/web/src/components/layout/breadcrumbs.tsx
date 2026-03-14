"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const routeLabels: Record<string, string> = {
  "": "Dashboard",
  books: "Books",
  accounts: "Chart of Accounts",
  journal: "Journal Entries",
  new: "New",
  invoices: "Invoices",
  contacts: "Contacts",
  settings: "Settings",
  expenses: "Expenses",
  banking: "Banking",
  reports: "Reports",
  payments: "Payments",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Home className="h-4 w-4 text-gray-400" />
        <span className="font-medium text-gray-900">Dashboard</span>
      </div>
    );
  }

  return (
    <nav className="flex items-center gap-1.5 text-sm">
      <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
        <Home className="h-4 w-4" />
      </Link>
      {segments.map((segment, index) => {
        const href = "/" + segments.slice(0, index + 1).join("/");
        const isLast = index === segments.length - 1;
        const label = routeLabels[segment] || segment;

        return (
          <React.Fragment key={href}>
            <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
            {isLast ? (
              <span className="font-medium text-gray-900">{label}</span>
            ) : (
              <Link
                href={href}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
