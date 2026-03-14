"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
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
import { Plus, Search, Download, MoreHorizontal } from "lucide-react";

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

// Mock data — will be replaced by API call
const products: Product[] = [
  {
    id: "1",
    name: "A4 Printing Paper (Ream)",
    sku: "PAP-A4-500",
    type: "goods",
    hsn_code: "4802",
    unit: "ream",
    tax_rate: 12,
    selling_price: 350,
    purchase_price: 280,
    total_quantity: 12,
    stock_value: 3360,
    is_active: true,
  },
  {
    id: "2",
    name: "Laptop Stand - Aluminium",
    sku: "ACC-LS-ALU",
    type: "goods",
    hsn_code: "7616",
    unit: "pcs",
    tax_rate: 18,
    selling_price: 2500,
    purchase_price: 1800,
    total_quantity: 3,
    stock_value: 5400,
    is_active: true,
  },
  {
    id: "3",
    name: "Annual Software License",
    sku: null,
    type: "services",
    hsn_code: "998314",
    unit: "nos",
    tax_rate: 18,
    selling_price: 25000,
    purchase_price: null,
    total_quantity: 0,
    stock_value: 0,
    is_active: true,
  },
  {
    id: "4",
    name: "USB-C Cable (1m)",
    sku: "CAB-USBC-1M",
    type: "goods",
    hsn_code: "8544",
    unit: "pcs",
    tax_rate: 18,
    selling_price: 350,
    purchase_price: 180,
    total_quantity: 8,
    stock_value: 1440,
    is_active: true,
  },
  {
    id: "5",
    name: "Ballpoint Pen (Blue)",
    sku: "PEN-BP-BLU",
    type: "goods",
    hsn_code: "9608",
    unit: "pcs",
    tax_rate: 18,
    selling_price: 15,
    purchase_price: 8,
    total_quantity: 28,
    stock_value: 224,
    is_active: true,
  },
  {
    id: "6",
    name: "Web Design Service",
    sku: null,
    type: "services",
    hsn_code: "998314",
    unit: "nos",
    tax_rate: 18,
    selling_price: 50000,
    purchase_price: null,
    total_quantity: 0,
    stock_value: 0,
    is_active: true,
  },
  {
    id: "7",
    name: "Thermal Receipt Roll",
    sku: "POS-TR-80",
    type: "goods",
    hsn_code: "4811",
    unit: "roll",
    tax_rate: 12,
    selling_price: 120,
    purchase_price: 75,
    total_quantity: 5,
    stock_value: 375,
    is_active: true,
  },
  {
    id: "8",
    name: "Office Chair - Ergonomic",
    sku: "FUR-CHR-ERG",
    type: "goods",
    hsn_code: "9401",
    unit: "pcs",
    tax_rate: 18,
    selling_price: 15000,
    purchase_price: 9500,
    total_quantity: 6,
    stock_value: 57000,
    is_active: true,
  },
];

const columnHelper = createColumnHelper<Product>();

export default function ProductsPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const tabs = [
    { value: "all", label: "All", count: products.length },
    {
      value: "goods",
      label: "Goods",
      count: products.filter((p) => p.type === "goods").length,
    },
    {
      value: "services",
      label: "Services",
      count: products.filter((p) => p.type === "services").length,
    },
  ];

  const filteredData = useMemo(() => {
    return products.filter((product) => {
      if (activeTab !== "all" && product.type !== activeTab) return false;
      if (
        searchQuery &&
        !product.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(product.sku || "").toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(product.hsn_code || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    });
  }, [activeTab, searchQuery]);

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

  const table = useReactTable({
    data: filteredData,
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

        <DataTable table={table} />
      </Card>
    </div>
  );
}
