"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
  unit: string;
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
  unit?: string;
}

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

export default function NewDeliveryChallanPageWrapper() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Loading…</div>}>
      <NewDeliveryChallanPage />
    </Suspense>
  );
}

function NewDeliveryChallanPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit") || null;
  const isEditing = !!editId;

  const [customer, setCustomer] = useState("");
  const [challanDate, setChallanDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [showBarcodeInput, setShowBarcodeInput] = useState(false);
  const [barcodeValue, setBarcodeValue] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [additionalDiscount, setAdditionalDiscount] = useState(0);
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [additionalChargesLabel, setAdditionalChargesLabel] = useState("Shipping");

  // Fetch the existing delivery challan when editing, then prefill every field.
  const { data: existingChallan } = useQuery<any>({
    queryKey: ["delivery-challan", editId],
    queryFn: async () => {
      const res = await api.get<{ data: any } | any>(
        `/bill/delivery-challans/${editId}`,
      );
      return (res as any)?.data ?? res;
    },
    enabled: isEditing,
  });

  const [prefilled, setPrefilled] = useState(false);
  useEffect(() => {
    if (!isEditing || !existingChallan || prefilled) return;
    const dc = existingChallan;
    setCustomer(dc.contact_id || "");
    if (dc.date) setChallanDate(String(dc.date).slice(0, 10));
    if (dc.place_of_supply) setPlaceOfSupply(dc.place_of_supply);
    if (typeof dc.delivery_address === "string") setDeliveryAddress(dc.delivery_address);
    if (typeof dc.notes === "string") setNotes(dc.notes);

    if (Array.isArray(dc.items) && dc.items.length > 0) {
      setItems(
        dc.items.map((it: any) => ({
          id: it.id || generateId(),
          productId: it.product_id || undefined,
          productName: it.description || "",
          description: it.description || "",
          hsnCode: it.hsn_code || "",
          quantity: Number(it.quantity) || 0,
          unit: it.unit || "pcs",
        })),
      );
    }
    setPrefilled(true);
  }, [isEditing, existingChallan, prefilled]);

  const [items, setItems] = useState<LineItem[]>([
    {
      id: generateId(),
      productName: "",
      description: "",
      hsnCode: "",
      quantity: 1,
      unit: "pcs",
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

  const createChallan = useMutation({
    mutationFn: async (status: "draft" | "sent") => {
      const payload: Record<string, unknown> = {
        contact_id: customer,
        date: challanDate,
        place_of_supply: placeOfSupply || undefined,
        delivery_address: deliveryAddress || undefined,
        notes: notes || undefined,
        status,
        items: items.map((item) => ({
          product_id: item.productId || undefined,
          description: item.productName || item.description,
          hsn_code: item.hsnCode || undefined,
          quantity: item.quantity,
          unit: item.unit || "pcs",
        })),
      };

      if (isEditing && editId) {
        const res = await api.patch<{ data: { id: string } } | { id: string }>(
          `/bill/delivery-challans/${editId}`,
          payload,
        );
        return { id: (res as any)?.data?.id || (res as any)?.id || editId };
      }
      const res = await api.post<{ data: { id: string } } | { id: string }>(
        "/bill/delivery-challans",
        payload,
      );
      return { id: (res as any)?.data?.id || (res as any)?.id };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["delivery-challans"] });
      if (isEditing && result?.id) {
        router.push(`/delivery-challans/${result.id}`);
      } else {
        router.push("/delivery-challans");
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
        unit: "pcs",
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
        return { ...item, [field]: value };
      })
    );
  };

  const selectProduct = (itemId: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setItems(
      items.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          productId: product.id,
          productName: product.name,
          hsnCode: product.hsn_code || "",
          unit: product.unit || "pcs",
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
      setItems([...items, {
        id: newId, productId: product.id, productName: product.name,
        description: "", hsnCode: product.hsn_code || "",
        quantity: 1, unit: product.unit || "pcs",
      }]);
    }
    setBarcodeValue("");
    setShowBarcodeInput(false);
  };

  const canSubmit = customer && items.some((i) => i.productName && i.quantity > 0);

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
              {isEditing ? "Edit Delivery Challan" : "New Delivery Challan"}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isEditing
                ? "Update this delivery challan"
                : "Create a new delivery challan"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            icon={<Save className="h-4 w-4" />}
            onClick={() => createChallan.mutate("draft")}
            loading={createChallan.isPending}
            disabled={!canSubmit}
          >
            {isEditing ? "Save Changes" : "Save Draft"}
          </Button>
          <Button
            icon={<Send className="h-4 w-4" />}
            onClick={() => createChallan.mutate("sent")}
            loading={createChallan.isPending}
            disabled={!canSubmit}
          >
            {isEditing ? "Save & Send" : "Send Challan"}
          </Button>
        </div>
      </div>

      {createChallan.isError && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg text-sm">
          {createChallan.error?.message ||
            (isEditing
              ? "Failed to update delivery challan"
              : "Failed to create delivery challan")}
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
            label="Place of Supply"
            options={INDIAN_STATES}
            value={placeOfSupply}
            onChange={setPlaceOfSupply}
            searchable
            placeholder="Select state"
          />
          <Input
            label="Challan Date"
            type="date"
            value={challanDate}
            onChange={(e) => setChallanDate(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Delivery Address</label>
            <textarea
              rows={2}
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              placeholder="Enter delivery address..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </Card>

      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <CardHeader className="!mb-0">
            <CardTitle>Items</CardTitle>
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
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
                  Qty
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
                  Unit
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
                        placeholder="Product or item name"
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
                      type="text"
                      value={item.unit}
                      onChange={(e) =>
                        updateItem(item.id, "unit", e.target.value)
                      }
                      placeholder="pcs"
                      className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
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

      {/* Notes & Signature + Payment & Charges */}
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

        <div className="space-y-6">
          {/* Payment Details */}
          <Card padding="md">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Payment Details</h3>
              <div className="grid grid-cols-1 gap-4">
                <Select
                  label="Payment Mode"
                  options={[
                    { value: "cash", label: "Cash" },
                    { value: "bank_transfer", label: "Bank Transfer" },
                    { value: "upi", label: "UPI" },
                    { value: "cheque", label: "Cheque" },
                  ]}
                  value={paymentMode}
                  onChange={setPaymentMode}
                  placeholder="Select payment mode"
                />
                <Input
                  label="Reference Number"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="Transaction ID, cheque no., etc."
                />
                <Input
                  label="Amount"
                  type="number"
                  value={paymentAmount || ""}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </Card>

          {/* Discount & Additional Charges */}
          <Card padding="md">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Discount & Additional Charges</h3>
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
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
