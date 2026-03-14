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
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/table";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Calculator, ArrowLeft, RefreshCw } from "lucide-react";

interface GstReturn {
  id: string;
  return_type: string;
  period: string;
  status: string;
  data: any;
  filed_at: string | null;
  arn: string | null;
  created_at: string;
}

const RETURN_TYPE_LABELS: Record<string, string> = {
  GSTR1: "GSTR-1",
  GSTR3B: "GSTR-3B",
  GSTR9: "GSTR-9",
  GSTR9C: "GSTR-9C",
};

const statusBadgeMap: Record<
  string,
  { variant: "default" | "warning" | "success" | "info"; label: string }
> = {
  draft: { variant: "default", label: "Draft" },
  computed: { variant: "warning", label: "Computed" },
  filed: { variant: "success", label: "Filed" },
};

const columnHelper = createColumnHelper<GstReturn>();

export default function GstReturnsListPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [sorting, setSorting] = useState<SortingState>([]);

  const { data: returnsData, isLoading, refetch } = useQuery({
    queryKey: ["gst-returns"],
    queryFn: () =>
      api.get<{ data: GstReturn[]; meta: any }>("/tax/gst/returns", {
        limit: "100",
      }),
  });

  const returns = returnsData?.data || [];

  const tabs = useMemo(
    () => [
      { value: "all", label: "All", count: returns.length },
      {
        value: "draft",
        label: "Draft",
        count: returns.filter((r) => r.status === "draft").length,
      },
      {
        value: "computed",
        label: "Computed",
        count: returns.filter((r) => r.status === "computed").length,
      },
      {
        value: "filed",
        label: "Filed",
        count: returns.filter((r) => r.status === "filed").length,
      },
    ],
    [returns]
  );

  const filteredData = useMemo(() => {
    if (activeTab === "all") return returns;
    return returns.filter((r) => r.status === activeTab);
  }, [returns, activeTab]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("return_type", {
        header: "Return Type",
        cell: (info) => (
          <span className="font-medium text-primary-800">
            {RETURN_TYPE_LABELS[info.getValue()] || info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("period", {
        header: "Period",
        cell: (info) => (
          <span className="text-gray-900">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("status", {
        header: "Status",
        cell: (info) => {
          const badge = statusBadgeMap[info.getValue()] || statusBadgeMap.draft;
          return (
            <Badge variant={badge.variant} dot>
              {badge.label}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("filed_at", {
        header: "Filed Date",
        cell: (info) => {
          const val = info.getValue();
          return (
            <span className="text-gray-600">
              {val ? formatDate(val) : "-"}
            </span>
          );
        },
      }),
      columnHelper.accessor("arn", {
        header: "ARN",
        cell: (info) => (
          <span className="text-gray-600 font-mono text-xs">
            {info.getValue() || "-"}
          </span>
        ),
      }),
      columnHelper.accessor("created_at", {
        header: "Created",
        cell: (info) => (
          <span className="text-gray-600">
            {formatDate(info.getValue())}
          </span>
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
        <div className="flex items-center gap-3">
          <Link href="/tax">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">GST Returns</h1>
            <p className="text-sm text-gray-500 mt-1">
              View and manage your GST return filings
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
          <Link href="/tax/gst/compute">
            <Button icon={<Calculator className="h-4 w-4" />}>
              Compute Return
            </Button>
          </Link>
        </div>
      </div>

      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <Tabs tabs={tabs} value={activeTab} onChange={setActiveTab} />
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm text-gray-500">
            Loading GST returns...
          </div>
        ) : (
          <DataTable table={table} />
        )}
      </Card>
    </div>
  );
}
