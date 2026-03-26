"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

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

interface Product {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  type: "goods" | "services";
  hsn_code: string | null;
  unit: string;
  purchase_price: number | null;
  selling_price: number | null;
  price_includes_gst: boolean;
  tax_rate: number | null;
  track_inventory: boolean;
  reorder_level: number | null;
  is_active: boolean;
}

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    type: "goods",
    hsn_code: "",
    unit: "pcs",
    purchase_price: "",
    selling_price: "",
    price_includes_gst: true,
    tax_rate: "18",
    track_inventory: true,
    reorder_level: "",
    is_active: true,
  });

  const {
    data: product,
    isLoading: productLoading,
    error: fetchError,
  } = useQuery<Product>({
    queryKey: ["product", productId],
    queryFn: async () => {
      const res = await api.get<{ data: Product }>("/stock/products/" + productId);
      return res.data;
    },
  });

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || "",
        sku: product.sku || "",
        description: product.description || "",
        type: product.type || "goods",
        hsn_code: product.hsn_code || "",
        unit: product.unit || "pcs",
        purchase_price: toStr(product.purchase_price),
        selling_price: toStr(product.selling_price),
        price_includes_gst: product.price_includes_gst ?? true,
        tax_rate: toStr(product.tax_rate || 18),
        track_inventory: product.track_inventory ?? true,
        reorder_level: toStr(product.reorder_level),
        is_active: product.is_active ?? true,
      });
    }
  }, [product]);

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await api.patch("/stock/products/" + productId, {
        name: form.name,
        sku: form.sku || undefined,
        description: form.description || undefined,
        type: form.type,
        hsn_code: form.hsn_code || undefined,
        unit: form.unit,
        purchase_price: form.purchase_price ? Number(form.purchase_price) : undefined,
        selling_price: form.selling_price ? Number(form.selling_price) : undefined,
        tax_rate: form.tax_rate ? Number(form.tax_rate) : undefined,
        track_inventory: form.track_inventory,
        reorder_level: form.reorder_level ? Number(form.reorder_level) : undefined,
        is_active: form.is_active,
      });

      router.push(`/stock/products/${productId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update product";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (productLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/stock/products/${productId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (fetchError || !product) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/stock/products">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Product not found</h1>
        </div>
        <Card>
          <div className="py-12 text-center text-gray-500">
            The product you are looking for does not exist or has been deleted.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/stock/products/${productId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
          <p className="text-sm text-gray-500 mt-1">
            Update {product.name}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => updateField("is_active", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="is_active" className="text-sm text-gray-700">
                Product is active
              </label>
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

          <div className="space-y-4">
            <div className="max-w-xs">
              <Select
                label="Price Type"
                value={form.price_includes_gst ? "with_gst" : "without_gst"}
                onChange={(value) =>
                  updateField("price_includes_gst", value === "with_gst")
                }
                options={[
                  { value: "with_gst", label: "With GST (Inclusive)" },
                  { value: "without_gst", label: "Without GST (Exclusive)" },
                ]}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Purchase Price"
                type="number"
                value={form.purchase_price}
                onChange={(e) => updateField("purchase_price", e.target.value)}
                placeholder="0.00"
                hint={
                  form.price_includes_gst
                    ? "Cost price per unit (includes GST)"
                    : "Cost price per unit (excludes GST)"
                }
              />
              <Input
                label="Selling Price"
                type="number"
                value={form.selling_price}
                onChange={(e) => updateField("selling_price", e.target.value)}
                placeholder="0.00"
                hint={
                  form.price_includes_gst
                    ? "Sale price per unit (includes GST)"
                    : "Sale price per unit (excludes GST)"
                }
              />
            </div>
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
          <Link href={`/stock/products/${productId}`}>
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            loading={loading}
            icon={<Save className="h-4 w-4" />}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
