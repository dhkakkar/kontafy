"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, LifeBuoy, MessageCircle } from "lucide-react";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
  open: "warning",
  in_progress: "info",
  resolved: "success",
  closed: "default",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const PRIORITY_VARIANT: Record<string, "default" | "warning" | "danger"> = {
  low: "default",
  normal: "default",
  high: "warning",
  urgent: "danger",
};

export default function SuperadminTicketsPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["superadmin", "tickets", status, search, page],
    queryFn: () => {
      const params: Record<string, string> = { page: String(page), limit: "25" };
      if (status) params.status = status;
      if (search) params.search = search;
      return api.get<any>("/superadmin/tickets", params);
    },
  });

  const result = data?.data || data;
  const tickets = result?.data || [];
  const meta = result?.meta || {};
  const stats = result?.stats || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
        <p className="text-sm text-gray-500 mt-1">
          Platform-wide support requests from all organizations.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Open", key: "open", tone: "text-amber-600 bg-amber-50" },
          { label: "In Progress", key: "in_progress", tone: "text-blue-600 bg-blue-50" },
          { label: "Resolved", key: "resolved", tone: "text-green-600 bg-green-50" },
          { label: "Closed", key: "closed", tone: "text-gray-600 bg-gray-100" },
        ].map((s) => (
          <Card key={s.key} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.tone}`}>
                <LifeBuoy className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-lg font-bold text-gray-900">
                  {stats[s.key] || 0}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search subject or description..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {STATUS_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => { setStatus(t.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                status === t.value
                  ? "bg-primary-800 text-white"
                  : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-medium text-gray-600">Subject</th>
                <th className="text-left p-3 font-medium text-gray-600">Organization</th>
                <th className="text-left p-3 font-medium text-gray-600">Status</th>
                <th className="text-left p-3 font-medium text-gray-600">Priority</th>
                <th className="text-left p-3 font-medium text-gray-600">Messages</th>
                <th className="text-left p-3 font-medium text-gray-600">Updated</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t: any) => (
                <tr key={t.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <Link
                      href={`/superadmin/tickets/${t.id}`}
                      className="font-medium text-primary-800 hover:underline"
                    >
                      {t.subject}
                    </Link>
                    <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                      {t.description}
                    </p>
                  </td>
                  <td className="p-3">
                    <p className="text-sm">{t.organization?.name || "—"}</p>
                    {t.organization?.plan && (
                      <Badge variant="outline">{t.organization.plan}</Badge>
                    )}
                  </td>
                  <td className="p-3">
                    <Badge variant={STATUS_VARIANT[t.status] || "default"} dot>
                      {STATUS_LABEL[t.status] || t.status}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge variant={PRIORITY_VARIANT[t.priority] || "default"}>
                      {t.priority}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 text-gray-500">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {t._count?.messages || 0}
                    </div>
                  </td>
                  <td className="p-3 text-gray-500">
                    {new Date(t.updated_at).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
              {tickets.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    No tickets found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t">
            <p className="text-sm text-gray-500">
              Page {meta.page} of {meta.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= meta.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
