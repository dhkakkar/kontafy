"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Plus, Trash2, Save, Send } from "lucide-react";

interface LineItem {
  id: string;
  productName: string;
  description: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  taxRate: number;
  amount: number;
}

const vendorOptions = [
  { value: "v1", label: "Skyline Properties", description: "GSTIN: 27AABCS9012C1Z1" },
  { value: "v2", label: "Office Supplies Co." },
  { value: "v3", label: "CloudHost India", description: "GSTIN: 29AABCC4567E1Z5" },
  { value: "v4", label: "RawMat Suppliers", description: "GSTIN: 24AABCR8901F1Z3" },
  { value: "v5", label: "Logistics Express" },
  { value: "v6", label: "Power Utilities Ltd." },
];

const taxOptions = [
  { value: "0", label: "No Tax (0%)" },
  { value: "5", label: "GST 5%" },
  { value: "12", label: "GST 12%" },
  { value: "18", label: "GST 18%" },
  { value: "28", label: "GST 28%" },
];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function calcAmount(qty: number, rate: number): number {
  return qty * rate;
}

function calcTax(amount: number, taxRate: number): number {
  return (amount * taxRate) / 100;
}

export default function NewPurchasePage() {
  const router = useRouter();
  const [vendor, setVendor] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<LineItem[]>([
    {
      id: generateId(),
      productName: "",
      description: "",
      hsnCode: "",
      quantity: 1,
      rate: 0,
      taxRate: 18,
      amount: 0,
    },
  ]);

  const addItem = () => {
    setItems([
      ...items,
      {
        id: generateId(),
        productName: "",
        description: "",
        hsnCode: "",
        quantity: 1,
        rate: 0,
        taxRate: 18,
        amount: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setItems(
      items.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        updated.amount = calcAmount(updated.quantity, updated.rate);
        return updated;
      })
    );
  };

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);

  const taxBreakdown: Record<number, { rate: number; taxable: number; tax: number }> = {};
  items.forEach((item) => {
    if (!taxBreakdown[item.taxRate]) {
      taxBreakdown[item.taxRate] = { rate: item.taxRate, taxable: 0, tax: 0 };
    }
    taxBreakdown[item.taxRate].taxable += item.amount;
    taxBreakdown[item.taxRate].tax += calcTax(item.amount, item.taxRate);
  });

  const totalTax = Object.values(taxBreakdown).reduce(
    (sum, t) => sum + t.tax,
    0
  );
  const grandTotal = subtotal + totalTax;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
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
              New Purchase Invoice
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Record a bill from a vendor
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" icon={<Save className="h-4 w-4" />}>
            Save Draft
          </Button>
          <Button icon={<Send className="h-4 w-4" />}>Save & Approve</Button>
        </div>
      </div>

      {/* Vendor & Dates */}
      <Card padding="md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Vendor"
            options={vendorOptions}
            value={vendor}
            onChange={setVendor}
            searchable
            placeholder="Select a vendor"
          />
          <Input
            label="Vendor Invoice Number"
            value={vendorInvoiceNo}
            onChange={(e) => setVendorInvoiceNo(e.target.value)}
            placeholder="Vendor's invoice/bill number"
          />
          <Select
            label="Place of Supply"
            options={[
              { value: "MH", label: "Maharashtra" },
              { value: "DL", label: "Delhi" },
              { value: "KA", label: "Karnataka" },
              { value: "GJ", label: "Gujarat" },
              { value: "TN", label: "Tamil Nadu" },
              { value: "UP", label: "Uttar Pradesh" },
              { value: "RJ", label: "Rajasthan" },
            ]}
            value={placeOfSupply}
            onChange={setPlaceOfSupply}
            searchable
            placeholder="Select state"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Bill Date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
            <Input
              label="Due Date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
      </Card>

      {/* Line Items */}
      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <CardHeader className="!mb-0">
            <CardTitle>Line Items</CardTitle>
            <Button
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
                  Item
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
                      value={item.productName}
                      onChange={(e) =>
                        updateItem(item.id, "productName", e.target.value)
                      }
                      placeholder="Product or service name"
                      className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <input
                      type="text"
                      value={item.hsnCode}
                      onChange={(e) =>
                        updateItem(item.id, "hsnCode", e.target.value)
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
                        updateItem(
                          item.id,
                          "quantity",
                          parseFloat(e.target.value) || 0
                        )
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
                        updateItem(
                          item.id,
                          "rate",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="0.00"
                      className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <Select
                      options={taxOptions}
                      value={String(item.taxRate)}
                      onChange={(val) =>
                        updateItem(item.id, "taxRate", parseInt(val))
                      }
                    />
                  </td>
                  <td className="py-2 px-4 text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(item.amount)}
                    </span>
                  </td>
                  <td className="py-2 px-4">
                    <button
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

            {Object.values(taxBreakdown).map(
              (tax) =>
                tax.rate > 0 && (
                  <div
                    key={tax.rate}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-500">
                      CGST @{tax.rate / 2}% + SGST @{tax.rate / 2}%
                    </span>
                    <span className="text-gray-700">
                      {formatCurrency(tax.tax)}
                    </span>
                  </div>
                )
            )}

            <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
              <span className="text-base font-semibold text-gray-900">
                Total
              </span>
              <span className="text-xl font-bold text-primary-800">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
