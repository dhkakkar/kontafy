"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import {
  ArrowLeft,
  Package,
  Edit3,
  Plus,
  Minus,
  Loader2,
  BarChart3,
  Users,
  Info,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────

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
  total_quantity: number;
  stock_value: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface StockLedgerEntry {
  id: string;
  date: string;
  type: string;
  reference: string | null;
  qty_in: number;
  qty_out: number;
  balance: number;
  notes: string | null;
}

interface PartyReport {
  party_id: string;
  party_name: string;
  party_type: string;
  total_qty: number;
  total_amount: number;
}

interface ApiResponse<T> {
  data: T;
}

// ─── Helpers ───────────────────────────────────────────────────

function toNum(v: any): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : Number(v);
}

// ─── Component ─────────────────────────────────────────────────

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("details");
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    type: "add",
    quantity: "",
    reason: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [adjustError, setAdjustError] = useState("");

  // ─── Queries ──────────────────────────────────────────────────

  const {
    data: product,
    isLoading,
    error,
  } = useQuery<Product>({
    queryKey: ["product", productId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Product>>(
        "/stock/products/" + productId
      );
      return res.data;
    },
  });

  const { data: stockLedger, isLoading: ledgerLoading } = useQuery<
    StockLedgerEntry[]
  >({
    queryKey: ["product-stock-ledger", productId],
    queryFn: async () => {
      try {
        const res = await api.get<ApiResponse<StockLedgerEntry[]>>(
          `/stock/products/${productId}/stock-ledger`
        );
        return res.data;
      } catch {
        return [];
      }
    },
    enabled: activeTab === "stock",
  });

  const { data: partyReport, isLoading: partyLoading } = useQuery<
    PartyReport[]
  >({
    queryKey: ["product-party-report", productId],
    queryFn: async () => {
      try {
        const res = await api.get<ApiResponse<PartyReport[]>>(
          `/stock/products/${productId}/party-report`
        );
        return res.data;
      } catch {
        return [];
      }
    },
    enabled: activeTab === "parties",
  });

  // ─── Adjust Stock Mutation ────────────────────────────────────

  const adjustMutation = useMutation({
    mutationFn: (data: {
      type: string;
      quantity: number;
      reason: string;
      date: string;
    }) => api.post(`/stock/products/${productId}/adjust-stock`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      queryClient.invalidateQueries({
        queryKey: ["product-stock-ledger", productId],
      });
      setAdjustModalOpen(false);
      setAdjustForm({
        type: "add",
        quantity: "",
        reason: "",
        date: new Date().toISOString().split("T")[0],
      });
      setAdjustError("");
    },
    onError: (err: Error) => {
      setAdjustError(err.message || "Failed to adjust stock");
    },
  });

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustForm.quantity || Number(adjustForm.quantity) <= 0) {
      setAdjustError("Please enter a valid quantity");
      return;
    }
    setAdjustError("");
    adjustMutation.mutate({
      type: adjustForm.type,
      quantity: Number(adjustForm.quantity),
      reason: adjustForm.reason,
      date: adjustForm.date,
    });
  };

  // ─── Tabs ─────────────────────────────────────────────────────

  const tabs = [
    { value: "details", label: "Product Details" },
    { value: "stock", label: "Stock Ledger" },
    { value: "parties", label: "Party-wise Report" },
  ];

  // ─── Loading ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/stock/products">
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

  // ─── Error ────────────────────────────────────────────────────

  if (error || !product) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/stock/products">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Product not found
          </h1>
        </div>
        <Card>
          <div className="py-12 text-center text-gray-500">
            The product you are looking for does not exist or has been deleted.
          </div>
        </Card>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Link href="/stock/products">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="h-12 w-12 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
          <Package className="h-6 w-6 text-primary-800" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            <Badge variant={product.type === "goods" ? "info" : "default"}>
              {product.type === "goods" ? "Goods" : "Services"}
            </Badge>
            {!product.is_active && <Badge variant="danger">Inactive</Badge>}
          </div>
          {product.sku && (
            <p className="text-sm text-gray-500 mt-0.5">SKU: {product.sku}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {product.type === "goods" && (
            <Button
              variant="outline"
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setAdjustModalOpen(true)}
            >
              Adjust Stock
            </Button>
          )}
          <Link href={`/stock/products/${productId}/edit`}>
            <Button
              variant="outline"
              size="sm"
              icon={<Edit3 className="h-4 w-4" />}
            >
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* ─── Summary Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Package className="h-5 w-5 text-primary-800" />}
          label="Current Stock"
          value={
            product.type === "goods"
              ? `${formatNumber(product.total_quantity)} ${product.unit}`
              : "N/A"
          }
          iconBg="bg-primary-50"
          highlight={
            product.type === "goods" &&
            product.reorder_level != null &&
            product.total_quantity <= product.reorder_level
          }
        />
        <SummaryCard
          icon={<BarChart3 className="h-5 w-5 text-success-700" />}
          label="Stock Value"
          value={
            product.type === "goods"
              ? formatCurrency(toNum(product.stock_value))
              : "N/A"
          }
          iconBg="bg-success-50"
        />
        <SummaryCard
          icon={<Minus className="h-5 w-5 text-warning-700" />}
          label="Purchase Price"
          value={
            product.purchase_price != null
              ? formatCurrency(toNum(product.purchase_price))
              : "-"
          }
          iconBg="bg-warning-50"
        />
        <SummaryCard
          icon={<Plus className="h-5 w-5 text-info-700" />}
          label="Selling Price"
          value={
            product.selling_price != null
              ? formatCurrency(toNum(product.selling_price))
              : "-"
          }
          iconBg="bg-primary-50"
        />
      </div>

      {/* ─── Tabs Content ────────────────────────────────────── */}
      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
        </div>

        {/* Product Details Tab */}
        {activeTab === "details" && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Basic Info */}
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-gray-900">
                  Basic Information
                </h3>
                <DetailRow label="Product Name" value={product.name} />
                <DetailRow label="SKU / Code" value={product.sku || "-"} />
                <DetailRow
                  label="Type"
                  value={product.type === "goods" ? "Goods" : "Services"}
                />
                <DetailRow
                  label={product.type === "goods" ? "HSN Code" : "SAC Code"}
                  value={product.hsn_code || "-"}
                />
                <DetailRow label="Unit" value={product.unit} />
                {product.description && (
                  <DetailRow label="Description" value={product.description} />
                )}
              </div>

              {/* Pricing & Tax */}
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-gray-900">
                  Pricing & Tax
                </h3>
                <DetailRow
                  label="Purchase Price"
                  value={
                    product.purchase_price != null
                      ? formatCurrency(toNum(product.purchase_price))
                      : "-"
                  }
                />
                <DetailRow
                  label="Selling Price"
                  value={
                    product.selling_price != null
                      ? formatCurrency(toNum(product.selling_price))
                      : "-"
                  }
                />
                <DetailRow
                  label="Price Includes GST"
                  value={product.price_includes_gst ? "Yes" : "No"}
                />
                <DetailRow
                  label="GST Rate"
                  value={
                    product.tax_rate != null ? `${product.tax_rate}%` : "-"
                  }
                />

                {product.type === "goods" && (
                  <>
                    <h3 className="text-sm font-semibold text-gray-900 pt-2">
                      Inventory
                    </h3>
                    <DetailRow
                      label="Track Inventory"
                      value={product.track_inventory ? "Yes" : "No"}
                    />
                    <DetailRow
                      label="Current Stock"
                      value={`${formatNumber(product.total_quantity)} ${product.unit}`}
                    />
                    <DetailRow
                      label="Stock Value"
                      value={formatCurrency(toNum(product.stock_value))}
                    />
                    {product.reorder_level != null && (
                      <DetailRow
                        label="Reorder Level"
                        value={`${formatNumber(product.reorder_level)} ${product.unit}`}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stock Ledger Tab */}
        {activeTab === "stock" && (
          <div>
            {ledgerLoading ? (
              <div className="py-12 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : !stockLedger || stockLedger.length === 0 ? (
              <div className="py-16 text-center">
                <BarChart3 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  No stock movements recorded yet.
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Stock ledger will appear here as transactions occur.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                        Reference
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                        Qty In
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                        Qty Out
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockLedger.map((entry) => (
                      <tr
                        key={entry.id}
                        className="border-b border-gray-50 hover:bg-gray-50/50"
                      >
                        <td className="py-3 px-4 text-gray-600">
                          {formatDate(entry.date)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              entry.type === "purchase"
                                ? "info"
                                : entry.type === "sale"
                                  ? "success"
                                  : "warning"
                            }
                          >
                            {entry.type.charAt(0).toUpperCase() +
                              entry.type.slice(1)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {entry.reference || "-"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {toNum(entry.qty_in) > 0 ? (
                            <span className="text-success-700 font-medium">
                              +{formatNumber(entry.qty_in)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {toNum(entry.qty_out) > 0 ? (
                            <span className="text-danger-600 font-medium">
                              -{formatNumber(entry.qty_out)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">
                          {formatNumber(entry.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Party-wise Report Tab */}
        {activeTab === "parties" && (
          <div>
            {partyLoading ? (
              <div className="py-12 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : !partyReport || partyReport.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  No party transactions recorded yet.
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  Party-wise report will appear here as invoices and purchases
                  are created.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                        Party Name
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                        Total Qty
                      </th>
                      <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                        Total Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {partyReport.map((party) => (
                      <tr
                        key={party.party_id}
                        className="border-b border-gray-50 hover:bg-gray-50/50"
                      >
                        <td className="py-3 px-4">
                          <Link
                            href={`/contacts/${party.party_id}`}
                            className="font-medium text-primary-800 hover:underline"
                          >
                            {party.party_name}
                          </Link>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              party.party_type === "customer"
                                ? "info"
                                : "warning"
                            }
                          >
                            {party.party_type === "customer"
                              ? "Customer"
                              : "Vendor"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-gray-900">
                          {formatNumber(party.total_qty)}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-900">
                          {formatCurrency(toNum(party.total_amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ─── Adjust Stock Modal ──────────────────────────────── */}
      <Modal
        open={adjustModalOpen}
        onClose={() => {
          setAdjustModalOpen(false);
          setAdjustError("");
        }}
        title="Adjust Stock"
        description={`Adjust stock quantity for ${product.name}`}
        size="sm"
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4">
          {adjustError && (
            <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg text-sm">
              {adjustError}
            </div>
          )}

          <Select
            label="Adjustment Type"
            value={adjustForm.type}
            onChange={(value) =>
              setAdjustForm((prev) => ({ ...prev, type: value }))
            }
            options={[
              { value: "add", label: "Add Stock" },
              { value: "remove", label: "Remove Stock" },
            ]}
          />

          <Input
            label="Quantity"
            type="number"
            value={adjustForm.quantity}
            onChange={(e) =>
              setAdjustForm((prev) => ({ ...prev, quantity: e.target.value }))
            }
            placeholder="Enter quantity"
            required
            min={1}
          />

          <Input
            label="Reason"
            value={adjustForm.reason}
            onChange={(e) =>
              setAdjustForm((prev) => ({ ...prev, reason: e.target.value }))
            }
            placeholder="e.g., Physical count correction"
          />

          <Input
            label="Date"
            type="date"
            value={adjustForm.date}
            onChange={(e) =>
              setAdjustForm((prev) => ({ ...prev, date: e.target.value }))
            }
            required
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setAdjustModalOpen(false);
                setAdjustError("");
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={adjustMutation.isPending}>
              Adjust Stock
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  iconBg,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  iconBg: string;
  highlight?: boolean;
}) {
  return (
    <Card hover>
      <div className="flex items-center gap-3">
        <div
          className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}
        >
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p
            className={`text-lg font-bold ${
              highlight ? "text-danger-600" : "text-gray-900"
            }`}
          >
            {value}
          </p>
        </div>
      </div>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-sm text-gray-900">{value}</p>
      </div>
    </div>
  );
}
