"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";

const GST_RATE_OPTIONS = [
  { value: "0", label: "0% (Exempt)" },
  { value: "0.25", label: "0.25%" },
  { value: "3", label: "3%" },
  { value: "5", label: "5%" },
  { value: "12", label: "12%" },
  { value: "18", label: "18%" },
  { value: "28", label: "28%" },
];

const UNIT_OPTIONS = [
  { value: "pcs", label: "Pieces (pcs)" },
  { value: "nos", label: "Numbers (nos)" },
  { value: "kg", label: "Kilograms (kg)" },
  { value: "gm", label: "Grams (gm)" },
  { value: "ltr", label: "Litres (ltr)" },
  { value: "ml", label: "Millilitres (ml)" },
  { value: "mtr", label: "Metres (mtr)" },
  { value: "sqm", label: "Square Metres (sqm)" },
  { value: "box", label: "Box" },
  { value: "set", label: "Set" },
  { value: "pair", label: "Pair" },
  { value: "ream", label: "Ream" },
  { value: "roll", label: "Roll" },
  { value: "dozen", label: "Dozen" },
];

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    type: "goods",
    hsn_code: "",
    unit: "pcs",
    purchase_price: "",
    selling_price: "",
    tax_rate: "18",
    track_inventory: true,
    reorder_level: "",
  });

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: Replace with actual API call
      // await api.post('/stock/products', {
      //   ...form,
      //   purchase_price: form.purchase_price ? Number(form.purchase_price) : undefined,
      //   selling_price: form.selling_price ? Number(form.selling_price) : undefined,
      //   tax_rate: form.tax_rate ? Number(form.tax_rate) : undefined,
      //   reorder_level: form.reorder_level ? Number(form.reorder_level) : undefined,
      // });
      console.log("Creating product:", form);
      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push("/stock/products");
    } catch (error) {
      console.error("Failed to create product:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/stock/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Product</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create a new product or service
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Product Type"
                value={form.type}
                onChange={(value) => updateField("type", value)}
                options={[
                  { value: "goods", label: "Goods" },
                  { value: "services", label: "Services" },
                ]}
              />
              <Input
                label="SKU (Optional)"
                value={form.sku}
                onChange={(e) => updateField("sku", e.target.value)}
                placeholder="e.g., PAP-A4-500"
              />
            </div>

            <Input
              label="Product Name"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="e.g., A4 Printing Paper (Ream)"
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description (Optional)
              </label>
              <textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Product description..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </Card>

        {/* Tax & Classification */}
        <Card>
          <CardHeader>
            <CardTitle>Tax & Classification</CardTitle>
          </CardHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label={form.type === "goods" ? "HSN Code" : "SAC Code"}
                value={form.hsn_code}
                onChange={(e) => updateField("hsn_code", e.target.value)}
                placeholder={form.type === "goods" ? "e.g., 4802" : "e.g., 998314"}
                hint={
                  form.type === "goods"
                    ? "Harmonized System Nomenclature"
                    : "Services Accounting Code"
                }
              />
              <Select
                label="Unit of Measurement"
                value={form.unit}
                onChange={(value) => updateField("unit", value)}
                options={UNIT_OPTIONS}
                searchable
              />
              <Select
                label="GST Rate"
                value={form.tax_rate}
                onChange={(value) => updateField("tax_rate", value)}
                options={GST_RATE_OPTIONS}
              />
            </div>
          </div>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Purchase Price"
              type="number"
              value={form.purchase_price}
              onChange={(e) => updateField("purchase_price", e.target.value)}
              placeholder="0.00"
              hint="Cost price per unit"
            />
            <Input
              label="Selling Price"
              type="number"
              value={form.selling_price}
              onChange={(e) => updateField("selling_price", e.target.value)}
              placeholder="0.00"
              hint="Sale price per unit"
            />
          </div>
        </Card>

        {/* Inventory Settings (only for goods) */}
        {form.type === "goods" && (
          <Card>
            <CardHeader>
              <CardTitle>Inventory Settings</CardTitle>
            </CardHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="track_inventory"
                  checked={form.track_inventory}
                  onChange={(e) =>
                    updateField("track_inventory", e.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label
                  htmlFor="track_inventory"
                  className="text-sm text-gray-700"
                >
                  Track inventory for this product
                </label>
              </div>

              {form.track_inventory && (
                <div className="max-w-xs">
                  <Input
                    label="Reorder Level"
                    type="number"
                    value={form.reorder_level}
                    onChange={(e) =>
                      updateField("reorder_level", e.target.value)
                    }
                    placeholder="e.g., 50"
                    hint="Alert when stock falls below this quantity"
                  />
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/stock/products">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            loading={loading}
            icon={<Save className="h-4 w-4" />}
          >
            Save Product
          </Button>
        </div>
      </form>
    </div>
  );
}
