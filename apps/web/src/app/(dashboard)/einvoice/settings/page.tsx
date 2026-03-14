"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useGspSettings, useUpdateGspSettings } from "@/hooks/use-einvoice";

export default function EInvoiceSettingsPage() {
  const router = useRouter();
  const { data: settings, isLoading } = useGspSettings();
  const updateMutation = useUpdateGspSettings();

  const [form, setForm] = useState({
    gsp_provider: "nic",
    gsp_username: "",
    gsp_password: "",
    gsp_client_id: "",
    gsp_client_secret: "",
    gstin: "",
    auto_generate: false,
    auto_eway_bill: false,
    eway_bill_threshold: 50000,
    sandbox_mode: true,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        gsp_provider: settings.gsp_provider || "nic",
        gsp_username: settings.gsp_username || "",
        gsp_password: "",
        gsp_client_id: settings.gsp_client_id || "",
        gsp_client_secret: "",
        gstin: settings.gstin || "",
        auto_generate: settings.auto_generate || false,
        auto_eway_bill: settings.auto_eway_bill || false,
        eway_bill_threshold: settings.eway_bill_threshold || 50000,
        sandbox_mode: settings.sandbox_mode,
      });
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: Record<string, any> = {};

    // Only send fields that changed
    if (form.gsp_provider) payload.gsp_provider = form.gsp_provider;
    if (form.gsp_username) payload.gsp_username = form.gsp_username;
    if (form.gsp_password) payload.gsp_password = form.gsp_password;
    if (form.gsp_client_id) payload.gsp_client_id = form.gsp_client_id;
    if (form.gsp_client_secret) payload.gsp_client_secret = form.gsp_client_secret;
    if (form.gstin) payload.gstin = form.gstin;
    payload.auto_generate = form.auto_generate;
    payload.auto_eway_bill = form.auto_eway_bill;
    payload.eway_bill_threshold = form.eway_bill_threshold;
    payload.sandbox_mode = form.sandbox_mode;

    try {
      await updateMutation.mutateAsync(payload);
    } catch {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <Card>
          <div className="space-y-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          icon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => router.push("/einvoice")}
        >
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            E-Invoice Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure GSP credentials and e-invoice preferences
          </p>
        </div>
      </div>

      {updateMutation.isSuccess && (
        <Card className="border-green-200 bg-green-50">
          <p className="text-sm text-green-700">Settings saved successfully.</p>
        </Card>
      )}

      {updateMutation.isError && (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{updateMutation.error.message}</p>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            GSP Credentials
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GSP Provider
              </label>
              <select
                value={form.gsp_provider}
                onChange={(e) =>
                  setForm({ ...form, gsp_provider: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="nic">NIC (Direct)</option>
                <option value="cleartax">ClearTax</option>
                <option value="masters_india">Masters India</option>
                <option value="cygnet">Cygnet</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GSTIN
              </label>
              <Input
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                placeholder="Enter your GSTIN"
                maxLength={15}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Username
                </label>
                <Input
                  value={form.gsp_username}
                  onChange={(e) =>
                    setForm({ ...form, gsp_username: e.target.value })
                  }
                  placeholder="GSP username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Password
                </label>
                <Input
                  type="password"
                  value={form.gsp_password}
                  onChange={(e) =>
                    setForm({ ...form, gsp_password: e.target.value })
                  }
                  placeholder={settings?.gsp_password ? "********" : "Enter password"}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client ID
                </label>
                <Input
                  value={form.gsp_client_id}
                  onChange={(e) =>
                    setForm({ ...form, gsp_client_id: e.target.value })
                  }
                  placeholder="Client ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Secret
                </label>
                <Input
                  type="password"
                  value={form.gsp_client_secret}
                  onChange={(e) =>
                    setForm({ ...form, gsp_client_secret: e.target.value })
                  }
                  placeholder={settings?.gsp_client_secret ? "********" : "Enter secret"}
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="mt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Preferences
          </h3>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.sandbox_mode}
                onChange={(e) =>
                  setForm({ ...form, sandbox_mode: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Sandbox Mode
                </span>
                <p className="text-xs text-gray-500">
                  Use NIC sandbox environment for testing
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.auto_generate}
                onChange={(e) =>
                  setForm({ ...form, auto_generate: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Auto-generate E-Invoices
                </span>
                <p className="text-xs text-gray-500">
                  Automatically generate e-invoices when B2B invoices are
                  finalized
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.auto_eway_bill}
                onChange={(e) =>
                  setForm({ ...form, auto_eway_bill: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Auto-trigger E-Way Bills
                </span>
                <p className="text-xs text-gray-500">
                  Prompt for e-way bill generation when invoice total exceeds
                  threshold
                </p>
              </div>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-Way Bill Threshold (INR)
              </label>
              <Input
                type="number"
                value={String(form.eway_bill_threshold)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    eway_bill_threshold: Number(e.target.value),
                  })
                }
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                As per GST rules, e-way bills are mandatory for goods exceeding
                Rs.50,000
              </p>
            </div>
          </div>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            icon={
              updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )
            }
          >
            {updateMutation.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
