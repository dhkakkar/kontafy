"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
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
import { Plus, Search, Download, MoreHorizontal, Loader2 } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

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
        cell: () => (
          <button className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        ),
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
          <DataTable table={table} />
        )}
      </Card>
    </div>
  );
}
