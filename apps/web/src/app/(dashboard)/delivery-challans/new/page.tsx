"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Save, Send } from "lucide-react";
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

export default function NewDeliveryChallanPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [customer, setCustomer] = useState("");
  const [challanDate, setChallanDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");

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
      return api.post("/bill/delivery-challans", {
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
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-challans"] });
      router.push("/delivery-challans");
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
            <h1 className="text-2xl font-bold text-gray-900">New Delivery Challan</h1>
            <p className="text-sm text-gray-500 mt-0.5">Create a new delivery challan</p>
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
            Save Draft
          </Button>
          <Button
            icon={<Send className="h-4 w-4" />}
            onClick={() => createChallan.mutate("sent")}
            loading={createChallan.isPending}
            disabled={!canSubmit}
          >
            Send Challan
          </Button>
        </div>
      </div>

      {createChallan.isError && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg text-sm">
          {createChallan.error?.message || "Failed to create delivery challan"}
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

      <Card padding="md">
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
      </Card>
    </div>
  );
}
