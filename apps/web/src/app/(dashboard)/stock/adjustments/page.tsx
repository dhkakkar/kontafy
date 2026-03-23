"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import { Plus, Loader2 } from "lucide-react";

interface StockMovement {
  id: string;
  product_name?: string;
  product?: { name: string };
  warehouse_name?: string;
  warehouse?: { name: string };
  type: string;
  quantity: number;
  reason?: string | null;
  date: string;
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

export default function StockAdjustmentPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [adjustType, setAdjustType] = useState("adjustment_in");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");

  const { data: movements = [], isLoading } = useQuery<StockMovement[]>({
    queryKey: ["stock-movements", "adjustment"],
    queryFn: async () => {
      const res = await api.get<{ data: { data: StockMovement[]; pagination: any } }>("/stock/movements", {
        type: "adjustment",
      });
      const items = res.data?.data ?? [];
      return items.map((m: any) => ({
        ...m,
        product_name: m.product_name || m.product?.name || "",
        warehouse_name: m.warehouse_name || m.warehouse?.name || "",
        date: m.date || m.created_at,
        reason: m.reason || m.notes || null,
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
      return api.post("/stock/movements", {
        product_id: productId,
        warehouse_id: warehouseId,
        type: "adjustment",
        quantity: parseInt(quantity),
        notes: reason || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      setShowModal(false);
      setProductId("");
      setWarehouseId("");
      setQuantity("");
      setReason("");
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Adjustments</h1>
          <p className="text-sm text-gray-500 mt-1">Adjust stock levels for inventory corrections</p>
        </div>
        <Button icon={<Plus className="h-4 w-4" />} onClick={() => setShowModal(true)}>
          New Adjustment
        </Button>
      </div>

      <Card padding="none">
        {isLoading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Reason</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-3 px-4 text-gray-600">{formatDate(m.date)}</td>
                    <td className="py-3 px-4 text-gray-900 font-medium">{m.product_name || m.product?.name || "-"}</td>
                    <td className="py-3 px-4 text-gray-600">{m.warehouse_name || m.warehouse?.name || "-"}</td>
                    <td className="py-3 px-4">
                      <Badge variant={m.type.includes("in") ? "success" : "danger"}>
                        {m.type.includes("in") ? "Stock In" : "Stock Out"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right font-medium">{formatNumber(m.quantity)}</td>
                    <td className="py-3 px-4 text-gray-600">{m.reason || "-"}</td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-500">No stock adjustments found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Stock Adjustment" size="lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Product"
            options={products.map((p) => ({ value: p.id, label: p.name }))}
            value={productId}
            onChange={setProductId}
            searchable
            placeholder="Select product"
          />
          <Select
            label="Warehouse"
            options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
            value={warehouseId}
            onChange={setWarehouseId}
            placeholder="Select warehouse"
          />
          <Select
            label="Adjustment Type"
            options={[
              { value: "adjustment_in", label: "Stock In (Increase)" },
              { value: "adjustment_out", label: "Stock Out (Decrease)" },
            ]}
            value={adjustType}
            onChange={setAdjustType}
          />
          <Input label="Quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" />
          <div className="md:col-span-2">
            <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for adjustment" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
          <Button
            onClick={() => createMutation.mutate()}
            loading={createMutation.isPending}
            disabled={!productId || !warehouseId || !quantity}
          >
            Submit Adjustment
          </Button>
        </div>
      </Modal>
    </div>
  );
}
