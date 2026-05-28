"use client";

import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Lock,
  Search,
} from "lucide-react";

interface Unit {
  id: string;
  name: string;
  symbol: string;
  uqc_code: string;
  category: string;
  decimals: number;
  is_system: boolean;
  is_active: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  count: "Count / Quantity",
  weight: "Weight",
  volume: "Volume",
  length: "Length / Area",
  service: "Service / Time",
  digital: "Digital / IT",
};

const CATEGORY_ORDER = ["count", "weight", "volume", "length", "service", "digital"];

const CATEGORY_OPTIONS = CATEGORY_ORDER.map((c) => ({
  value: c,
  label: CATEGORY_LABELS[c],
}));

export default function UnitsSettingsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Form fields
  const [formName, setFormName] = useState("");
  const [formSymbol, setFormSymbol] = useState("");
  const [formUqc, setFormUqc] = useState("OTH-OTHERS");
  const [formCategory, setFormCategory] = useState("service");
  const [formDecimals, setFormDecimals] = useState("0");
  const [formError, setFormError] = useState("");

  const { data: units = [], isLoading } = useQuery<Unit[]>({
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

  const uqcOptions = useMemo(
    () => uqcCodes.map((u) => ({ value: u.code, label: u.label })),
    [uqcCodes],
  );

  const filteredUnits = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? units.filter(
          (u) =>
            u.name.toLowerCase().includes(q) ||
            u.symbol.toLowerCase().includes(q) ||
            u.uqc_code.toLowerCase().includes(q),
        )
      : units;
  }, [units, search]);

  const grouped = useMemo(() => {
    const map: Record<string, Unit[]> = {};
    filteredUnits.forEach((u) => {
      (map[u.category] = map[u.category] || []).push(u);
    });
    return CATEGORY_ORDER.filter((c) => (map[c] || []).length > 0).map((c) => ({
      category: c,
      units: map[c],
    }));
  }, [filteredUnits]);

  const resetForm = () => {
    setFormName("");
    setFormSymbol("");
    setFormUqc("OTH-OTHERS");
    setFormCategory("service");
    setFormDecimals("0");
    setFormError("");
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (u: Unit) => {
    setEditingId(u.id);
    setFormName(u.name);
    setFormSymbol(u.symbol);
    setFormUqc(u.uqc_code);
    setFormCategory(u.category);
    setFormDecimals(String(u.decimals));
    setFormError("");
    setShowModal(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formName.trim(),
        symbol: formSymbol.trim().toUpperCase(),
        uqc_code: formUqc,
        category: formCategory,
        decimals: Number(formDecimals) || 0,
      };
      if (editingId) {
        return api.patch(`/settings/units/${editingId}`, payload);
      }
      return api.post("/settings/units", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
      setShowModal(false);
      resetForm();
    },
    onError: (err: any) => {
      setFormError(err?.message || "Failed to save unit");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) =>
      api.delete(`/settings/units/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (id: string) =>
      api.patch(`/settings/units/${id}`, { is_active: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["units"] });
    },
  });

  const handleSubmit = () => {
    if (saveMutation.isPending) return;
    setFormError("");
    if (!formName.trim()) return setFormError("Name is required");
    if (!formSymbol.trim()) return setFormError("Symbol is required");
    if (!formUqc) return setFormError("UQC code is required");
    saveMutation.mutate();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Units of Measurement</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Master list of units used on products / invoices. Every
                unit maps to a GST UQC code — required for GSTR-1 HSN
                summary.
              </p>
            </div>
            <Button
              icon={<Plus className="h-4 w-4" />}
              onClick={openCreate}
            >
              Add Unit
            </Button>
          </div>
        </CardHeader>

        <div className="mb-4">
          <Input
            placeholder="Search by name, symbol or UQC code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="max-w-sm"
          />
        </div>

        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-sm">
            No units match your search.
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ category, units: rows }) => (
              <div key={category}>
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                  {CATEGORY_LABELS[category] || category}
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs font-medium text-gray-600 uppercase">
                      <tr>
                        <th className="px-3 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Symbol</th>
                        <th className="px-3 py-2 text-left">UQC Code</th>
                        <th className="px-3 py-2 text-left">Decimals</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900">
                            <span className="inline-flex items-center gap-1.5">
                              {u.is_system && (
                                <Lock
                                  className="h-3 w-3 text-gray-400"
                                  aria-label="System unit"
                                />
                              )}
                              {u.name}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-gray-700">{u.symbol}</td>
                          <td className="px-3 py-2 text-gray-600 font-mono text-xs">
                            {u.uqc_code}
                          </td>
                          <td className="px-3 py-2 text-gray-600">{u.decimals}</td>
                          <td className="px-3 py-2">
                            {u.is_active ? (
                              <Badge variant="success">Active</Badge>
                            ) : (
                              <Badge variant="default">Inactive</Badge>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => openEdit(u)}
                                className="h-7 w-7 rounded flex items-center justify-center text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              {u.is_active ? (
                                <button
                                  onClick={() => {
                                    if (
                                      confirm(
                                        `Deactivate "${u.name}"? Existing products that use it keep working but it won't appear in dropdowns.`,
                                      )
                                    ) {
                                      deactivateMutation.mutate(u.id);
                                    }
                                  }}
                                  className="h-7 w-7 rounded flex items-center justify-center text-gray-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                                  title="Deactivate"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => reactivateMutation.mutate(u.id)}
                                  className="h-7 px-2 text-xs rounded text-primary-600 hover:bg-primary-50 transition-colors"
                                  title="Reactivate"
                                >
                                  Reactivate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingId ? "Edit Unit" : "Add Unit"}
        description="Defines a measurement unit used on products and invoices. UQC code is required for GST."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Unit Name *"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Per Page"
            />
            <Input
              label="Symbol *"
              value={formSymbol}
              onChange={(e) =>
                setFormSymbol(e.target.value.toUpperCase().slice(0, 10))
              }
              placeholder="e.g. PG"
              hint="Short code (auto-uppercased)"
            />
          </div>
          <Select
            label="GST UQC Code *"
            value={formUqc}
            onChange={setFormUqc}
            options={uqcOptions}
            searchable
          />
          <p className="text-xs text-gray-500 -mt-2">
            Service units use{" "}
            <span className="font-mono">OTH-OTHERS</span> — the
            GST-portal-accepted fallback.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Category"
              value={formCategory}
              onChange={setFormCategory}
              options={CATEGORY_OPTIONS}
            />
            <Input
              label="Decimals Allowed"
              type="number"
              min={0}
              max={6}
              value={formDecimals}
              onChange={(e) => setFormDecimals(e.target.value)}
              hint="e.g. 2 for 1.5 hours, 0 for whole units"
            />
          </div>

          {formError && (
            <div className="bg-danger-50 border border-danger-200 text-danger-700 px-3 py-2 rounded text-sm">
              {formError}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-6">
          <Button
            variant="outline"
            onClick={() => {
              setShowModal(false);
              resetForm();
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={saveMutation.isPending}
            disabled={saveMutation.isPending}
          >
            {editingId ? "Update Unit" : "Add Unit"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
