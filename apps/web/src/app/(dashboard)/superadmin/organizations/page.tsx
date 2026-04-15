"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Trash2, Building2, Plus } from "lucide-react";

export default function SuperadminOrganizationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: "", owner_user_id: "" });

  const { data, isLoading } = useQuery({
    queryKey: ["superadmin", "organizations", page, search],
    queryFn: () => {
      const params: Record<string, string> = { page: String(page), limit: "20" };
      if (search) params.search = search;
      return api.get<any>("/superadmin/organizations", params);
    },
  });

  const result = data?.data || data;
  const organizations = result?.data || [];
  const meta = result?.meta || {};

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/superadmin/organizations/${id}`),
    onSuccess: () => {
      alert("Organization deleted");
      queryClient.invalidateQueries({ queryKey: ["superadmin", "organizations"] });
    },
    onError: (e: any) => alert(e?.message || "Delete failed"),
  });

  const createMutation = useMutation({
    mutationFn: () => api.post("/superadmin/organizations", newOrg),
    onSuccess: () => {
      alert("Organization created");
      setShowCreate(false);
      setNewOrg({ name: "", owner_user_id: "" });
      queryClient.invalidateQueries({ queryKey: ["superadmin", "organizations"] });
    },
    onError: (e: any) => alert(e?.message || "Create failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Organizations</h1>
          <p className="text-sm text-gray-500 mt-1">{meta.total || 0} organizations on the platform</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4 mr-1" /> Create Organization
        </Button>
      </div>

      {/* Create org form */}
      {showCreate && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-3">Create New Organization</h2>
          <div className="flex gap-3 max-w-2xl">
            <Input
              placeholder="Organization name"
              value={newOrg.name}
              onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
            />
            <Input
              placeholder="Owner User ID (UUID)"
              value={newOrg.owner_user_id}
              onChange={(e) => setNewOrg({ ...newOrg, owner_user_id: e.target.value })}
            />
            <Button
              variant="primary"
              onClick={() => createMutation.mutate()}
              loading={createMutation.isPending}
              disabled={!newOrg.name || !newOrg.owner_user_id}
            >
              Create
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2">The specified user will become the org owner.</p>
        </Card>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by name, email, or GSTIN..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-10"
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-medium text-gray-600">Organization</th>
                <th className="text-left p-3 font-medium text-gray-600">Plan</th>
                <th className="text-left p-3 font-medium text-gray-600">Members</th>
                <th className="text-left p-3 font-medium text-gray-600">Invoices</th>
                <th className="text-left p-3 font-medium text-gray-600">Contacts</th>
                <th className="text-left p-3 font-medium text-gray-600">Created</th>
                <th className="text-right p-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org: any) => (
                <tr key={org.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="font-medium">{org.name}</p>
                        {org.email && <p className="text-xs text-gray-500">{org.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="p-3"><Badge variant="outline">{org.plan}</Badge></td>
                  <td className="p-3">{org._count?.members || 0}</td>
                  <td className="p-3">{org._count?.invoices || 0}</td>
                  <td className="p-3">{org._count?.contacts || 0}</td>
                  <td className="p-3 text-gray-500">{new Date(org.created_at).toLocaleDateString("en-IN")}</td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => {
                      if (confirm(`Delete "${org.name}"? This cannot be undone.`)) deleteMutation.mutate(org.id);
                    }}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
              {organizations.length === 0 && !isLoading && (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">No organizations found</td></tr>
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
