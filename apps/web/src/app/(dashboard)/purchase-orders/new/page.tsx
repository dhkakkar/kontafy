"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { useCreatePurchaseOrder } from "@/hooks/use-purchase-orders";
import { ArrowLeft, Plus, Trash2, Save, Send } from "lucide-react";

interface LineItem {
  id: string;
  productName: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  taxRate: number;
  amount: number;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

const vendorOptions = [
  { value: "v1", label: "Skyline Properties" },
  { value: "v2", label: "Office Supplies Co." },
  { value: "v3", label: "CloudHost India" },
  { value: "v4", label: "RawMat Suppliers" },
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

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const createMutation = useCreatePurchaseOrder();

  const [vendor, setVendor] = useState("");
  const [orderDate, setOrderDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [deliveryDate, setDeliveryDate] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  // Shipping address
  const [shipLine1, setShipLine1] = useState("");
  const [shipCity, setShipCity] = useState("");
  const [shipState, setShipState] = useState("");
  const [shipPincode, setShipPincode] = useState("");

  const [items, setItems] = useState<LineItem[]>([
    {
      id: generateId(),
      productName: "",
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
        updated.amount = updated.quantity * updated.rate;
        return updated;
      })
    );
  };

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const totalTax = items.reduce(
    (sum, item) => sum + (item.amount * item.taxRate) / 100,
    0
  );
  const grandTotal = subtotal + totalTax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        contact_id: vendor,
        date: orderDate,
        delivery_date: deliveryDate || undefined,
        place_of_supply: placeOfSupply || undefined,
        shipping_address: shipLine1
          ? { line1: shipLine1, city: shipCity, state: shipState, pincode: shipPincode }
          : undefined,
        notes: notes || undefined,
        terms: terms || undefined,
        items: items.map((item) => ({
          description: item.productName,
          hsn_code: item.hsnCode || undefined,
          quantity: item.quantity,
          rate: item.rate,
          cgst_rate: item.taxRate / 2,
          sgst_rate: item.taxRate / 2,
        })),
      });
      router.push("/purchase-orders");
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
              New Purchase Order
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Create a new purchase order for a vendor
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            icon={<Save className="h-4 w-4" />}
            onClick={handleSubmit}
          >
            Save Draft
          </Button>
          <Button
            icon={<Send className="h-4 w-4" />}
            onClick={handleSubmit}
            loading={createMutation.isPending}
          >
            Save & Send
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card padding="md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Vendor *"
              options={vendorOptions}
              value={vendor}
              onChange={setVendor}
              searchable
              placeholder="Select a vendor"
            />
            <Select
              label="Place of Supply"
              options={[
                { value: "MH", label: "Maharashtra" },
                { value: "DL", label: "Delhi" },
                { value: "KA", label: "Karnataka" },
                { value: "GJ", label: "Gujarat" },
                { value: "TN", label: "Tamil Nadu" },
              ]}
              value={placeOfSupply}
              onChange={setPlaceOfSupply}
              searchable
              placeholder="Select state"
            />
            <Input
              label="Order Date"
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
            />
            <Input
              label="Expected Delivery Date"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
            />
          </div>
        </Card>

        {/* Shipping Address */}
        <Card padding="md">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Shipping Address
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Address"
                value={shipLine1}
                onChange={(e) => setShipLine1(e.target.value)}
                placeholder="Street address"
              />
            </div>
            <Input
              label="City"
              value={shipCity}
              onChange={(e) => setShipCity(e.target.value)}
              placeholder="City"
            />
            <Input
              label="State"
              value={shipState}
              onChange={(e) => setShipState(e.target.value)}
              placeholder="State"
            />
            <Input
              label="PIN Code"
              value={shipPincode}
              onChange={(e) => setShipPincode(e.target.value)}
              placeholder="400001"
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
                        onChange={(e) => updateItem(item.id, "productName", e.target.value)}
                        placeholder="Product or material"
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
            <div className="space-y-4">
              <Input
                label="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes..."
              />
              <Input
                label="Terms & Conditions"
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Payment terms, delivery terms, etc."
              />
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
