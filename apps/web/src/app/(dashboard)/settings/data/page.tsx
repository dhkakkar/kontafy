"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Users,
  FileText,
  Package,
  BookOpen,
  BarChart3,
  Archive,
  Calendar,
} from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

type ExportFormat = "csv" | "xlsx";

interface ExportEntity {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  endpoint: string;
  supportsDateRange: boolean;
}

const exportEntities: ExportEntity[] = [
  {
    id: "contacts",
    label: "Contacts",
    description: "Customers, vendors, and parties",
    icon: <Users className="h-5 w-5" />,
    endpoint: "/data-transfer/export/contacts",
    supportsDateRange: false,
  },
  {
    id: "invoices",
    label: "Invoices",
    description: "Sales and purchase invoices with line items",
    icon: <FileText className="h-5 w-5" />,
    endpoint: "/data-transfer/export/invoices",
    supportsDateRange: true,
  },
  {
    id: "products",
    label: "Products",
    description: "Product and service catalog",
    icon: <Package className="h-5 w-5" />,
    endpoint: "/data-transfer/export/products",
    supportsDateRange: false,
  },
  {
    id: "journal-entries",
    label: "Journal Entries",
    description: "General ledger entries with line details",
    icon: <BookOpen className="h-5 w-5" />,
    endpoint: "/data-transfer/export/journal-entries",
    supportsDateRange: true,
  },
  {
    id: "chart-of-accounts",
    label: "Chart of Accounts",
    description: "Full account hierarchy and balances",
    icon: <BarChart3 className="h-5 w-5" />,
    endpoint: "/data-transfer/export/chart-of-accounts",
    supportsDateRange: false,
  },
];

const formatOptions = [
  { value: "csv", label: "CSV (.csv)" },
  { value: "xlsx", label: "Excel (.xlsx)" },
];

export default function DataExportPage() {
  const [formats, setFormats] = useState<Record<string, ExportFormat>>({});
  const [dateRanges, setDateRanges] = useState<
    Record<string, { from: string; to: string }>
  >({});
  const [downloading, setDownloading] = useState<string | null>(null);

  const getFormat = (id: string): ExportFormat => formats[id] || "csv";

  const handleFormatChange = (id: string, value: string) => {
    setFormats((prev) => ({ ...prev, [id]: value as ExportFormat }));
  };

  const handleDateChange = (
    id: string,
    field: "from" | "to",
    value: string
  ) => {
    setDateRanges((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const orgId = localStorage.getItem("org_id");
      if (orgId) headers["X-Org-Id"] = orgId;
    }
    return headers;
  };

  const handleExport = async (entity: ExportEntity) => {
    setDownloading(entity.id);
    try {
      const format = getFormat(entity.id);
      const params = new URLSearchParams({ format });
      const range = dateRanges[entity.id];
      if (entity.supportsDateRange && range) {
        if (range.from) params.set("from", range.from);
        if (range.to) params.set("to", range.to);
      }

      const response = await fetch(
        `${API_BASE}${entity.endpoint}?${params.toString()}`,
        { headers: getAuthHeaders() }
      );

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${entity.id}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setDownloading(null);
    }
  };

  const handleExportAll = async () => {
    setDownloading("all");
    try {
      const response = await fetch(`${API_BASE}/data-transfer/export/all`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kontafy_backup_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Full export failed:", err);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <Card padding="none">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-gray-400" />
            <h3 className="text-base font-semibold text-gray-900">
              Export Data
            </h3>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Download your data as CSV or Excel files. Use exports for backups,
            reporting, or migration.
          </p>
        </div>

        {/* Entity export cards */}
        <div className="divide-y divide-gray-100">
          {exportEntities.map((entity) => (
            <div key={entity.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-500 shrink-0 mt-0.5">
                    {entity.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">
                      {entity.label}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {entity.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Select
                    options={formatOptions}
                    value={getFormat(entity.id)}
                    onChange={(val) => handleFormatChange(entity.id, val)}
                    className="w-32"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={downloading === entity.id}
                    onClick={() => handleExport(entity)}
                    icon={<Download className="h-3.5 w-3.5" />}
                  >
                    Export
                  </Button>
                </div>
              </div>

              {/* Date range for supported entities */}
              {entity.supportsDateRange && (
                <div className="mt-3 ml-13 flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">Date range:</span>
                  </div>
                  <input
                    type="date"
                    value={dateRanges[entity.id]?.from || ""}
                    onChange={(e) =>
                      handleDateChange(entity.id, "from", e.target.value)
                    }
                    className="h-8 px-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="From"
                  />
                  <span className="text-xs text-gray-400">to</span>
                  <input
                    type="date"
                    value={dateRanges[entity.id]?.to || ""}
                    onChange={(e) =>
                      handleDateChange(entity.id, "to", e.target.value)
                    }
                    className="h-8 px-2 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                    placeholder="To"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Full backup */}
      <Card padding="none">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary-50 border border-primary-200 flex items-center justify-center text-primary-700">
              <Archive className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                Full Data Backup
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Download all entities as a single ZIP file (Excel format)
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            loading={downloading === "all"}
            onClick={handleExportAll}
            icon={<Archive className="h-3.5 w-3.5" />}
          >
            Export All
          </Button>
        </div>
      </Card>
    </div>
  );
}
