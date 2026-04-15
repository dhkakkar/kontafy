"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { api } from "@/lib/api";
import { Plus, Search, Download, Upload, MoreHorizontal, Loader2, Pencil, Trash2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  type: "goods" | "services";
  hsn_code: string | null;
  unit: string;
  tax_rate: number | null;
  selling_price: number | null;
  purchase_price: number | null;
  total_quantity: number;
  stock_value: number;
  is_active: boolean;
}

interface ApiResponse<T> {
  data: T;
}

const columnHelper = createColumnHelper<Product>();

export default function ProductsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const { data: products = [], isLoading, error } = useQuery<Product[]>({
    queryKey: ["products", activeTab, searchQuery],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (activeTab === "goods" || activeTab === "services") params.type = activeTab;
      if (searchQuery) params.search = searchQuery;
      const res = await api.get<ApiResponse<Product[]>>("/stock/products", params);
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/stock/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDeleteTarget(null);
    },
  });

  const lowStockProducts = products.filter(
    (p) => p.type === "goods" && p.total_quantity <= 10
  );

  const tabs = [
    { value: "all", label: "All", count: products.length },
    { value: "goods", label: "Goods", count: products.filter((p) => p.type === "goods").length },
    { value: "services", label: "Services", count: products.filter((p) => p.type === "services").length },
    { value: "low_stock", label: "Low Stock", count: lowStockProducts.length },
  ];

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Product Name",
        cell: (info) => (
          <div>
            <span className="font-medium text-gray-900">
              {info.getValue()}
            </span>
            {info.row.original.sku && (
              <span className="block text-xs text-gray-500">
                SKU: {info.row.original.sku}
              </span>
            )}
          </div>
        ),
      }),
      columnHelper.accessor("hsn_code", {
        header: "HSN/SAC",
        cell: (info) => (
          <span className="text-gray-600 font-mono text-xs">
            {info.getValue() || "-"}
          </span>
        ),
      }),
      columnHelper.accessor("type", {
        header: "Type",
        cell: (info) => (
          <Badge variant={info.getValue() === "goods" ? "info" : "default"}>
            {info.getValue() === "goods" ? "Goods" : "Services"}
          </Badge>
        ),
      }),
      columnHelper.accessor("unit", {
        header: "Unit",
        cell: (info) => (
          <span className="text-gray-600">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("tax_rate", {
        header: "GST Rate",
        cell: (info) => (
          <span className="text-gray-600">
            {info.getValue() != null ? `${info.getValue()}%` : "-"}
          </span>
        ),
      }),
      columnHelper.accessor("total_quantity", {
        header: "Stock Qty",
        cell: (info) => {
          const qty = info.getValue();
          const isService = info.row.original.type === "services";
          if (isService) return <span className="text-gray-400">N/A</span>;
          return (
            <span
              className={`font-medium ${qty <= 10 ? "text-danger-600" : "text-gray-900"}`}
            >
              {formatNumber(qty)}
            </span>
          );
        },
      }),
      columnHelper.accessor("stock_value", {
        header: "Stock Value",
        cell: (info) => {
          const isService = info.row.original.type === "services";
          if (isService) return <span className="text-gray-400">N/A</span>;
          return (
            <span className="font-medium text-gray-900">
              {formatCurrency(info.getValue())}
            </span>
          );
        },
      }),
      columnHelper.display({
        id: "actions",
        cell: (info) => {
          const product = info.row.original;
          const isOpen = openMenuId === product.id;
          return (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId(isOpen ? null : product.id);
                }}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {isOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
                  onMouseLeave={() => setOpenMenuId(null)}
                >
                  <button
                    onClick={() => {
                      setOpenMenuId(null);
                      router.push(`/stock/products/${product.id}/edit`);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setOpenMenuId(null);
                      setDeleteTarget(product);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          );
        },
      }),
    ],
    []
  );

  const displayProducts = activeTab === "low_stock" ? lowStockProducts : products;

  const table = useReactTable({
    data: displayProducts,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your goods and services catalog
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/settings/import?type=products">
            <Button
              variant="outline"
              size="sm"
              icon={<Upload className="h-4 w-4" />}
            >
              Import
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="h-4 w-4" />}
          >
            Export
          </Button>
          <Link href="/stock/products/new">
            <Button icon={<Plus className="h-4 w-4" />}>Add Product</Button>
          </Link>
        </div>
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
        </div>

        <div className="p-4 border-b border-gray-200">
          <Input
            placeholder="Search by product name, SKU, or HSN code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            className="max-w-md"
          />
        </div>

        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="py-12 text-center text-danger-600">
            Failed to load products. Please try again.
          </div>
        ) : (
          <DataTable table={table} onRowClick={(row) => router.push(`/stock/products/${row.id}`)} />
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Delete Product
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete{" "}
              <span className="font-medium">{deleteTarget.name}</span>? This
              action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                loading={deleteMutation.isPending}
                icon={<Trash2 className="h-4 w-4" />}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
