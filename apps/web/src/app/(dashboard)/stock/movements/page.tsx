"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/table";
import { formatNumber, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  ArrowRightLeft,
  Loader2,
} from "lucide-react";

interface StockMovement {
  id: string;
  type: "purchase_in" | "sale_out" | "adjustment" | "transfer";
  product_name: string;
  product_sku: string | null;
  warehouse_name: string;
  quantity: number;
  unit: string;
  notes: string | null;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
}

interface Warehouse {
  id: string;
  name: string;
}

interface ApiResponse<T> {
  data: T;
}

const typeConfig: Record<
  StockMovement["type"],
  {
    label: string;
    variant: "success" | "danger" | "warning" | "info";
    icon: React.ReactNode;
  }
> = {
  purchase_in: {
    label: "Purchase In",
    variant: "success",
    icon: <ArrowDownLeft className="h-3 w-3" />,
  },
  sale_out: {
    label: "Sale Out",
    variant: "danger",
    icon: <ArrowUpRight className="h-3 w-3" />,
  },
  adjustment: {
    label: "Adjustment",
    variant: "warning",
    icon: <RefreshCw className="h-3 w-3" />,
  },
  transfer: {
    label: "Transfer",
    variant: "info",
    icon: <ArrowRightLeft className="h-3 w-3" />,
  },
};

const columnHelper = createColumnHelper<StockMovement>();

export default function StockMovementsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showModal, setShowModal] = useState(false);

  // New movement form state
  const [movementType, setMovementType] = useState("purchase_in");
  const [movementProduct, setMovementProduct] = useState("");
  const [movementWarehouse, setMovementWarehouse] = useState("");
  const [movementQuantity, setMovementQuantity] = useState("");
  const [movementNotes, setMovementNotes] = useState("");
  const [movementDestWarehouse, setMovementDestWarehouse] = useState("");

  const { data: movements = [], isLoading } = useQuery<StockMovement[]>({
    queryKey: ["stock-movements", activeTab, searchQuery],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (activeTab !== "all") params.type = activeTab;
      if (searchQuery) params.search = searchQuery;
      const res = await api.get<{ data: { data: StockMovement[]; pagination: any } }>("/stock/movements", params);
      const items = res.data?.data ?? [];
      return items.map((m: any) => ({
        ...m,
        product_name: m.product_name || m.product?.name || "",
        product_sku: m.product_sku || m.product?.sku || null,
        warehouse_name: m.warehouse_name || m.warehouse?.name || "",
        unit: m.unit || m.product?.unit || "pcs",
      }));
    },
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products-list"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Product[]>>("/stock/products");
      return res.data;
    },
  });

  const { data: warehouses = [] } = useQuery<Warehouse[]>({
    queryKey: ["warehouses-list"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Warehouse[]>>("/stock/warehouses");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        product_id: movementProduct,
        warehouse_id: movementWarehouse,
        type: movementType,
        quantity: parseInt(movementQuantity),
        notes: movementNotes || undefined,
      };
      if (movementType === "transfer" && movementDestWarehouse) {
        body.destination_warehouse_id = movementDestWarehouse;
      }
      return api.post("/stock/movements", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      resetModal();
    },
  });

  const tabs = useMemo(() => [
    { value: "all", label: "All", count: movements.length },
    {
      value: "purchase_in",
      label: "Purchase In",
      count: movements.filter((m) => m.type === "purchase_in").length,
    },
    {
      value: "sale_out",
      label: "Sale Out",
      count: movements.filter((m) => m.type === "sale_out").length,
    },
    {
      value: "adjustment",
      label: "Adjustment",
      count: movements.filter((m) => m.type === "adjustment").length,
    },
    {
      value: "transfer",
      label: "Transfer",
      count: movements.filter((m) => m.type === "transfer").length,
    },
  ], [movements]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("created_at", {
        header: "Date",
        cell: (info) => (
          <span className="text-gray-600">
            {formatDate(info.getValue(), "DD MMM YYYY HH:mm")}
          </span>
        ),
      }),
      columnHelper.accessor("type", {
        header: "Type",
        cell: (info) => {
          const cfg = typeConfig[info.getValue()];
          if (!cfg) return <span>{info.getValue()}</span>;
          return (
            <Badge variant={cfg.variant}>
              <span className="flex items-center gap-1">
                {cfg.icon}
                {cfg.label}
              </span>
            </Badge>
          );
        },
      }),
      columnHelper.accessor("product_name", {
        header: "Product",
        cell: (info) => (
          <div>
            <span className="font-medium text-gray-900">
              {info.getValue()}
            </span>
            {info.row.original.product_sku && (
              <span className="block text-xs text-gray-500">
                {info.row.original.product_sku}
              </span>
            )}
          </div>
        ),
      }),
      columnHelper.accessor("warehouse_name", {
        header: "Warehouse",
        cell: (info) => (
          <span className="text-gray-700">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("quantity", {
        header: "Quantity",
        cell: (info) => {
          const qty = info.getValue();
          const isNegative = qty < 0;
          return (
            <span
              className={`font-medium ${isNegative ? "text-danger-600" : "text-success-600"}`}
            >
              {isNegative ? "" : "+"}
              {formatNumber(qty)} {info.row.original.unit}
            </span>
          );
        },
      }),
      columnHelper.accessor("notes", {
        header: "Reference / Notes",
        cell: (info) => {
          const val = info.getValue() || "-";
          const invMatch = val.match(/^(INV-\d+)$/);
          const poMatch = val.match(/^(PO-[\w-]+)$/);
          if (invMatch) {
            return (
              <Link href={`/invoices`} className="text-sm text-primary-700 font-medium hover:underline">
                {val}
              </Link>
            );
          }
          if (poMatch) {
            return (
              <Link href={`/purchase-orders`} className="text-sm text-primary-700 font-medium hover:underline">
                {val}
              </Link>
            );
          }
          return (
            <span className="text-sm text-gray-500">{val}</span>
          );
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data: movements,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const resetModal = () => {
    setMovementType("purchase_in");
    setMovementProduct("");
    setMovementWarehouse("");
    setMovementQuantity("");
    setMovementNotes("");
    setMovementDestWarehouse("");
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Movements</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track stock purchases, sales, adjustments, and transfers
          </p>
        </div>
        <Button
          icon={<Plus className="h-4 w-4" />}
          onClick={() => setShowModal(true)}
        >
          Record Movement
        </Button>
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
        </div>

        <div className="p-4 border-b border-gray-200">
          <Input
            placeholder="Search by product, SKU, or notes..."
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
        ) : (
          <DataTable table={table} />
        )}
      </Card>

      {/* Record Movement Modal */}
      <Modal
        open={showModal}
        onClose={resetModal}
        title="Record Stock Movement"
        description="Record a stock purchase, sale, adjustment, or transfer"
        size="lg"
      >
        <div className="space-y-4">
          <Select
            label="Movement Type"
            value={movementType}
            onChange={setMovementType}
            options={[
              { value: "purchase_in", label: "Purchase In" },
              { value: "sale_out", label: "Sale Out" },
              { value: "adjustment", label: "Adjustment" },
              { value: "transfer", label: "Transfer" },
            ]}
          />

          <Select
            label="Product"
            value={movementProduct}
            onChange={setMovementProduct}
            options={products.map((p) => ({ value: p.id, label: p.name }))}
            searchable
            placeholder="Select product"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label={
                movementType === "transfer"
                  ? "Source Warehouse"
                  : "Warehouse"
              }
              value={movementWarehouse}
              onChange={setMovementWarehouse}
              options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
              placeholder="Select warehouse"
            />
            <Input
              label="Quantity"
              type="number"
              value={movementQuantity}
              onChange={(e) => setMovementQuantity(e.target.value)}
              placeholder="Enter quantity"
            />
          </div>

          {movementType === "transfer" && (
            <Select
              label="Destination Warehouse"
              value={movementDestWarehouse}
              onChange={setMovementDestWarehouse}
              options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
              placeholder="Select destination warehouse"
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              value={movementNotes}
              onChange={(e) => setMovementNotes(e.target.value)}
              placeholder="Reference number or notes..."
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={resetModal}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              loading={createMutation.isPending}
              disabled={!movementProduct || !movementWarehouse || !movementQuantity}
            >
              Record Movement
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
