"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { DataTable } from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { api } from "@/lib/api";
import { Plus, Warehouse, MoreHorizontal, Loader2, Edit3 } from "lucide-react";

interface WarehouseItem {
  id: string;
  name: string;
  address: {
    line1?: string;
    city?: string;
    state?: string;
    pincode?: string;
  } | null;
  is_default: boolean;
  total_items: number;
  total_quantity: number;
  total_value: number;
}

interface ApiResponse<T> {
  data: T;
}

const columnHelper = createColumnHelper<WarehouseItem>();

export default function WarehousesPage() {
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newPincode, setNewPincode] = useState("");
  const [newIsDefault, setNewIsDefault] = useState(false);

  const { data: warehouses = [], isLoading } = useQuery<WarehouseItem[]>({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<WarehouseItem[]>>("/stock/warehouses");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      return api.post("/stock/warehouses", {
        name: newName,
        address: {
          line1: newAddress || undefined,
          city: newCity || undefined,
          state: newState || undefined,
          pincode: newPincode || undefined,
        },
        is_default: newIsDefault,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      resetModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      return api.patch(`/stock/warehouses/${editingId}`, {
        name: newName,
        address: {
          line1: newAddress || undefined,
          city: newCity || undefined,
          state: newState || undefined,
          pincode: newPincode || undefined,
        },
        is_default: newIsDefault,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      resetModal();
    },
  });

  const openEdit = (w: WarehouseItem) => {
    setEditingId(w.id);
    setNewName(w.name);
    setNewAddress(w.address?.line1 || "");
    setNewCity(w.address?.city || "");
    setNewState(w.address?.state || "");
    setNewPincode(w.address?.pincode || "");
    setNewIsDefault(w.is_default);
    setShowModal(true);
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor("name", {
        header: "Warehouse Name",
        cell: (info) => (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary-50 flex items-center justify-center">
              <Warehouse className="h-4 w-4 text-primary-600" />
            </div>
            <div>
              <span className="font-medium text-gray-900">
                {info.getValue()}
              </span>
              {info.row.original.is_default && (
                <Badge variant="success" className="ml-2">
                  Default
                </Badge>
              )}
            </div>
          </div>
        ),
      }),
      columnHelper.display({
        id: "location",
        header: "Location",
        cell: (info) => {
          const addr = info.row.original.address;
          if (!addr) return <span className="text-gray-400">-</span>;
          const parts = [addr.city, addr.state].filter(Boolean);
          return (
            <div>
              {addr.line1 && (
                <span className="text-sm text-gray-700">{addr.line1}</span>
              )}
              {parts.length > 0 && (
                <span className="block text-xs text-gray-500">
                  {parts.join(", ")}
                  {addr.pincode ? ` - ${addr.pincode}` : ""}
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.accessor("total_items", {
        header: "Products",
        cell: (info) => (
          <span className="text-gray-700">{formatNumber(info.getValue())}</span>
        ),
      }),
      columnHelper.accessor("total_quantity", {
        header: "Total Qty",
        cell: (info) => (
          <span className="font-medium text-gray-900">
            {formatNumber(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("total_value", {
        header: "Stock Value",
        cell: (info) => (
          <span className="font-semibold text-gray-900">
            {formatCurrency(info.getValue())}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        cell: (info) => (
          <button
            onClick={() => openEdit(info.row.original)}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
            title="Edit warehouse"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        ),
      }),
    ],
    []
  );

  const table = useReactTable({
    data: warehouses,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const resetModal = () => {
    setEditingId(null);
    setNewName("");
    setNewAddress("");
    setNewCity("");
    setNewState("");
    setNewPincode("");
    setNewIsDefault(false);
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouses</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your storage locations and stock distribution
          </p>
        </div>
        <Button
          icon={<Plus className="h-4 w-4" />}
          onClick={() => setShowModal(true)}
        >
          Add Warehouse
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-gray-500">Total Warehouses</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {warehouses.length}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Total Stock Quantity</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatNumber(
              warehouses.reduce((s, w) => s + (w.total_quantity || 0), 0)
            )}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Total Stock Value</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(
              warehouses.reduce((s, w) => s + (w.total_value || 0), 0)
            )}
          </p>
        </Card>
      </div>

      {/* Table */}
      <Card padding="none">
        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <DataTable table={table} />
        )}
      </Card>

      {/* Add/Edit Warehouse Modal */}
      <Modal
        open={showModal}
        onClose={resetModal}
        title={editingId ? "Edit Warehouse" : "Add Warehouse"}
        description={editingId ? "Update warehouse details" : "Create a new storage location"}
      >
        <div className="space-y-4">
          <Input
            label="Warehouse Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g., Main Warehouse"
          />
          <Input
            label="Address"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            placeholder="Street address"
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="City"
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              placeholder="City"
            />
            <Input
              label="State"
              value={newState}
              onChange={(e) => setNewState(e.target.value)}
              placeholder="State"
            />
            <Input
              label="Pincode"
              value={newPincode}
              onChange={(e) => setNewPincode(e.target.value)}
              placeholder="Pincode"
            />
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_default"
              checked={newIsDefault}
              onChange={(e) => setNewIsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="is_default" className="text-sm text-gray-700">
              Set as default warehouse
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={resetModal}>
              Cancel
            </Button>
            <Button
              onClick={() => editingId ? updateMutation.mutate() : createMutation.mutate()}
              loading={editingId ? updateMutation.isPending : createMutation.isPending}
              disabled={!newName}
            >
              {editingId ? "Update Warehouse" : "Create Warehouse"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
