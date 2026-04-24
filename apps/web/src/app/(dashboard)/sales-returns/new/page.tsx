"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Plus, Trash2, Save, Send, Upload, ScanLine, X } from "lucide-react";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface LineItem {
  id: string;
  productId?: string;
  productName: string;
  description: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  discount: number;
  taxRate: number;
  amount: number;
}

interface Contact {
  id: string;
  name: string;
  gstin?: string;
  type: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  contact_id?: string;
  total?: number;
}

interface Product {
  id: string;
  name: string;
  sku?: string;
  hsn_code?: string;
  selling_price?: number;
  tax_rate?: number;
}

const taxOptions = [
  { value: "0", label: "No Tax (0%)" },
  { value: "5", label: "GST 5%" },
  { value: "12", label: "GST 12%" },
  { value: "18", label: "GST 18%" },
  { value: "28", label: "GST 28%" },
];

const reasonOptions = [
  { value: "defective", label: "Defective" },
  { value: "wrong_item", label: "Wrong Item" },
  { value: "damaged", label: "Damaged" },
  { value: "other", label: "Other" },
];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function calcAmount(qty: number, rate: number, discount: number = 0): number {
  return qty * rate * (1 - discount / 100);
}

function calcTax(amount: number, taxRate: number): number {
  return (amount * taxRate) / 100;
}

export default function NewSalesReturnPageWrapper() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Loading…</div>}>
      <NewSalesReturnPage />
    </Suspense>
  );
}

function NewSalesReturnPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit") || null;
  const isEditing = !!editId;

  const [customer, setCustomer] = useState("");
  const [originalInvoice, setOriginalInvoice] = useState("");
  const [returnDate, setReturnDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [additionalDiscount, setAdditionalDiscount] = useState(0);
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [additionalChargesLabel, setAdditionalChargesLabel] = useState("Shipping");
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [showBarcodeInput, setShowBarcodeInput] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState("");

  useEffect(() => {
    if (isEditing) return;
    api
      .get<{ data: Record<string, unknown> }>("/settings/invoice-config")
      .then((res) => {
        const d = res.data;
        if (d) {
          if (d.default_terms_conditions) setTerms(String(d.default_terms_conditions));
          if (d.default_notes) setNotes(String(d.default_notes));
        }
      })
      .catch(() => {});
  }, [isEditing]);

  // Fetch the existing sales return when editing, then prefill every field.
  const { data: existingSalesReturn } = useQuery<any>({
    queryKey: ["sales-return", editId],
    queryFn: async () => {
      const res = await api.get<{ data: any } | any>(
        `/bill/sales-returns/${editId}`,
      );
      return (res as any)?.data ?? res;
    },
    enabled: isEditing,
  });

  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (!isEditing || !existingSalesReturn || prefilled) return;
    const sr = existingSalesReturn;
    setCustomer(sr.contact_id || "");
    if (sr.invoice_id) setOriginalInvoice(sr.invoice_id);
    if (sr.date) setReturnDate(String(sr.date).slice(0, 10));
    if (sr.reason) setReason(sr.reason);
    if (typeof sr.notes === "string") setNotes(sr.notes);
    if (typeof sr.terms === "string") setTerms(sr.terms);
    if (sr.additional_discount) setAdditionalDiscount(Number(sr.additional_discount));
    if (sr.additional_charges) setAdditionalCharges(Number(sr.additional_charges));
    if (sr.additional_charges_label) setAdditionalChargesLabel(sr.additional_charges_label);

    if (Array.isArray(sr.items) && sr.items.length > 0) {
      setItems(
        sr.items.map((it: any) => {
          const cgst = Number(it.cgst_rate) || 0;
          const sgst = Number(it.sgst_rate) || 0;
          const igst = Number(it.igst_rate) || 0;
          const taxRate = igst > 0 ? igst : cgst + sgst;
          const qty = Number(it.quantity) || 0;
          const rate = Number(it.rate) || 0;
          const discount = Number(it.discount_pct) || 0;
          return {
            id: it.id || generateId(),
            productId: it.product_id || undefined,
            productName: it.description || "",
            description: it.description || "",
            hsnCode: it.hsn_code || "",
            quantity: qty,
            rate,
            discount,
            taxRate,
            amount: calcAmount(qty, rate, discount),
          };
        }),
      );
    }
    setPrefilled(true);
  }, [isEditing, existingSalesReturn, prefilled]);

  const [items, setItems] = useState<LineItem[]>([
    {
      id: generateId(),
      productName: "",
      description: "",
      hsnCode: "",
      quantity: 1,
      rate: 0,
      discount: 0,
      taxRate: 18,
      amount: 0,
    },
  ]);

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

  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ["invoices", customer],
    queryFn: async () => {
      const params: Record<string, string> = { limit: "200" };
      if (customer) params.contact_id = customer;
      const res = await api.get<{ data: Invoice[] }>("/bill/invoices", params);
      return res.data;
    },
    enabled: true,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await api.get<{ data: Product[] }>("/stock/products", {
        limit: "200",
      });
      return res.data;
    },
  });

  const customerOptions = contacts.map((c) => ({
    value: c.id,
    label: c.name,
    description: c.gstin ? `GSTIN: ${c.gstin}` : undefined,
  }));

  const invoiceOptions = invoices.map((inv) => ({
    value: inv.id,
    label: inv.invoice_number,
    description: inv.total ? `Total: ${formatCurrency(inv.total)}` : undefined,
  }));

  const createSalesReturn = useMutation({
    mutationFn: async (status: "draft" | "approved") => {
      const halfRate = (rate: number) => rate / 2;
      const payload: Record<string, unknown> = {
        contact_id: customer,
        invoice_id: originalInvoice || undefined,
        date: returnDate,
        reason: reason || undefined,
        notes: notes || undefined,
        terms: terms || undefined,
        status,
        additional_discount: additionalDiscount || undefined,
        additional_charges: additionalCharges || undefined,
        additional_charges_label: additionalChargesLabel || undefined,
        items: items.map((item) => ({
          product_id: item.productId || undefined,
          description: item.productName || item.description,
          hsn_code: item.hsnCode || undefined,
          quantity: item.quantity,
          rate: item.rate,
          discount_pct: item.discount || undefined,
          cgst_rate: halfRate(item.taxRate),
          sgst_rate: halfRate(item.taxRate),
        })),
      };

      if (isEditing && editId) {
        const res = await api.patch<{ data: { id: string } } | { id: string }>(
          `/bill/sales-returns/${editId}`,
          payload,
        );
        return { id: (res as any)?.data?.id || (res as any)?.id || editId };
      }
      const res = await api.post<{ data: { id: string } } | { id: string }>(
        "/bill/sales-returns",
        payload,
      );
      return { id: (res as any)?.data?.id || (res as any)?.id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["sales-returns"] });
      if (isEditing && result?.id) {
        router.push(`/sales-returns/${result.id}`);
      } else {
        router.push("/sales-returns");
      }
    },
  });

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
        discount: 0,
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
        updated.amount = calcAmount(updated.quantity, updated.rate, updated.discount);
        return updated;
      })
    );
  };

  const selectProduct = (itemId: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setItems(
      items.map((item) => {
        if (item.id !== itemId) return item;
        const rate = product.selling_price || 0;
        return {
          ...item,
          productId: product.id,
          productName: product.name,
          hsnCode: product.hsn_code || "",
          rate,
          taxRate: product.tax_rate || 18,
          amount: calcAmount(item.quantity, rate, item.discount),
        };
      })
    );
  };

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
        id: newId, productId: product.id, productName: product.name,
        description: "", hsnCode: product.hsn_code || "",
        quantity: 1, rate, discount: 0, taxRate: product.tax_rate || 18,
        amount: calcAmount(1, rate, 0),
      }]);
    }
    setBarcodeValue("");
    setShowBarcodeInput(false);
  };

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const totalDiscount = items.reduce(
    (sum, item) => sum + item.quantity * item.rate * (item.discount / 100),
    0
  );

  const taxBreakdown: Record<number, { rate: number; taxable: number; tax: number }> = {};
  items.forEach((item) => {
    if (!taxBreakdown[item.taxRate]) {
      taxBreakdown[item.taxRate] = { rate: item.taxRate, taxable: 0, tax: 0 };
    }
    taxBreakdown[item.taxRate].taxable += item.amount;
    taxBreakdown[item.taxRate].tax += calcTax(item.amount, item.taxRate);
  });

  const totalTax = Object.values(taxBreakdown).reduce((sum, t) => sum + t.tax, 0);
  const grandTotal = subtotal + totalTax - additionalDiscount + additionalCharges;

  const canSubmit = customer && items.some((i) => i.amount > 0);

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
              {isEditing ? "Edit Sales Return" : "New Sales Return"}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEditing
                ? "Update this sales return"
                : "Create a new sales return"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            icon={<Save className="h-4 w-4" />}
            onClick={() => createSalesReturn.mutate("draft")}
            loading={createSalesReturn.isPending}
            disabled={!canSubmit}
          >
            {isEditing ? "Save Changes" : "Save Draft"}
          </Button>
          <Button
            icon={<Send className="h-4 w-4" />}
            onClick={() => createSalesReturn.mutate("approved")}
            loading={createSalesReturn.isPending}
            disabled={!canSubmit}
          >
            {isEditing ? "Save & Issue" : "Issue Return"}
          </Button>
        </div>
      </div>

      {createSalesReturn.isError && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg text-sm">
          {createSalesReturn.error?.message ||
            (isEditing
              ? "Failed to update sales return"
              : "Failed to create sales return")}
        </div>
      )}

      <Card padding="md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Customer"
            options={customerOptions}
            value={customer}
            onChange={setCustomer}
            searchable
            placeholder="Select a customer"
          />
          <Select
            label="Original Invoice"
            options={invoiceOptions}
            value={originalInvoice}
            onChange={setOriginalInvoice}
            searchable
            placeholder="Select original invoice"
          />
          <Input
            label="Return Date"
            type="date"
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
          />
          <Select
            label="Reason"
            options={reasonOptions}
            value={reason}
            onChange={setReason}
            placeholder="Select reason"
          />
        </div>
      </Card>

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
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-[80px]">
                  Disc %
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
                    {products.length > 0 ? (
                      <Select
                        options={products.map((p) => ({
                          value: p.id,
                          label: p.name,
                          description: p.sku || undefined,
                        }))}
                        value={item.productId || ""}
                        onChange={(val) => selectProduct(item.id, val)}
                        searchable
                        placeholder="Select product"
                      />
                    ) : (
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) =>
                          updateItem(item.id, "productName", e.target.value)
                        }
                        placeholder="Product or service name"
                        className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    )}
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
                    <input
                      type="number"
                      value={item.discount || ""}
                      onChange={(e) =>
                        updateItem(item.id, "discount", parseFloat(e.target.value) || 0)
                      }
                      placeholder="0"
                      min="0"
                      max="100"
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
                placeholder="Return policy, refund terms, etc."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
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
                {formatCurrency(subtotal + totalDiscount)}
              </span>
            </div>

            {totalDiscount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="text-danger-600">
                  - {formatCurrency(totalDiscount)}
                </span>
              </div>
            )}

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
