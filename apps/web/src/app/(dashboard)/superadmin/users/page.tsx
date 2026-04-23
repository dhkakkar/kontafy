"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Shield } from "lucide-react";

export default function SuperadminUsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["superadmin", "users", page, search],
    queryFn: () => {
      const params: Record<string, string> = { page: String(page), limit: "20" };
      if (search) params.search = search;
      return api.get<any>("/superadmin/users", params);
    },
  });

  const users = data?.data || [];
  const meta = data?.meta || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Users</h1>
        <p className="text-sm text-gray-500 mt-1">All users across the platform</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input placeholder="Search users..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-medium text-gray-600">User</th>
                <th className="text-left p-3 font-medium text-gray-600">Role</th>
                <th className="text-left p-3 font-medium text-gray-600">Organizations</th>
                <th className="text-left p-3 font-medium text-gray-600">Last Sign In</th>
                <th className="text-left p-3 font-medium text-gray-600">Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user: any) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{user.full_name || "Unnamed"}</p>
                        {user.is_superadmin && <Shield className="h-4 w-4 text-amber-500" />}
                      </div>
                      <p className="text-xs text-gray-500">{user.email || user.phone || "No contact"}</p>
                      <code className="text-[10px] text-gray-400">{user.id}</code>
                    </div>
                  </td>
                  <td className="p-3">
                    {user.is_superadmin ? <Badge variant="warning">Superadmin</Badge> : <Badge variant="outline">User</Badge>}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      {user.organizations?.map((org: any) => (
                        <Badge key={org.org_id} variant="outline" className="text-xs">{org.org_name} ({org.role})</Badge>
                      ))}
                      {(!user.organizations || user.organizations.length === 0) && <span className="text-gray-400 text-xs">None</span>}
                    </div>
                  </td>
                  <td className="p-3 text-gray-500">{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString("en-IN") : "Never"}</td>
                  <td className="p-3 text-gray-500">{new Date(user.created_at).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
              {users.length === 0 && !isLoading && (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t">
            <p className="text-sm text-gray-500">Page {meta.page} of {meta.totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Previous</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= meta.totalPages}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
