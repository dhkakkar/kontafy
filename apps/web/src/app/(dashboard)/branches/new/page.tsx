"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateBranch } from "@/hooks/use-branches";
import { ArrowLeft, Save } from "lucide-react";

export default function NewBranchPage() {
  const router = useRouter();
  const createMutation = useCreateBranch();

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
  });

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
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
      });
      router.push("/branches");
    } catch {
      // Error handled by mutation
    }
  };

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
          <h1 className="text-2xl font-bold text-gray-900">New Branch</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Add a new branch or location
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
              placeholder="Auto-generated if empty"
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
            <div className="flex items-center gap-3 pt-6">
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
            loading={createMutation.isPending}
          >
            Create Branch
          </Button>
        </div>
      </form>
    </div>
  );
}
