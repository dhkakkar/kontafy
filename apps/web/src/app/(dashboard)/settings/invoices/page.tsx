"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { Save, FileText, Landmark } from "lucide-react";

export default function InvoiceConfigPage() {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    invoice_prefix: "INV-",
    next_invoice_number: "1",
    default_payment_terms: "30",
    default_terms_conditions:
      "Thank you for your business. Payment is due within the agreed terms.",
    default_notes: "",
    bank_name: "",
    bank_account_number: "",
    bank_ifsc: "",
    bank_branch: "",
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      await api.patch("/settings/invoice-config", {
        invoice_prefix: form.invoice_prefix,
        next_invoice_number: parseInt(form.next_invoice_number) || 1,
        default_payment_terms: parseInt(form.default_payment_terms) || 30,
        default_terms_conditions: form.default_terms_conditions,
        default_notes: form.default_notes,
        bank_name: form.bank_name,
        bank_account_number: form.bank_account_number,
        bank_ifsc: form.bank_ifsc,
        bank_branch: form.bank_branch,
      });
      setSuccess(true);
    } catch (err) {
      console.error("Failed to save invoice config:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Invoice Numbering */}
      <Card padding="md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-400" />
            Invoice Numbering
          </CardTitle>
        </CardHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Invoice Prefix"
            value={form.invoice_prefix}
            onChange={(e) => updateField("invoice_prefix", e.target.value)}
            placeholder="e.g., INV-, KTF-"
            hint="This appears before the invoice number"
          />
          <Input
            label="Next Invoice Number"
            type="number"
            value={form.next_invoice_number}
            onChange={(e) =>
              updateField("next_invoice_number", e.target.value)
            }
            placeholder="1"
            hint="The next invoice will use this number"
          />
          <Select
            label="Default Payment Terms"
            options={[
              { value: "0", label: "Due on Receipt" },
              { value: "7", label: "Net 7 (7 days)" },
              { value: "15", label: "Net 15 (15 days)" },
              { value: "30", label: "Net 30 (30 days)" },
              { value: "45", label: "Net 45 (45 days)" },
              { value: "60", label: "Net 60 (60 days)" },
              { value: "90", label: "Net 90 (90 days)" },
            ]}
            value={form.default_payment_terms}
            onChange={(v) => updateField("default_payment_terms", v)}
          />
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">
            Preview:{" "}
            <span className="font-mono font-medium text-gray-700">
              {form.invoice_prefix}
              {String(form.next_invoice_number).padStart(4, "0")}
            </span>
          </p>
        </div>
      </Card>

      {/* Default Terms & Notes */}
      <Card padding="md">
        <CardHeader>
          <CardTitle>Default Terms & Notes</CardTitle>
        </CardHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Terms & Conditions
            </label>
            <textarea
              rows={4}
              value={form.default_terms_conditions}
              onChange={(e) =>
                updateField("default_terms_conditions", e.target.value)
              }
              placeholder="Enter default terms & conditions for your invoices..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
            <p className="mt-1 text-xs text-gray-500">
              This will appear at the bottom of every invoice by default
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Default Notes
            </label>
            <textarea
              rows={3}
              value={form.default_notes}
              onChange={(e) => updateField("default_notes", e.target.value)}
              placeholder="Any notes you want to include on invoices..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            />
          </div>
        </div>
      </Card>

      {/* Bank Details */}
      <Card padding="md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-gray-400" />
            Bank Details for Invoices
          </CardTitle>
        </CardHeader>

        <p className="text-sm text-gray-500 mb-4">
          These bank details will be printed on your invoices for customers to
          make payments.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Bank Name"
            value={form.bank_name}
            onChange={(e) => updateField("bank_name", e.target.value)}
            placeholder="e.g., HDFC Bank"
          />
          <Input
            label="Account Number"
            value={form.bank_account_number}
            onChange={(e) =>
              updateField("bank_account_number", e.target.value)
            }
            placeholder="e.g., 50200012345678"
          />
          <Input
            label="IFSC Code"
            value={form.bank_ifsc}
            onChange={(e) => updateField("bank_ifsc", e.target.value)}
            placeholder="e.g., HDFC0001234"
          />
          <Input
            label="Branch"
            value={form.bank_branch}
            onChange={(e) => updateField("bank_branch", e.target.value)}
            placeholder="e.g., Andheri East, Mumbai"
          />
        </div>
      </Card>

      <div className="flex items-center gap-3 justify-end">
        {success && (
          <span className="text-sm text-success-700">Settings saved!</span>
        )}
        <Button
          icon={<Save className="h-4 w-4" />}
          onClick={handleSave}
          loading={saving}
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
