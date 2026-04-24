"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Save, Send, Upload, ScanLine, X } from "lucide-react";

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

interface Contact {
  id: string;
  name: string;
  gstin?: string;
  type: string;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  hsn_code?: string;
  selling_price?: number;
  tax_rate?: number;
  unit?: string;
}

const taxOptions = [
  { value: "0", label: "No Tax (0%)" },
  { value: "5", label: "GST 5%" },
  { value: "12", label: "GST 12%" },
  { value: "18", label: "GST 18%" },
  { value: "28", label: "GST 28%" },
];

const INDIAN_STATES = [
  { value: "AN", label: "Andaman and Nicobar Islands" },
  { value: "AP", label: "Andhra Pradesh" },
  { value: "AR", label: "Arunachal Pradesh" },
  { value: "AS", label: "Assam" },
  { value: "BR", label: "Bihar" },
  { value: "CH", label: "Chandigarh" },
  { value: "CT", label: "Chhattisgarh" },
  { value: "DN", label: "Dadra and Nagar Haveli and Daman and Diu" },
  { value: "DL", label: "Delhi" },
  { value: "GA", label: "Goa" },
  { value: "GJ", label: "Gujarat" },
  { value: "HR", label: "Haryana" },
  { value: "HP", label: "Himachal Pradesh" },
  { value: "JK", label: "Jammu and Kashmir" },
  { value: "JH", label: "Jharkhand" },
  { value: "KA", label: "Karnataka" },
  { value: "KL", label: "Kerala" },
  { value: "LA", label: "Ladakh" },
  { value: "MP", label: "Madhya Pradesh" },
  { value: "MH", label: "Maharashtra" },
  { value: "MN", label: "Manipur" },
  { value: "ML", label: "Meghalaya" },
  { value: "MZ", label: "Mizoram" },
  { value: "NL", label: "Nagaland" },
  { value: "OD", label: "Odisha" },
  { value: "PY", label: "Puducherry" },
  { value: "PB", label: "Punjab" },
  { value: "RJ", label: "Rajasthan" },
  { value: "SK", label: "Sikkim" },
  { value: "TN", label: "Tamil Nadu" },
  { value: "TG", label: "Telangana" },
  { value: "TR", label: "Tripura" },
  { value: "UP", label: "Uttar Pradesh" },
  { value: "UK", label: "Uttarakhand" },
  { value: "WB", label: "West Bengal" },
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

export default function NewPurchasePageWrapper() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Loading…</div>}>
      <NewPurchasePage />
    </Suspense>
  );
}

function NewPurchasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit") || null;
  const isEditing = !!editId;

  const [vendor, setVendor] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [vendorInvoiceNo, setVendorInvoiceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [additionalDiscount, setAdditionalDiscount] = useState(0);
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [additionalChargesLabel, setAdditionalChargesLabel] = useState("Shipping");
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [showBarcodeInput, setShowBarcodeInput] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState("");

  // Auto-fill terms & notes from invoice settings
  useEffect(() => {
    if (isEditing) return;
    api
      .get<{ data: Record<string, unknown> }>("/settings/invoice-config")
      .then((res) => {
        const d = res.data;
        if (d) {
          if (d.default_terms_conditions) {
            setTerms(String(d.default_terms_conditions));
          }
          if (d.default_notes) {
            setNotes(String(d.default_notes));
          }
        }
      })
      .catch(() => {});
  }, [isEditing]);

  // Fetch the existing purchase when editing, then prefill every field.
  const { data: existingPurchase } = useQuery<any>({
    queryKey: ["purchase", editId],
    queryFn: async () => {
      const res = await api.get<{ data: any } | any>(
        `/bill/purchases/${editId}`,
      );
      return (res as any)?.data ?? res;
    },
    enabled: isEditing,
  });

  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (!isEditing || !existingPurchase || prefilled) return;
    const p = existingPurchase;
    setVendor(p.contact_id || "");
    if (p.date) setInvoiceDate(String(p.date).slice(0, 10));
    if (p.due_date) setDueDate(String(p.due_date).slice(0, 10));
    if (p.place_of_supply) setPlaceOfSupply(p.place_of_supply);
    if (p.vendor_invoice_no) setVendorInvoiceNo(p.vendor_invoice_no);
    if (typeof p.notes === "string") setNotes(p.notes);
    if (typeof p.terms === "string") setTerms(p.terms);

    if (Array.isArray(p.items) && p.items.length > 0) {
      setItems(
        p.items.map((it: any) => {
          const cgst = Number(it.cgst_rate) || 0;
          const sgst = Number(it.sgst_rate) || 0;
          const igst = Number(it.igst_rate) || 0;
          const taxRate = igst > 0 ? igst : cgst + sgst;
          const qty = Number(it.quantity) || 0;
          const rate = Number(it.rate) || 0;
          return {
            id: it.id || generateId(),
            productName: it.description || "",
            description: it.description || "",
            hsnCode: it.hsn_code || "",
            quantity: qty,
            rate,
            taxRate,
            amount: calcAmount(qty, rate),
          };
        }),
      );
    }
    setPrefilled(true);
  }, [isEditing, existingPurchase, prefilled]);

  // Fetch contacts (vendors) from API
  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ["contacts", "vendor"],
    queryFn: async () => {
      const res = await api.get<{ data: Contact[] }>("/bill/contacts", {
        type: "vendor",
        limit: "100",
      });
      return res.data;
    },
  });

  const vendorOptions = contacts.map((c) => ({
    value: c.id,
    label: c.name,
    description: c.gstin ? `GSTIN: ${c.gstin}` : undefined,
  }));

  // Fetch products from API
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await api.get<{ data: Product[] }>("/stock/products", {
        limit: "200",
      });
      return res.data;
    },
  });

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSignaturePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleBarcodeScan = () => {
    if (!barcodeValue.trim()) return;
    const product = products.find(
      (p) => p.sku === barcodeValue.trim() || p.name.toLowerCase().includes(barcodeValue.trim().toLowerCase())
    );
    if (product) {
      const newId = generateId();
      const rate = product.selling_price || 0;
      setItems([...items, {
        id: newId, productName: product.name,
        description: "", hsnCode: product.hsn_code || "",
        quantity: 1, rate, taxRate: product.tax_rate || 18,
        amount: calcAmount(1, rate),
      }]);
    }
    setBarcodeValue("");
    setShowBarcodeInput(false);
  };

  // Create or update purchase mutation
  const createPurchase = useMutation({
    mutationFn: async (status: "draft" | "approved") => {
      const halfRate = (rate: number) => rate / 2;
      const payload: Record<string, unknown> = {
        type: "purchase",
        contact_id: vendor,
        date: invoiceDate,
        due_date: dueDate || undefined,
        place_of_supply: placeOfSupply || undefined,
        vendor_invoice_no: vendorInvoiceNo || undefined,
        notes: notes || undefined,
        terms: terms || undefined,
        is_posted: status === "approved",
        items: items.map((item) => ({
          description: item.productName || item.description,
          hsn_code: item.hsnCode || undefined,
          quantity: item.quantity,
          rate: item.rate,
          cgst_rate: halfRate(item.taxRate),
          sgst_rate: halfRate(item.taxRate),
        })),
      };

      if (isEditing && editId) {
        const { type: _type, ...updatePayload } = payload;
        void _type;
        const res = await api.patch<{ data: { id: string } } | { id: string }>(
          `/bill/purchases/${editId}`,
          updatePayload,
        );
        return { id: (res as any)?.data?.id || (res as any)?.id || editId };
      }
      const res = await api.post<{ data: { id: string } } | { id: string }>(
        "/bill/purchases",
        payload,
      );
      return { id: (res as any)?.data?.id || (res as any)?.id };
    },
    onSuccess: (result) => {
      if (isEditing && result?.id) {
        router.push(`/purchases/${result.id}`);
      } else {
        router.push("/purchases");
      }
    },
  });

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

  const canSubmit = vendor && items.some((i) => i.amount > 0);

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
  const grandTotal = subtotal + totalTax - additionalDiscount + additionalCharges;

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
              {isEditing ? "Edit Purchase Invoice" : "New Purchase Invoice"}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEditing
                ? "Update this purchase invoice"
                : "Record a bill from a vendor"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            icon={<Save className="h-4 w-4" />}
            onClick={() => createPurchase.mutate("draft")}
            loading={createPurchase.isPending}
            disabled={!canSubmit}
          >
            {isEditing ? "Save Changes" : "Save Draft"}
          </Button>
          <Button
            icon={<Send className="h-4 w-4" />}
            onClick={() => createPurchase.mutate("approved")}
            loading={createPurchase.isPending}
            disabled={!canSubmit}
          >
            {isEditing ? "Save & Approve" : "Save & Approve"}
          </Button>
        </div>
      </div>

      {createPurchase.isError && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg text-sm">
          {createPurchase.error?.message ||
            (isEditing ? "Failed to update purchase" : "Failed to create purchase")}
        </div>
      )}

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
            options={INDIAN_STATES}
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
            <div className="flex items-center gap-2">
              {showBarcodeInput ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={barcodeValue}
                    onChange={(e) => setBarcodeValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleBarcodeScan()}
                    placeholder="Enter SKU / barcode..."
                    className="h-9 w-48 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleBarcodeScan}>Go</Button>
                  <button onClick={() => setShowBarcodeInput(false)} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<ScanLine className="h-4 w-4" />}
                  onClick={() => setShowBarcodeInput(true)}
                >
                  Scan Barcode
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                onClick={addItem}
              >
                Add Item
              </Button>
            </div>
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
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes..."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Terms & Conditions</label>
              <textarea
                rows={3}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Payment terms, validity, etc."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            {/* Signature Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Signature</label>
              {signaturePreview ? (
                <div className="relative inline-block">
                  <img src={signaturePreview} alt="Signature" className="h-16 border border-gray-200 rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setSignaturePreview(null)}
                    className="absolute -top-2 -right-2 h-5 w-5 bg-danger-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-colors">
                  <Upload className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">Upload signature image</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
                </label>
              )}
            </div>
          </div>
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

            {/* Additional Discount */}
            <div className="flex items-center justify-between text-sm gap-4">
              <span className="text-gray-500 whitespace-nowrap">Discount</span>
              <input
                type="number"
                value={additionalDiscount || ""}
                onChange={(e) => setAdditionalDiscount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-28 h-8 rounded-md border border-gray-300 px-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Additional Charges */}
            <div className="flex items-center justify-between text-sm gap-4">
              <input
                type="text"
                value={additionalChargesLabel}
                onChange={(e) => setAdditionalChargesLabel(e.target.value)}
                className="w-28 h-8 rounded-md border border-gray-200 px-2 text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <input
                type="number"
                value={additionalCharges || ""}
                onChange={(e) => setAdditionalCharges(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-28 h-8 rounded-md border border-gray-300 px-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

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
