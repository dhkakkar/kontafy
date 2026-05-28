"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { ArrowLeft, Save, Plus } from "lucide-react";
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

// Sentinel value used to detect the "+ Add New Unit" sentinel option
// in the unit dropdown. Picked specifically so it can never collide
// with a real unit UUID.
const ADD_NEW_UNIT_SENTINEL = "__add_new_unit__";

interface Unit {
  id: string;
  name: string;
  symbol: string;
  uqc_code: string;
  category: string;
  decimals: number;
  is_active: boolean;
}

// Categories preferred per product-type. When the user flips
// Goods↔Services we re-pick a sensible default unit so the dropdown
// doesn't show "Pieces" for a service line item.
const SERVICE_CATEGORIES = new Set(["service", "digital"]);
const GOODS_CATEGORIES = new Set(["count", "weight", "volume", "length"]);

export default function NewProductPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    type: "goods",
    hsn_code: "",
    unit_id: "",
    purchase_price: "",
    selling_price: "",
    price_includes_gst: true,
    tax_rate: "18",
    track_inventory: true,
    reorder_level: "",
  });

  const updateField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // Quick-Add Unit modal state. Opens from the dropdown's last
  // sentinel option so the user never leaves the product form.
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [addUnitName, setAddUnitName] = useState("");
  const [addUnitSymbol, setAddUnitSymbol] = useState("");
  const [addUnitUqc, setAddUnitUqc] = useState("OTH-OTHERS");
  const [addUnitCategory, setAddUnitCategory] = useState<string>("service");
  const [addUnitDecimals, setAddUnitDecimals] = useState("0");
  const [addUnitError, setAddUnitError] = useState("");

  const { data: units = [] } = useQuery<Unit[]>({
    queryKey: ["units"],
    queryFn: async () => {
      const res = await api.get<{ data: Unit[] }>("/settings/units");
      return res.data;
    },
  });

  const { data: uqcCodes = [] } = useQuery<{ code: string; label: string }[]>({
    queryKey: ["units", "uqc-codes"],
    queryFn: async () => {
      const res = await api.get<{ data: { code: string; label: string }[] }>(
        "/settings/units/uqc-codes",
      );
      return res.data;
    },
    staleTime: 24 * 60 * 60 * 1000,
  });

  // Filter the unit dropdown by product type so a Service line item
  // doesn't default to "Pieces". The "+ Add New Unit" sentinel is
  // appended last so the user always has an inline escape hatch.
  const unitOptions = useMemo(() => {
    const isServiceMode = form.type === "services";
    const matching = units
      .filter((u) => u.is_active)
      .filter((u) =>
        isServiceMode
          ? SERVICE_CATEGORIES.has(u.category)
          : GOODS_CATEGORIES.has(u.category),
      );
    const rest = units
      .filter((u) => u.is_active)
      .filter(
        (u) =>
          !(isServiceMode
            ? SERVICE_CATEGORIES.has(u.category)
            : GOODS_CATEGORIES.has(u.category)),
      );

    return [
      ...matching.map((u) => ({
        value: u.id,
        label: `${u.name} (${u.symbol})`,
      })),
      ...rest.map((u) => ({
        value: u.id,
        label: `${u.name} (${u.symbol})`,
      })),
      { value: ADD_NEW_UNIT_SENTINEL, label: "+ Add New Unit…" },
    ];
  }, [units, form.type]);

  // Auto-pick a category-appropriate default unit when type flips or
  // when units load. Skip if the user has already selected a unit.
  useEffect(() => {
    if (form.unit_id) return;
    if (units.length === 0) return;
    const isServiceMode = form.type === "services";
    const preferredSymbol = isServiceMode ? "HR" : "PCS";
    const preferred =
      units.find((u) => u.symbol === preferredSymbol && u.is_active) ||
      units.find((u) =>
        isServiceMode
          ? SERVICE_CATEGORIES.has(u.category)
          : GOODS_CATEGORIES.has(u.category),
      );
    if (preferred) setForm((prev) => ({ ...prev, unit_id: preferred.id }));
  }, [units, form.type, form.unit_id]);

  // When the user flips Goods↔Services, re-pick the unit if the
  // current one no longer fits the type's preferred categories.
  useEffect(() => {
    if (!form.unit_id) return;
    const current = units.find((u) => u.id === form.unit_id);
    if (!current) return;
    const isServiceMode = form.type === "services";
    const fits = isServiceMode
      ? SERVICE_CATEGORIES.has(current.category)
      : GOODS_CATEGORIES.has(current.category);
    if (!fits) {
      const preferred = units.find((u) =>
        isServiceMode
          ? SERVICE_CATEGORIES.has(u.category)
          : GOODS_CATEGORIES.has(u.category),
      );
      if (preferred) setForm((prev) => ({ ...prev, unit_id: preferred.id }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.type]);

  const handleUnitChange = (value: string) => {
    if (value === ADD_NEW_UNIT_SENTINEL) {
      // Reset the modal fields to sensible defaults per current
      // product type — Service mode pre-fills OTH-OTHERS / service
      // category, Goods mode pre-fills count.
      const isServiceMode = form.type === "services";
      setAddUnitName("");
      setAddUnitSymbol("");
      setAddUnitUqc(isServiceMode ? "OTH-OTHERS" : "PCS-PIECES");
      setAddUnitCategory(isServiceMode ? "service" : "count");
      setAddUnitDecimals(isServiceMode ? "2" : "0");
      setAddUnitError("");
      setShowAddUnit(true);
      return;
    }
    updateField("unit_id", value);
  };

  const addUnitMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: Unit }>("/settings/units", {
        name: addUnitName.trim(),
        symbol: addUnitSymbol.trim().toUpperCase(),
        uqc_code: addUnitUqc,
        category: addUnitCategory,
        decimals: Number(addUnitDecimals) || 0,
      });
      return res.data;
    },
    onSuccess: (newUnit) => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      // Pre-select the newly created unit so the user doesn't have
      // to reopen the dropdown.
      setForm((prev) => ({ ...prev, unit_id: newUnit.id }));
      setShowAddUnit(false);
    },
    onError: (err: any) => {
      setAddUnitError(err?.message || "Failed to create unit");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      // Resolve unit symbol for the legacy `unit` field — keeps old
      // reports working and lets the backend mirror unit_id → symbol.
      const selectedUnit = units.find((u) => u.id === form.unit_id);
      await api.post<{ success: boolean; data: { id: string } }>("/stock/products", {
        name: form.name,
        sku: form.sku || undefined,
        description: form.description || undefined,
        type: form.type,
        hsn_code: form.hsn_code || undefined,
        unit: selectedUnit?.symbol || "PCS",
        unit_id: form.unit_id || undefined,
        purchase_price: form.purchase_price ? Number(form.purchase_price) : undefined,
        selling_price: form.selling_price ? Number(form.selling_price) : undefined,
        price_includes_gst: form.price_includes_gst,
        tax_rate: form.tax_rate ? Number(form.tax_rate) : undefined,
        track_inventory: form.type === "services" ? false : form.track_inventory,
        reorder_level: form.reorder_level ? Number(form.reorder_level) : undefined,
      });

      router.push("/stock/products");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create product";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const isService = form.type === "services";

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
          <h1 className="text-2xl font-bold text-gray-900">
            Add {isService ? "Service" : "Product"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isService
              ? "Service offering — uses SAC code, no inventory tracking"
              : "Create a new product or service"}
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
              <div>
                <Select
                  label="Product Type"
                  value={form.type}
                  onChange={(value) => updateField("type", value)}
                  options={[
                    { value: "goods", label: "Goods" },
                    { value: "services", label: "Services" },
                  ]}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {isService
                    ? "Uses SAC code; inventory tracking disabled."
                    : "Uses HSN code; inventory tracking available."}
                </p>
              </div>
              <Input
                label="SKU (Optional)"
                value={form.sku}
                onChange={(e) => updateField("sku", e.target.value)}
                placeholder={isService ? "e.g., SRV-DEV-01" : "e.g., PAP-A4-500"}
              />
            </div>

            <Input
              label={isService ? "Service Name" : "Product Name"}
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder={
                isService
                  ? "e.g., Custom Web Development"
                  : "e.g., A4 Printing Paper (Ream)"
              }
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description (Optional)
              </label>
              <textarea
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder={
                  isService ? "Service scope..." : "Product description..."
                }
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
                label={isService ? "SAC Code" : "HSN Code"}
                value={form.hsn_code}
                onChange={(e) => updateField("hsn_code", e.target.value)}
                placeholder={isService ? "e.g., 998314" : "e.g., 4802"}
                hint={
                  isService
                    ? "Services Accounting Code (6-digit)"
                    : "Harmonized System Nomenclature (4-8 digit)"
                }
              />
              <Select
                label="Unit of Measurement"
                value={form.unit_id}
                onChange={handleUnitChange}
                options={unitOptions}
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
                label={isService ? "Cost (Optional)" : "Purchase Price"}
                type="number"
                value={form.purchase_price}
                onChange={(e) => updateField("purchase_price", e.target.value)}
                placeholder="0.00"
                hint={
                  form.price_includes_gst
                    ? "Cost per unit (includes GST)"
                    : "Cost per unit (excludes GST)"
                }
              />
              <Input
                label={isService ? "Service Rate" : "Selling Price"}
                type="number"
                value={form.selling_price}
                onChange={(e) => updateField("selling_price", e.target.value)}
                placeholder="0.00"
                hint={
                  form.price_includes_gst
                    ? "Sale rate per unit (includes GST)"
                    : "Sale rate per unit (excludes GST)"
                }
              />
            </div>
          </div>
        </Card>

        {/* Inventory Settings — hidden for Services */}
        {!isService && (
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
            disabled={loading}
            icon={<Save className="h-4 w-4" />}
          >
            Save {isService ? "Service" : "Product"}
          </Button>
        </div>
      </form>

      {/* Inline Quick-Add Unit modal */}
      <Modal
        open={showAddUnit}
        onClose={() => setShowAddUnit(false)}
        title="Add New Unit"
        description="Adds a unit to your master list. UQC code is required for GST."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Unit Name *"
              value={addUnitName}
              onChange={(e) => setAddUnitName(e.target.value)}
              placeholder="e.g. Sprint"
            />
            <Input
              label="Symbol *"
              value={addUnitSymbol}
              onChange={(e) =>
                setAddUnitSymbol(e.target.value.toUpperCase().slice(0, 10))
              }
              placeholder="e.g. SPR"
            />
          </div>
          <Select
            label="GST UQC Code *"
            value={addUnitUqc}
            onChange={setAddUnitUqc}
            options={uqcCodes.map((u) => ({
              value: u.code,
              label: u.label,
            }))}
            searchable
          />
          <p className="text-xs text-gray-500 -mt-2">
            Service units use{" "}
            <span className="font-mono">OTH-OTHERS</span>.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Category"
              value={addUnitCategory}
              onChange={setAddUnitCategory}
              options={[
                { value: "count", label: "Count / Quantity" },
                { value: "weight", label: "Weight" },
                { value: "volume", label: "Volume" },
                { value: "length", label: "Length / Area" },
                { value: "service", label: "Service / Time" },
                { value: "digital", label: "Digital / IT" },
              ]}
            />
            <Input
              label="Decimals Allowed"
              type="number"
              min={0}
              max={6}
              value={addUnitDecimals}
              onChange={(e) => setAddUnitDecimals(e.target.value)}
              hint="e.g. 2 for 1.5 hours"
            />
          </div>
          {addUnitError && (
            <div className="bg-danger-50 border border-danger-200 text-danger-700 px-3 py-2 rounded text-sm">
              {addUnitError}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={() => setShowAddUnit(false)}>
            Cancel
          </Button>
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => addUnitMutation.mutate()}
            loading={addUnitMutation.isPending}
            disabled={
              addUnitMutation.isPending ||
              !addUnitName.trim() ||
              !addUnitSymbol.trim()
            }
          >
            Add Unit
          </Button>
        </div>
      </Modal>
    </div>
  );
}
