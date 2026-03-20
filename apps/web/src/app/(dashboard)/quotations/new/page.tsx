"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { useCreateQuotation } from "@/hooks/use-quotations";
import { api } from "@/lib/api";
import { ArrowLeft, Plus, Trash2, Save, Send } from "lucide-react";

interface LineItem {
  id: string;
  product_id: string;
  productName: string;
  description: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  discount: number;
  taxRate: number;
  amount: number;
}

interface Product {
  id: string;
  name: string;
  hsn_code?: string;
  selling_price?: number;
  tax_rate?: number;
}

interface ContactOption {
  id: string;
  name: string;
  gstin?: string;
  state?: string | null;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

const taxOptions = [
  { value: "0", label: "No Tax (0%)" },
  { value: "5", label: "GST 5%" },
  { value: "12", label: "GST 12%" },
  { value: "18", label: "GST 18%" },
  { value: "28", label: "GST 28%" },
];

const INDIAN_STATES = [
  { value: "AN", label: "Andaman & Nicobar Islands" },
  { value: "AP", label: "Andhra Pradesh" },
  { value: "AR", label: "Arunachal Pradesh" },
  { value: "AS", label: "Assam" },
  { value: "BR", label: "Bihar" },
  { value: "CH", label: "Chandigarh" },
  { value: "CT", label: "Chhattisgarh" },
  { value: "DN", label: "Dadra & Nagar Haveli and Daman & Diu" },
  { value: "DL", label: "Delhi" },
  { value: "GA", label: "Goa" },
  { value: "GJ", label: "Gujarat" },
  { value: "HR", label: "Haryana" },
  { value: "HP", label: "Himachal Pradesh" },
  { value: "JK", label: "Jammu & Kashmir" },
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
  { value: "PB", label: "Punjab" },
  { value: "PY", label: "Puducherry" },
  { value: "RJ", label: "Rajasthan" },
  { value: "SK", label: "Sikkim" },
  { value: "TN", label: "Tamil Nadu" },
  { value: "TS", label: "Telangana" },
  { value: "TR", label: "Tripura" },
  { value: "UP", label: "Uttar Pradesh" },
  { value: "UK", label: "Uttarakhand" },
  { value: "WB", label: "West Bengal" },
];

export default function NewQuotationPage() {
  const router = useRouter();
  const createMutation = useCreateQuotation();

  const { data: customers = [] } = useQuery<ContactOption[]>({
    queryKey: ["contacts-customers"],
    queryFn: async () => {
      const res = await api.get<{ data: ContactOption[] }>("/bill/contacts", { type: "customer" });
      return res.data;
    },
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products-list"],
    queryFn: async () => {
      const res = await api.get<{ data: Product[] }>("/stock/products");
      return res.data;
    },
  });

  const customerOptions = customers.map((c) => ({
    value: c.id,
    label: c.name,
    description: c.gstin ? `GSTIN: ${c.gstin}` : undefined,
  }));

  const productOptions = products.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  const [customer, setCustomer] = useState("");
  const [quotationDate, setQuotationDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [validityDate, setValidityDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0];
  });
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const validityManuallySet = useRef(false);

  // Auto-fill terms & notes from invoice settings
  useEffect(() => {
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
  }, []);

  // Auto-set Valid Until to 15 days after Quotation Date
  useEffect(() => {
    if (validityManuallySet.current) return;
    if (!quotationDate) return;
    const d = new Date(quotationDate);
    if (isNaN(d.getTime())) return;
    d.setDate(d.getDate() + 15);
    setValidityDate(d.toISOString().split("T")[0]);
  }, [quotationDate]);

  // Auto-fill Place of Supply from selected customer's state
  useEffect(() => {
    if (!customer) return;
    const selected = customers.find((c) => c.id === customer);
    if (selected?.state) {
      setPlaceOfSupply(selected.state);
    }
  }, [customer, customers]);

  const [items, setItems] = useState<LineItem[]>([
    {
      id: generateId(),
      product_id: "",
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

  const addItem = () => {
    setItems([
      ...items,
      {
        id: generateId(),
        product_id: "",
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

  const selectProduct = (itemId: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setItems(
      items.map((item) => {
        if (item.id !== itemId) return item;
        const rate = product.selling_price ?? 0;
        const qty = item.quantity || 1;
        const disc = item.discount || 0;
        const amount = qty * rate * (1 - disc / 100);
        return {
          ...item,
          product_id: productId,
          productName: product.name,
          hsnCode: product.hsn_code || "",
          rate,
          taxRate: product.tax_rate ?? 18,
          amount,
        };
      })
    );
  };

  const updateItem = (id: string, field: keyof LineItem, value: string | number) => {
    setItems(
      items.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        updated.amount = updated.quantity * updated.rate * (1 - updated.discount / 100);
        return updated;
      })
    );
  };

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const totalDiscount = items.reduce(
    (sum, item) => sum + item.quantity * item.rate * (item.discount / 100),
    0
  );
  const totalTax = items.reduce(
    (sum, item) => sum + (item.amount * item.taxRate) / 100,
    0
  );
  const grandTotal = subtotal + totalTax;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      await createMutation.mutateAsync({
        contact_id: customer,
        date: quotationDate,
        validity_date: validityDate || undefined,
        place_of_supply: placeOfSupply || undefined,
        notes: notes || undefined,
        terms: terms || undefined,
        items: items.map((item) => ({
          product_id: item.product_id || undefined,
          description: item.productName || item.description,
          hsn_code: item.hsnCode || undefined,
          quantity: item.quantity,
          rate: item.rate,
          discount_pct: item.discount || undefined,
          cgst_rate: item.taxRate / 2,
          sgst_rate: item.taxRate / 2,
        })),
      });
      router.push("/quotations");
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Quotation</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Create a new sales quotation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" icon={<Save className="h-4 w-4" />} onClick={() => handleSubmit()}>
            Save Draft
          </Button>
          <Button icon={<Send className="h-4 w-4" />} onClick={() => handleSubmit()} loading={createMutation.isPending}>
            Save & Send
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card padding="md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Customer *"
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
              label="Quotation Date"
              type="date"
              value={quotationDate}
              onChange={(e) => setQuotationDate(e.target.value)}
            />
            <Input
              label="Valid Until"
              type="date"
              value={validityDate}
              onChange={(e) => {
                validityManuallySet.current = true;
                setValidityDate(e.target.value);
              }}
            />
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
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-[180px]">
                    Product
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                    Item Name
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-[90px]">
                    HSN/SAC
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-[70px]">
                    Qty
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
                    Rate
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-[80px]">
                    Disc %
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-[110px]">
                    Tax
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
                    Amount
                  </th>
                  <th className="w-[40px]" />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="py-2 px-4">
                      <Select
                        options={productOptions}
                        value={item.product_id}
                        onChange={(val) => selectProduct(item.id, val)}
                        searchable
                        placeholder="Select"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => updateItem(item.id, "productName", e.target.value)}
                        placeholder="Product or service name"
                        className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="text"
                        value={item.hsnCode}
                        onChange={(e) => updateItem(item.id, "hsnCode", e.target.value)}
                        placeholder="Code"
                        className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        value={item.quantity || ""}
                        onChange={(e) => updateItem(item.id, "quantity", parseFloat(e.target.value) || 0)}
                        min="0"
                        className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        value={item.rate || ""}
                        onChange={(e) => updateItem(item.id, "rate", parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </td>
                    <td className="py-2 px-4">
                      <input
                        type="number"
                        value={item.discount || ""}
                        onChange={(e) => updateItem(item.id, "discount", parseFloat(e.target.value) || 0)}
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
                        onChange={(val) => updateItem(item.id, "taxRate", parseInt(val))}
                      />
                    </td>
                    <td className="py-2 px-4 text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(item.amount)}
                      </span>
                    </td>
                    <td className="py-2 px-2">
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
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Tax</span>
                <span className="text-gray-700">
                  {formatCurrency(totalTax)}
                </span>
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
      </form>
    </div>
  );
}
