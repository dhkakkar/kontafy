"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  Package,
  Warehouse,
  AlertTriangle,
  IndianRupee,
  Plus,
  ArrowRightLeft,
  TrendingDown,
} from "lucide-react";

// Dashboard summary (mock data — will be replaced by API call)
const dashboardSummary = {
  total_products: 48,
  total_goods: 35,
  total_services: 13,
  total_quantity: 2450,
  total_stock_value: 1245000,
  low_stock_count: 5,
  warehouse_count: 3,
  low_stock_items: [
    {
      id: "1",
      name: "A4 Printing Paper (Ream)",
      sku: "PAP-A4-500",
      unit: "ream",
      reorder_level: 50,
      current_quantity: 12,
      deficit: 38,
    },
    {
      id: "2",
      name: "Ballpoint Pen (Blue)",
      sku: "PEN-BP-BLU",
      unit: "pcs",
      reorder_level: 100,
      current_quantity: 28,
      deficit: 72,
    },
    {
      id: "3",
      name: "Laptop Stand - Aluminium",
      sku: "ACC-LS-ALU",
      unit: "pcs",
      reorder_level: 10,
      current_quantity: 3,
      deficit: 7,
    },
    {
      id: "4",
      name: "USB-C Cable (1m)",
      sku: "CAB-USBC-1M",
      unit: "pcs",
      reorder_level: 30,
      current_quantity: 8,
      deficit: 22,
    },
    {
      id: "5",
      name: "Thermal Receipt Roll",
      sku: "POS-TR-80",
      unit: "roll",
      reorder_level: 25,
      current_quantity: 5,
      deficit: 20,
    },
  ],
};

interface LowStockItem {
  id: string;
  name: string;
  sku: string | null;
  unit: string;
  reorder_level: number;
  current_quantity: number;
  deficit: number;
}

const columnHelper = createColumnHelper<LowStockItem>();

export default function StockDashboardPage() {
  const [sorting, setSorting] = useState<SortingState>([]);
  const summary = dashboardSummary;

  const summaryCards = [
    {
      title: "Total Products",
      value: formatNumber(summary.total_products),
      subtitle: `${summary.total_goods} goods, ${summary.total_services} services`,
      icon: <Package className="h-5 w-5 text-primary-600" />,
      color: "bg-primary-50",
    },
    {
      title: "Stock Value",
      value: formatCurrency(summary.total_stock_value),
      subtitle: `${formatNumber(summary.total_quantity)} total units`,
      icon: <IndianRupee className="h-5 w-5 text-success-600" />,
      color: "bg-success-50",
    },
    {
      title: "Warehouses",
      value: formatNumber(summary.warehouse_count),
      subtitle: "Active locations",
      icon: <Warehouse className="h-5 w-5 text-primary-600" />,
      color: "bg-primary-50",
    },
    {
      title: "Low Stock Alerts",
      value: formatNumber(summary.low_stock_count),
      subtitle: "Products below reorder level",
      icon: <AlertTriangle className="h-5 w-5 text-warning-600" />,
      color: "bg-warning-50",
    },
  ];

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Product",
        cell: (info) => (
          <div>
            <span className="font-medium text-gray-900">
              {info.getValue()}
            </span>
            {info.row.original.sku && (
              <span className="block text-xs text-gray-500">
                {info.row.original.sku}
              </span>
            )}
          </div>
        ),
      }),
      columnHelper.accessor("unit", {
        header: "Unit",
        cell: (info) => (
          <span className="text-gray-600">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("current_quantity", {
        header: "Current Stock",
        cell: (info) => (
          <span className="font-medium text-danger-600">
            {formatNumber(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("reorder_level", {
        header: "Reorder Level",
        cell: (info) => (
          <span className="text-gray-600">
            {formatNumber(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("deficit", {
        header: "Deficit",
        cell: (info) => (
          <Badge variant="danger">
            <TrendingDown className="h-3 w-3 mr-1" />
            {formatNumber(info.getValue())}
          </Badge>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: summary.low_stock_items,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Stock & Inventory
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your products, warehouses, and stock movements
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/stock/movements">
            <Button
              variant="outline"
              icon={<ArrowRightLeft className="h-4 w-4" />}
            >
              Record Movement
            </Button>
          </Link>
          <Link href="/stock/products/new">
            <Button icon={<Plus className="h-4 w-4" />}>Add Product</Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.title} hover>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {card.value}
                </p>
                <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
              </div>
              <div
                className={`h-10 w-10 rounded-lg ${card.color} flex items-center justify-center`}
              >
                {card.icon}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/stock/products">
          <Card hover className="cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Products</p>
                <p className="text-sm text-gray-500">
                  View and manage all products
                </p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/stock/warehouses">
          <Card hover className="cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
                <Warehouse className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Warehouses</p>
                <p className="text-sm text-gray-500">
                  Manage storage locations
                </p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/stock/movements">
          <Card hover className="cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
                <ArrowRightLeft className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Movements</p>
                <p className="text-sm text-gray-500">
                  Stock in/out & transfers
                </p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Low Stock Alerts */}
      <Card padding="none">
        <CardHeader className="p-4 pb-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning-500" />
            <CardTitle>Low Stock Alerts</CardTitle>
          </div>
          <Link href="/stock/products?filter=low_stock">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>

        <div className="mt-2">
          <DataTable table={table} />
        </div>
      </Card>
    </div>
  );
}
