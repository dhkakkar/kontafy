"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBranch, useUpdateBranch } from "@/hooks/use-branches";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

export default function EditBranchPage() {
  const router = useRouter();
  const params = useParams();
  const branchId = params.id as string;

  const { data: branch, isLoading } = useBranch(branchId);
  const updateMutation = useUpdateBranch();

  const [form, setForm] = useState({
    name: "",
    code: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    email: "",
    manager_name: "",
    is_main: false,
    is_active: true,
  });

  useEffect(() => {
    if (branch) {
      setForm({
        name: branch.name || "",
        code: branch.code || "",
        address_line1: branch.address?.line1 || "",
        address_line2: branch.address?.line2 || "",
        city: branch.address?.city || "",
        state: branch.address?.state || "",
        pincode: branch.address?.pincode || "",
        phone: branch.phone || "",
        email: branch.email || "",
        manager_name: branch.manager_name || "",
        is_main: branch.is_main,
        is_active: branch.is_active,
      });
    }
  }, [branch]);

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        id: branchId,
        data: {
          name: form.name,
          code: form.code || undefined,
          address: {
            line1: form.address_line1,
            line2: form.address_line2,
            city: form.city,
            state: form.state,
            pincode: form.pincode,
          },
          phone: form.phone || undefined,
          email: form.email || undefined,
          manager_name: form.manager_name || undefined,
          is_main: form.is_main,
          is_active: form.is_active,
        },
      });
      router.push(`/branches/${branchId}`);
    } catch {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Branch not found</h1>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Branch</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Update branch information
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card padding="md">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Branch Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Branch Name *"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="e.g., Mumbai Head Office"
              required
            />
            <Input
              label="Branch Code"
              value={form.code}
              onChange={(e) => updateField("code", e.target.value)}
              placeholder="Branch code"
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="+91 9876543210"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              placeholder="branch@company.com"
            />
            <Input
              label="Manager Name"
              value={form.manager_name}
              onChange={(e) => updateField("manager_name", e.target.value)}
              placeholder="Branch manager"
            />
            <div className="flex flex-col gap-2 pt-6">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_main"
                  checked={form.is_main}
                  onChange={(e) => updateField("is_main", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="is_main" className="text-sm text-gray-700">
                  Set as main branch
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active}
                  onChange={(e) => updateField("is_active", e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700">
                  Active
                </label>
              </div>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Address Line 1"
                value={form.address_line1}
                onChange={(e) => updateField("address_line1", e.target.value)}
                placeholder="Street address"
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Address Line 2"
                value={form.address_line2}
                onChange={(e) => updateField("address_line2", e.target.value)}
                placeholder="Apartment, suite, etc."
              />
            </div>
            <Input
              label="City"
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              placeholder="City"
            />
            <Input
              label="State"
              value={form.state}
              onChange={(e) => updateField("state", e.target.value)}
              placeholder="State"
            />
            <Input
              label="PIN Code"
              value={form.pincode}
              onChange={(e) => updateField("pincode", e.target.value)}
              placeholder="400001"
            />
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            icon={<Save className="h-4 w-4" />}
            loading={updateMutation.isPending}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
