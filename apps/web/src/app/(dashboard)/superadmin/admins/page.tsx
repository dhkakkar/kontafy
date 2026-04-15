"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Trash2, Plus } from "lucide-react";

export default function SuperadminAdminsPage() {
  const queryClient = useQueryClient();
  const [newUserId, setNewUserId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["superadmin", "admins"],
    queryFn: () => api.get<any>("/superadmin/admins"),
  });

  const rawData = data?.data || data;
  const admins = Array.isArray(rawData) ? rawData : [];

  const grantMutation = useMutation({
    mutationFn: (userId: string) => api.post("/superadmin/admins", { user_id: userId }),
    onSuccess: () => {
      alert("Superadmin granted");
      setNewUserId("");
      queryClient.invalidateQueries({ queryKey: ["superadmin", "admins"] });
    },
    onError: (e: any) => alert(e?.message || "Failed to grant superadmin"),
  });

  const revokeMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/superadmin/admins/${userId}`),
    onSuccess: () => {
      alert("Superadmin revoked");
      queryClient.invalidateQueries({ queryKey: ["superadmin", "admins"] });
    },
    onError: (e: any) => alert(e?.message || "Failed to revoke"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Superadmins</h1>
        <p className="text-sm text-gray-500 mt-1">Manage platform-level superadmin access</p>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-3">Grant Superadmin Access</h2>
        <div className="flex gap-3 max-w-lg">
          <Input placeholder="Enter user ID (UUID)..." value={newUserId} onChange={(e) => setNewUserId(e.target.value)} />
          <Button variant="primary" onClick={() => { if (newUserId.trim()) grantMutation.mutate(newUserId.trim()); }} loading={grantMutation.isPending}>
            <Plus className="h-4 w-4 mr-1" /> Grant
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2">You can find user IDs in the Users tab</p>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-medium text-gray-600">User</th>
                <th className="text-left p-3 font-medium text-gray-600">User ID</th>
                <th className="text-left p-3 font-medium text-gray-600">Granted</th>
                <th className="text-right p-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin: any) => (
                <tr key={admin.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-amber-500" />
                      <div>
                        <p className="font-medium">{admin.full_name || "Unnamed"}</p>
                        <p className="text-xs text-gray-500">{admin.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3"><code className="text-xs bg-gray-100 px-2 py-1 rounded">{admin.user_id}</code></td>
                  <td className="p-3 text-gray-500">{new Date(admin.created_at).toLocaleDateString("en-IN")}</td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => {
                      if (confirm(`Revoke superadmin from ${admin.email}?`)) revokeMutation.mutate(admin.user_id);
                    }}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
              {admins.length === 0 && !isLoading && (
                <tr><td colSpan={4} className="p-8 text-center text-gray-400">No superadmins configured</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
