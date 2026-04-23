"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Building2,
  Users,
  FileText,
  CreditCard,
  DollarSign,
  UserPlus,
} from "lucide-react";

export default function SuperadminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["superadmin", "dashboard"],
    queryFn: () => api.get<any>("/superadmin/dashboard"),
  });

  const dashboard = data?.data || data;
  const stats = dashboard?.stats || {};
  const recentOrgs = dashboard?.recent_organizations || [];
  const planBreakdown = dashboard?.plan_breakdown || [];

  const statCards = [
    { label: "Organizations", value: stats.total_organizations || 0, icon: <Building2 className="h-5 w-5" />, href: "/superadmin/organizations", color: "text-blue-600 bg-blue-50" },
    { label: "Users", value: stats.total_users || 0, icon: <Users className="h-5 w-5" />, href: "/superadmin/users", color: "text-purple-600 bg-purple-50" },
    { label: "Invoices", value: stats.total_invoices || 0, icon: <FileText className="h-5 w-5" />, color: "text-green-600 bg-green-50" },
    { label: "Contacts", value: stats.total_contacts || 0, icon: <UserPlus className="h-5 w-5" />, color: "text-orange-600 bg-orange-50" },
    { label: "Payments", value: stats.total_payments || 0, icon: <CreditCard className="h-5 w-5" />, color: "text-indigo-600 bg-indigo-50" },
    { label: "Total Revenue", value: `₹${(stats.total_revenue || 0).toLocaleString("en-IN")}`, icon: <DollarSign className="h-5 w-5" />, color: "text-emerald-600 bg-emerald-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Superadmin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Platform-wide overview and management</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat) => {
          const content = (
            <Card key={stat.label} className="p-4 hover:shadow-md transition-shadow overflow-hidden">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-lg shrink-0 ${stat.color}`}>{stat.icon}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 truncate">{stat.label}</p>
                  <p
                    className="text-lg font-bold text-gray-900 truncate"
                    title={String(stat.value)}
                  >
                    {isLoading ? "..." : stat.value}
                  </p>
                </div>
              </div>
            </Card>
          );
          return stat.href ? (
            <Link key={stat.label} href={stat.href} className="min-w-0">{content}</Link>
          ) : (
            <React.Fragment key={stat.label}>{content}</React.Fragment>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Organizations</h2>
            <Link href="/superadmin/organizations" className="text-sm text-primary-600 hover:underline">View All</Link>
          </div>
          <div className="space-y-3">
            {recentOrgs.map((org: any) => (
              <div key={org.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{org.name}</p>
                  <p className="text-xs text-gray-500">{new Date(org.created_at).toLocaleDateString("en-IN")}</p>
                </div>
                <Badge variant="outline">{org.plan}</Badge>
              </div>
            ))}
            {recentOrgs.length === 0 && !isLoading && (
              <p className="text-sm text-gray-400 text-center py-4">No organizations yet</p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Plan Distribution</h2>
          <div className="space-y-3">
            {planBreakdown.map((p: any) => (
              <div key={p.plan} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm font-medium capitalize">{p.plan}</span>
                <Badge>{p.count} orgs</Badge>
              </div>
            ))}
            {planBreakdown.length === 0 && !isLoading && (
              <p className="text-sm text-gray-400 text-center py-4">No data</p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Organizations", href: "/superadmin/organizations", icon: <Building2 className="h-6 w-6" /> },
          { label: "Users", href: "/superadmin/users", icon: <Users className="h-6 w-6" /> },
          { label: "Superadmins", href: "/superadmin/admins", icon: <Users className="h-6 w-6" /> },
          { label: "Audit Log", href: "/superadmin/audit-log", icon: <FileText className="h-6 w-6" /> },
        ].map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="p-6 text-center hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex flex-col items-center gap-2">
                <div className="text-primary-600">{link.icon}</div>
                <span className="text-sm font-medium">{link.label}</span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
