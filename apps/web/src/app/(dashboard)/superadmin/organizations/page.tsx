"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Trash2, Building2, Plus, X, Power, PowerOff } from "lucide-react";

const PLANS = ["starter", "pro", "business", "enterprise"];
const FY_MONTHS = [
  { value: 1, label: "January" },
  { value: 4, label: "April" },
  { value: 7, label: "July" },
  { value: 10, label: "October" },
];

interface NewOrgState {
  name: string;
  owner_email: string;
  owner_password: string;
  owner_full_name: string;
  legal_name: string;
  gstin: string;
  pan: string;
  email: string;
  phone: string;
  business_type: string;
  industry: string;
  plan: string;
  fiscal_year_start: number;
}

const EMPTY_ORG: NewOrgState = {
  name: "",
  owner_email: "",
  owner_password: "",
  owner_full_name: "",
  legal_name: "",
  gstin: "",
  pan: "",
  email: "",
  phone: "",
  business_type: "",
  industry: "",
  plan: "starter",
  fiscal_year_start: 4,
};

export default function SuperadminOrganizationsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [newOrg, setNewOrg] = useState<NewOrgState>(EMPTY_ORG);

  const { data, isLoading } = useQuery({
    queryKey: ["superadmin", "organizations", page, search],
    queryFn: () => {
      const params: Record<string, string> = { page: String(page), limit: "20" };
      if (search) params.search = search;
      return api.get<any>("/superadmin/organizations", params);
    },
  });

  const organizations = data?.data || [];
  const meta = data?.meta || {};

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/superadmin/organizations/${id}`),
    onSuccess: () => {
      alert("Organization deleted");
      queryClient.invalidateQueries({ queryKey: ["superadmin", "organizations"] });
    },
    onError: (e: any) => alert(e?.message || "Delete failed"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, is_active, reason }: { id: string; is_active: boolean; reason?: string }) =>
      api.patch(`/superadmin/organizations/${id}/status`, { is_active, reason }),
    onSuccess: (_d, vars) => {
      alert(vars.is_active ? "Organization activated" : "Organization deactivated");
      queryClient.invalidateQueries({ queryKey: ["superadmin", "organizations"] });
    },
    onError: (e: any) => alert(e?.message || "Status update failed"),
  });

  const createMutation = useMutation({
    mutationFn: () => {
      // Strip empty optional fields so backend defaults apply cleanly
      const payload: Record<string, unknown> = {
        name: newOrg.name,
        owner_email: newOrg.owner_email.trim(),
        owner_password: newOrg.owner_password,
        plan: newOrg.plan,
        fiscal_year_start: newOrg.fiscal_year_start,
      };
      if (newOrg.owner_full_name.trim()) {
        payload.owner_full_name = newOrg.owner_full_name.trim();
      }
      (
        ["legal_name", "gstin", "pan", "email", "phone", "business_type", "industry"] as const
      ).forEach((k) => {
        const v = newOrg[k]?.trim();
        if (v) payload[k] = v;
      });
      return api.post("/superadmin/organizations", payload);
    },
    onSuccess: () => {
      alert(
        `Organization created. Owner can log in with ${newOrg.owner_email} and the password you set.`,
      );
      setShowCreate(false);
      setNewOrg(EMPTY_ORG);
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Create New Organization</h2>
            <button
              onClick={() => { setShowCreate(false); setNewOrg(EMPTY_ORG); }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Required */}
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Organization Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Acme Pvt. Ltd."
                value={newOrg.name}
                onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
              />
            </div>

            <div className="md:col-span-2 rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Owner Account
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">
                    Owner Email <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="email"
                    placeholder="owner@company.com"
                    value={newOrg.owner_email}
                    onChange={(e) =>
                      setNewOrg({ ...newOrg, owner_email: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 mb-1 block">
                    Owner Password <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Min 8 characters"
                    value={newOrg.owner_password}
                    onChange={(e) =>
                      setNewOrg({ ...newOrg, owner_password: e.target.value })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-700 mb-1 block">
                    Owner Full Name
                  </label>
                  <Input
                    placeholder="e.g. Rahul Sharma"
                    value={newOrg.owner_full_name}
                    onChange={(e) =>
                      setNewOrg({ ...newOrg, owner_full_name: e.target.value })
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                If an account with this email already exists, it will be linked as
                the owner and the password field is ignored. Otherwise a new
                account is created with the given password (email auto-verified).
              </p>
            </div>

            {/* Optional details */}
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Legal Name</label>
              <Input
                placeholder="Registered legal name"
                value={newOrg.legal_name}
                onChange={(e) => setNewOrg({ ...newOrg, legal_name: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Plan</label>
              <select
                value={newOrg.plan}
                onChange={(e) => setNewOrg({ ...newOrg, plan: e.target.value })}
                className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary-400"
              >
                {PLANS.map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">GSTIN</label>
              <Input
                placeholder="22AAAAA0000A1Z5"
                value={newOrg.gstin}
                onChange={(e) => setNewOrg({ ...newOrg, gstin: e.target.value.toUpperCase() })}
                maxLength={15}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">PAN</label>
              <Input
                placeholder="AAAAA0000A"
                value={newOrg.pan}
                onChange={(e) => setNewOrg({ ...newOrg, pan: e.target.value.toUpperCase() })}
                maxLength={10}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Email</label>
              <Input
                type="email"
                placeholder="contact@company.com"
                value={newOrg.email}
                onChange={(e) => setNewOrg({ ...newOrg, email: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Phone</label>
              <Input
                placeholder="+91 98765 43210"
                value={newOrg.phone}
                onChange={(e) => setNewOrg({ ...newOrg, phone: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Business Type</label>
              <Input
                placeholder="e.g. Private Limited, LLP, Sole Proprietor"
                value={newOrg.business_type}
                onChange={(e) => setNewOrg({ ...newOrg, business_type: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Industry</label>
              <Input
                placeholder="e.g. Manufacturing, Services, IT"
                value={newOrg.industry}
                onChange={(e) => setNewOrg({ ...newOrg, industry: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Fiscal Year Start</label>
              <select
                value={newOrg.fiscal_year_start}
                onChange={(e) => setNewOrg({ ...newOrg, fiscal_year_start: parseInt(e.target.value) })}
                className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-primary-400"
              >
                {FY_MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              onClick={() => { setShowCreate(false); setNewOrg(EMPTY_ORG); }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => createMutation.mutate()}
              loading={createMutation.isPending}
              disabled={
                !newOrg.name.trim() ||
                !newOrg.owner_email.trim() ||
                newOrg.owner_password.length < 8
              }
            >
              <Plus className="h-4 w-4 mr-1" /> Create Organization
            </Button>
          </div>
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
                <th className="text-left p-3 font-medium text-gray-600">Status</th>
                <th className="text-left p-3 font-medium text-gray-600">Members</th>
                <th className="text-left p-3 font-medium text-gray-600">Invoices</th>
                <th className="text-left p-3 font-medium text-gray-600">Contacts</th>
                <th className="text-left p-3 font-medium text-gray-600">Created</th>
                <th className="text-right p-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org: any) => {
                const isActive = org.is_active !== false; // default true if missing
                return (
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
                  <td className="p-3">
                    {isActive ? (
                      <Badge variant="success" dot>Active</Badge>
                    ) : (
                      <Badge variant="danger" dot>Inactive</Badge>
                    )}
                  </td>
                  <td className="p-3">{org._count?.members || 0}</td>
                  <td className="p-3">{org._count?.invoices || 0}</td>
                  <td className="p-3">{org._count?.contacts || 0}</td>
                  <td className="p-3 text-gray-500">{new Date(org.created_at).toLocaleDateString("en-IN")}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title={isActive ? "Deactivate" : "Activate"}
                        onClick={() => {
                          if (isActive) {
                            const reason = prompt(`Deactivate "${org.name}"?\nMembers will lose access until reactivated.\n\nOptional reason:`);
                            if (reason === null) return;
                            statusMutation.mutate({ id: org.id, is_active: false, reason: reason || undefined });
                          } else {
                            if (confirm(`Reactivate "${org.name}"? Members will regain access.`)) {
                              statusMutation.mutate({ id: org.id, is_active: true });
                            }
                          }
                        }}
                      >
                        {isActive ? (
                          <PowerOff className="h-4 w-4 text-amber-600" />
                        ) : (
                          <Power className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => {
                        if (confirm(`Delete "${org.name}"? This cannot be undone.`)) deleteMutation.mutate(org.id);
                      }}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {organizations.length === 0 && !isLoading && (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">No organizations found</td></tr>
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
