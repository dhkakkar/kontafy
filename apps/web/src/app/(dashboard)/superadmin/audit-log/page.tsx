"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function SuperadminAuditLogPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["superadmin", "audit-log", page],
    queryFn: () => api.get<any>("/superadmin/audit-log", { page: String(page), limit: "50" }),
  });

  const logs = data?.data || [];
  const meta = data?.meta || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">
          All actions across all organizations
        </p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-medium text-gray-600">Time</th>
                <th className="text-left p-3 font-medium text-gray-600">Action</th>
                <th className="text-left p-3 font-medium text-gray-600">Entity</th>
                <th className="text-left p-3 font-medium text-gray-600">Organization</th>
                <th className="text-left p-3 font-medium text-gray-600">User ID</th>
                <th className="text-left p-3 font-medium text-gray-600">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-gray-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("en-IN")}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline">{log.action}</Badge>
                  </td>
                  <td className="p-3 text-gray-600">
                    {log.entity_type ? (
                      <span>
                        {log.entity_type}
                        {log.entity_id && (
                          <span className="text-gray-400 text-xs ml-1">
                            ({log.entity_id.slice(0, 8)}...)
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-3">
                    {log.organization?.name || (
                      <span className="text-gray-400">Platform</span>
                    )}
                  </td>
                  <td className="p-3">
                    {log.user_id ? (
                      <code className="text-xs bg-gray-100 px-1 rounded">
                        {log.user_id.slice(0, 8)}...
                      </code>
                    ) : (
                      <span className="text-gray-400">System</span>
                    )}
                  </td>
                  <td className="p-3 text-gray-500 text-xs">
                    {log.ip_address || "-"}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    No audit log entries
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
