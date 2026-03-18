"use client";

import React, { Suspense, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/ui/table";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  ShoppingCart,
  FileText,
  ArrowLeft,
  Download,
  Filter,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface MarketplaceOrder {
  id: string;
  external_order_id: string;
  platform: string;
  order_date: string | null;
  status: string | null;
  subtotal: number | null;
  platform_fees: number | null;
  shipping_fees: number | null;
  tax_amount: number | null;
  net_amount: number | null;
  invoice: {
    id: string;
    invoice_number: string;
    status: string;
  } | null;
}

interface OrdersResponse {
  data: MarketplaceOrder[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

const PLATFORM_LABELS: Record<string, string> = {
  amazon: "Amazon",
  flipkart: "Flipkart",
  shopify: "Shopify",
  woocommerce: "WooCommerce",
};

const PLATFORM_COLORS: Record<string, string> = {
  amazon: "warning",
  flipkart: "info",
  shopify: "success",
  woocommerce: "default",
};

const columnHelper = createColumnHelper<MarketplaceOrder>();

export default function CommerceOrdersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center mt-12"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>}>
      <CommerceOrdersContent />
    </Suspense>
  );
}

function CommerceOrdersContent() {
  const searchParams = useSearchParams();
  const initialPlatform = searchParams.get("platform") ?? "";

  const [sorting, setSorting] = useState<SortingState>([]);
  const [page, setPage] = useState(1);
  const [platform, setPlatform] = useState(initialPlatform);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const queryParams: Record<string, string> = {
    page: String(page),
    limit: "20",
  };
  if (platform) queryParams.platform = platform;
  if (dateFrom) queryParams.date_from = dateFrom;
  if (dateTo) queryParams.date_to = dateTo;

  const { data: ordersResponse, isLoading } = useQuery<OrdersResponse>({
    queryKey: ["commerce-orders", page, platform, dateFrom, dateTo],
    queryFn: () => api.get("/commerce/orders", queryParams),
  });

  const orders = ordersResponse?.data ?? [];
  const meta = ordersResponse?.meta ?? { total: 0, page: 1, limit: 20, total_pages: 0 };

  const columns = useMemo(
    () => [
      columnHelper.accessor("platform", {
        header: "Platform",
        cell: (info) => (
          <Badge variant={PLATFORM_COLORS[info.getValue()] as any}>
            {PLATFORM_LABELS[info.getValue()] ?? info.getValue()}
          </Badge>
        ),
      }),
      columnHelper.accessor("external_order_id", {
        header: "Order ID",
        cell: (info) => (
          <span className="font-mono text-sm font-medium text-gray-900">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("order_date", {
        header: "Date",
        cell: (info) => {
          const val = info.getValue();
          if (!val) return <span className="text-gray-400">--</span>;
          return (
            <span className="text-gray-600">
              {new Date(val).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          );
        },
      }),
      columnHelper.accessor("net_amount", {
        header: "Amount",
        cell: (info) => (
          <span className="font-medium text-gray-900">
            {formatCurrency(Number(info.getValue() ?? 0))}
          </span>
        ),
      }),
      columnHelper.accessor("platform_fees", {
        header: "Platform Fee",
        cell: (info) => (
          <span className="text-danger-600">
            {formatCurrency(Number(info.getValue() ?? 0))}
          </span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const status = info.getValue() ?? "unknown";
          const variant =
            status.toLowerCase() === "delivered" || status.toLowerCase() === "completed"
              ? "success"
              : status.toLowerCase() === "shipped" || status.toLowerCase() === "processing"
              ? "info"
              : "default";
          return <Badge variant={variant}>{status}</Badge>;
        },
      }),
      columnHelper.accessor("invoice", {
        header: "Invoice",
        cell: (info) => {
          const invoice = info.getValue();
          if (!invoice) {
            return <span className="text-gray-400 text-sm">--</span>;
          }
          return (
            <Link
              href={`/invoices/${invoice.id}`}
              className="text-primary-600 hover:text-primary-800 text-sm font-medium flex items-center gap-1"
            >
              <FileText className="h-3.5 w-3.5" />
              {invoice.invoice_number}
            </Link>
          );
        },
      }),
    ],
    []
  );

  const table = useReactTable({
    data: orders,
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
        <div className="flex items-center gap-3">
          <Link href="/commerce">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Synced Orders</h1>
            <p className="text-sm text-gray-500 mt-1">
              Orders imported from connected e-commerce platforms
            </p>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          {meta.total} total orders
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter className="h-4 w-4" />
            Filters
          </div>
          <Select
            label="Platform"
            value={platform}
            onChange={(v) => {
              setPlatform(v);
              setPage(1);
            }}
            options={[
              { value: "", label: "All Platforms" },
              { value: "amazon", label: "Amazon" },
              { value: "flipkart", label: "Flipkart" },
              { value: "shopify", label: "Shopify" },
              { value: "woocommerce", label: "WooCommerce" },
            ]}
            placeholder="All Platforms"
          />
          <Input
            label="From Date"
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
          />
          <Input
            label="To Date"
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
          />
          {(platform || dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPlatform("");
                setDateFrom("");
                setDateTo("");
                setPage(1);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Orders Table */}
      <Card padding="none">
        <CardHeader className="p-4 pb-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary-600" />
            <CardTitle>Orders</CardTitle>
          </div>
        </CardHeader>

        <div className="mt-2">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No orders found
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {platform
                  ? `No orders from ${PLATFORM_LABELS[platform] ?? platform} yet.`
                  : "Connect a platform and sync to see orders here."}
              </p>
              <Link href="/commerce">
                <Button variant="outline">Go to Connections</Button>
              </Link>
            </div>
          ) : (
            <DataTable table={table} />
          )}
        </div>
      </Card>

      {/* Pagination */}
      {meta.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {meta.page} of {meta.total_pages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= meta.total_pages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
