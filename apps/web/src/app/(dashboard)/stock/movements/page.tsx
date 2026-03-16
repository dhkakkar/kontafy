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
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/table";
import { formatNumber, formatDate } from "@/lib/utils";
import {
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  ArrowRightLeft,
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

// Mock data
const movements: StockMovement[] = [
  {
    id: "1",
    type: "purchase_in",
    product_name: "A4 Printing Paper (Ream)",
    product_sku: "PAP-A4-500",
    warehouse_name: "Main Warehouse",
    quantity: 100,
    unit: "ream",
    notes: "PO-2026-034",
    created_at: "2026-03-12T10:30:00Z",
  },
  {
    id: "2",
    type: "sale_out",
    product_name: "Laptop Stand - Aluminium",
    product_sku: "ACC-LS-ALU",
    warehouse_name: "Main Warehouse",
    quantity: 2,
    unit: "pcs",
    notes: "INV-0047",
    created_at: "2026-03-12T09:15:00Z",
  },
  {
    id: "3",
    type: "transfer",
    product_name: "USB-C Cable (1m)",
    product_sku: "CAB-USBC-1M",
    warehouse_name: "Main Warehouse",
    quantity: 10,
    unit: "pcs",
    notes: "Transfer to Store Room - Office",
    created_at: "2026-03-11T14:45:00Z",
  },
  {
    id: "4",
    type: "adjustment",
    product_name: "Ballpoint Pen (Blue)",
    product_sku: "PEN-BP-BLU",
    warehouse_name: "Store Room - Office",
    quantity: -5,
    unit: "pcs",
    notes: "Damaged stock writeoff",
    created_at: "2026-03-10T16:20:00Z",
  },
  {
    id: "5",
    type: "purchase_in",
    product_name: "Thermal Receipt Roll",
    product_sku: "POS-TR-80",
    warehouse_name: "Main Warehouse",
    quantity: 50,
    unit: "roll",
    notes: "PO-2026-033",
    created_at: "2026-03-09T11:00:00Z",
  },
  {
    id: "6",
    type: "sale_out",
    product_name: "Office Chair - Ergonomic",
    product_sku: "FUR-CHR-ERG",
    warehouse_name: "Main Warehouse",
    quantity: 3,
    unit: "pcs",
    notes: "INV-0045",
    created_at: "2026-03-07T15:30:00Z",
  },
  {
    id: "7",
    type: "purchase_in",
    product_name: "USB-C Cable (1m)",
    product_sku: "CAB-USBC-1M",
    warehouse_name: "Godown - Delhi",
    quantity: 25,
    unit: "pcs",
    notes: "PO-2026-031",
    created_at: "2026-03-05T10:00:00Z",
  },
  {
    id: "8",
    type: "adjustment",
    product_name: "A4 Printing Paper (Ream)",
    product_sku: "PAP-A4-500",
    warehouse_name: "Main Warehouse",
    quantity: 10,
    unit: "ream",
    notes: "Inventory count correction",
    created_at: "2026-03-03T09:00:00Z",
  },
];

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

  const tabs = [
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
  ];

  const filteredData = useMemo(() => {
    return movements.filter((movement) => {
      if (activeTab !== "all" && movement.type !== activeTab) return false;
      if (
        searchQuery &&
        !movement.product_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) &&
        !(movement.product_sku || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) &&
        !(movement.notes || "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    });
  }, [activeTab, searchQuery]);

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
          // Make invoice/PO references clickable
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
    data: filteredData,
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

        <DataTable table={table} />
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
            options={[
              { value: "1", label: "A4 Printing Paper (Ream)" },
              { value: "2", label: "Laptop Stand - Aluminium" },
              { value: "4", label: "USB-C Cable (1m)" },
              { value: "5", label: "Ballpoint Pen (Blue)" },
              { value: "7", label: "Thermal Receipt Roll" },
              { value: "8", label: "Office Chair - Ergonomic" },
            ]}
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
              options={[
                { value: "1", label: "Main Warehouse" },
                { value: "2", label: "Store Room - Office" },
                { value: "3", label: "Godown - Delhi" },
              ]}
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
              options={[
                { value: "1", label: "Main Warehouse" },
                { value: "2", label: "Store Room - Office" },
                { value: "3", label: "Godown - Delhi" },
              ]}
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
            <Button>Record Movement</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
