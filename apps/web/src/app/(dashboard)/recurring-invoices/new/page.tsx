"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { useCreateRecurringInvoice } from "@/hooks/use-recurring";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";

interface LineItem {
  id: string;
  description: string;
  hsn_code: string;
  quantity: number;
  unit: string;
  rate: number;
  discount_pct: number;
  cgst_rate: number;
  sgst_rate: number;
}

interface Contact {
  id: string;
  name: string;
  gstin?: string;
  type: string;
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

const frequencyOptions = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

const taxOptions = [
  { value: "0", label: "No Tax (0%)" },
  { value: "5", label: "GST 5%" },
  { value: "12", label: "GST 12%" },
  { value: "18", label: "GST 18%" },
  { value: "28", label: "GST 28%" },
];

export default function NewRecurringInvoicePage() {
  const router = useRouter();
  const createMutation = useCreateRecurringInvoice();

  const [name, setName] = useState("");
  const [contactId, setContactId] = useState("");
  const [frequency, setFrequency] = useState("monthly");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [paymentTermsDays, setPaymentTermsDays] = useState("30");
  const [autoSend, setAutoSend] = useState(false);
  const [notes, setNotes] = useState("");

  // Fetch contacts (customers) from API
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["contacts", "customer"],
    queryFn: async () => {
      const res = await api.get<{ data: Contact[] }>("/bill/contacts", {
        type: "customer",
        limit: "100",
      });
      return res.data;
    },
  });

  const customerOptions = contacts.map((c) => ({
    value: c.id,
    label: c.name,
    description: c.gstin ? `GSTIN: ${c.gstin}` : undefined,
  }));

  const [items, setItems] = useState<LineItem[]>([
    {
      id: genId(),
      description: "",
      hsn_code: "",
      quantity: 1,
      unit: "pcs",
      rate: 0,
      discount_pct: 0,
      cgst_rate: 9,
      sgst_rate: 9,
    },
  ]);

  const addItem = () => {
    setItems([
      ...items,
      {
        id: genId(),
        description: "",
        hsn_code: "",
        quantity: 1,
        unit: "pcs",
        rate: 0,
        discount_pct: 0,
        cgst_rate: 9,
        sgst_rate: 9,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const totalTax = items.reduce((sum, item) => {
    const taxable = item.quantity * item.rate * (1 - item.discount_pct / 100);
    return sum + (taxable * (item.cgst_rate + item.sgst_rate)) / 100;
  }, 0);
  const grandTotal = subtotal + totalTax;

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    try {
      await createMutation.mutateAsync({
        name,
        contact_id: contactId,
        frequency,
        start_date: startDate,
        end_date: endDate || undefined,
        payment_terms_days: parseInt(paymentTermsDays) || 30,
        auto_send: autoSend,
        items: items.map(({ id, ...rest }) => ({
          description: rest.description,
          hsn_code: rest.hsn_code || undefined,
          quantity: rest.quantity,
          unit: rest.unit,
          rate: rest.rate,
          discount_pct: rest.discount_pct,
          cgst_rate: rest.cgst_rate,
          sgst_rate: rest.sgst_rate,
        })),
        notes: notes || undefined,
      });
      router.push("/recurring-invoices");
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              New Recurring Invoice
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Set up automatic invoice generation
            </p>
          </div>
        </div>
        <Button
          icon={<Save className="h-4 w-4" />}
          onClick={handleSubmit}
          loading={createMutation.isPending}
        >
          Create Profile
        </Button>
      </div>

      {createMutation.isError && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg text-sm">
          {createMutation.error?.message || "Failed to create recurring invoice"}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card padding="md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Profile Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Monthly Hosting Fee"
              required
            />
            <Select
              label="Customer *"
              options={customerOptions}
              value={contactId}
              onChange={setContactId}
              searchable
              placeholder="Select a customer"
            />
            <Select
              label="Frequency *"
              options={frequencyOptions}
              value={frequency}
              onChange={setFrequency}
            />
            <Input
              label="Payment Terms (days)"
              type="number"
              value={paymentTermsDays}
              onChange={(e) => setPaymentTermsDays(e.target.value)}
            />
            <Input
              label="Start Date *"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              label="End Date (optional)"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <input
              type="checkbox"
              id="auto_send"
              checked={autoSend}
              onChange={(e) => setAutoSend(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="auto_send" className="text-sm text-gray-700">
              Automatically send invoice when generated
            </label>
          </div>
        </Card>

        {/* Line Items */}
        <Card padding="none">
          <div className="p-4 border-b border-gray-200">
            <CardHeader className="!mb-0">
              <CardTitle>Line Items</CardTitle>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                onClick={addItem}
              >
                Add Item
              </Button>
            </CardHeader>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                    Description
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
                    HSN/SAC
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-[80px]">
                    Qty
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                    Rate
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                    Tax
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-[120px]">
                    Amount
                  </th>
                  <th className="w-[50px]" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-2 px-4">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(item.id, "description", e.target.value)
                        }
                        placeholder="Product or service"
                        className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="text"
                        value={item.hsn_code}
                        onChange={(e) =>
                          updateItem(item.id, "hsn_code", e.target.value)
                        }
                        placeholder="Code"
                        className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        value={item.quantity || ""}
                        onChange={(e) =>
                          updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)
                        }
                        min="0"
                        className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        value={item.rate || ""}
                        onChange={(e) =>
                          updateItem(item.id, "rate", parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <Select
                        options={taxOptions}
                        value={String(item.cgst_rate + item.sgst_rate)}
                        onChange={(val) => {
                          const total = parseInt(val);
                          updateItem(item.id, "cgst_rate", total / 2);
                          updateItem(item.id, "sgst_rate", total / 2);
                        }}
                      />
                    </td>
                    <td className="py-2 px-4 text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(item.quantity * item.rate)}
                      </span>
                    </td>
                    <td className="py-2 px-4">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length <= 1}
                        className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-400 hover:text-danger-500 hover:bg-danger-50 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card padding="md">
            <Input
              label="Notes / Terms"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes or payment terms..."
            />
          </Card>
          <Card padding="md">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Tax</span>
                <span className="text-gray-700">
                  {formatCurrency(totalTax)}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                <span className="text-base font-semibold text-gray-900">
                  Total per Invoice
                </span>
                <span className="text-xl font-bold text-primary-800">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
