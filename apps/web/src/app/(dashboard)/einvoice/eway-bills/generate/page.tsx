"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Truck, Loader2 } from "lucide-react";
import { useGenerateEwayBill, useEwayBillList } from "@/hooks/use-einvoice";

export default function GenerateEwayBillPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center mt-12"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>}>
      <GenerateEwayBillContent />
    </Suspense>
  );
}

function GenerateEwayBillContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedInvoiceId = searchParams.get("invoiceId") || "";

  const generateMutation = useGenerateEwayBill();
  const { data: ewayList, isLoading: loadingInvoices } = useEwayBillList({
    page: 1,
    limit: 100,
    status: "pending",
  });

  const eligibleInvoices = (ewayList?.data || []).filter(
    (i) => !i.eway_bill_no,
  );

  const [form, setForm] = useState({
    invoiceId: preselectedInvoiceId,
    distance: "",
    subType: "1",
    transportMode: "1",
    transporterId: "",
    transporterName: "",
    vehicleNo: "",
    vehicleType: "R",
    transportDocNo: "",
    transportDocDate: "",
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.invoiceId || !form.distance) return;

    try {
      await generateMutation.mutateAsync({
        invoiceId: form.invoiceId,
        data: {
          sub_type: form.subType,
          distance: Number(form.distance),
          transport: {
            transport_mode: form.transportMode,
            transporter_id: form.transporterId || undefined,
            transporter_name: form.transporterName || undefined,
            vehicle_no: form.vehicleNo || undefined,
            vehicle_type: form.vehicleType,
            transport_doc_no: form.transportDocNo || undefined,
            transport_doc_date: form.transportDocDate || undefined,
          },
        },
      });
      router.push("/einvoice/eway-bills");
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          icon={<ArrowLeft className="h-4 w-4" />}
          onClick={() => router.push("/einvoice/eway-bills")}
        >
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Generate E-Way Bill
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Enter transport details to generate an e-way bill
          </p>
        </div>
      </div>

      {generateMutation.isError && (
        <Card className="border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{generateMutation.error.message}</p>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Invoice Details
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice
              </label>
              <select
                value={form.invoiceId}
                onChange={(e) => updateField("invoiceId", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                required
                disabled={loadingInvoices}
              >
                <option value="">
                  {loadingInvoices
                    ? "Loading invoices..."
                    : eligibleInvoices.length === 0
                    ? "No invoices pending e-way bill"
                    : "Select an invoice"}
                </option>
                {eligibleInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} — {inv.contact_name || "N/A"} —{" "}
                    ₹{Number(inv.total).toLocaleString("en-IN")}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supply Sub-Type
                </label>
                <select
                  value={form.subType}
                  onChange={(e) => updateField("subType", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="1">Supply</option>
                  <option value="2">Export</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Distance (km)
                </label>
                <Input
                  type="number"
                  value={form.distance}
                  onChange={(e) => updateField("distance", e.target.value)}
                  placeholder="e.g., 250"
                  min="0"
                  max="4000"
                  required
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="mt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Transport Details
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transport Mode
                </label>
                <select
                  value={form.transportMode}
                  onChange={(e) => updateField("transportMode", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="1">Road</option>
                  <option value="2">Rail</option>
                  <option value="3">Air</option>
                  <option value="4">Ship</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Type
                </label>
                <select
                  value={form.vehicleType}
                  onChange={(e) => updateField("vehicleType", e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="R">Regular</option>
                  <option value="O">Over Dimensional Cargo</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transporter ID (GSTIN)
                </label>
                <Input
                  value={form.transporterId}
                  onChange={(e) => updateField("transporterId", e.target.value)}
                  placeholder="e.g., 29AABCX1234P1Z1"
                  maxLength={15}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transporter Name
                </label>
                <Input
                  value={form.transporterName}
                  onChange={(e) =>
                    updateField("transporterName", e.target.value)
                  }
                  placeholder="Transport company name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Number
                </label>
                <Input
                  value={form.vehicleNo}
                  onChange={(e) =>
                    updateField("vehicleNo", e.target.value.toUpperCase())
                  }
                  placeholder="e.g., MH12AB1234"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transport Doc No.
                </label>
                <Input
                  value={form.transportDocNo}
                  onChange={(e) =>
                    updateField("transportDocNo", e.target.value)
                  }
                  placeholder="LR/RR/Airway Bill No."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transport Doc Date
              </label>
              <Input
                type="date"
                value={form.transportDocDate}
                onChange={(e) =>
                  updateField("transportDocDate", e.target.value)
                }
              />
            </div>
          </div>
        </Card>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/einvoice/eway-bills")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={generateMutation.isPending || !form.invoiceId || !form.distance}
            icon={
              generateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Truck className="h-4 w-4" />
              )
            }
          >
            {generateMutation.isPending ? "Generating..." : "Generate E-Way Bill"}
          </Button>
        </div>
      </form>
    </div>
  );
}
