"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  Download,
  ClipboardCopy,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  FileJson,
  Search,
  Info,
} from "lucide-react";
import dayjs from "dayjs";

// ── Types ──────────────────────────────────────────────────────

interface ValidationIssue {
  severity: "error" | "warning";
  section: string;
  invoice_number?: string;
  field: string;
  message: string;
}

interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    b2b_count: number;
    b2cs_count: number;
    cdn_count: number;
    hsn_count: number;
  };
}

interface GSTR1JsonExport {
  gstin: string;
  fp: string;
  b2b?: Array<{ ctin: string; inv: any[] }>;
  b2cs?: any[];
  b2cl?: any[];
  cdnr?: Array<{ ctin: string; nt: any[] }>;
  cdnur?: any[];
  hsn: { data: any[] };
  doc_issue?: any;
}

// ── Helpers ────────────────────────────────────────────────────

function getMonthOptions() {
  const options = [];
  for (let i = 0; i < 24; i++) {
    const d = dayjs().subtract(i, "month");
    options.push({
      value: d.format("MMYYYY"),
      label: d.format("MMMM YYYY"),
    });
  }
  return options;
}

// ── Main Page Component ────────────────────────────────────────

export default function GSTR1ExportPage() {
  const [period, setPeriod] = useState(
    dayjs().subtract(1, "month").format("MMYYYY")
  );
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [exportData, setExportData] = useState<GSTR1JsonExport | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const monthOptions = getMonthOptions();

  // Validate mutation
  const validateMutation = useMutation({
    mutationFn: () =>
      api.get<ValidationResult>("/tax/gst/returns/gstr1/validate", {
        period,
      }),
    onSuccess: (data) => {
      setValidationResult(data);
      setExportData(null);
      setCopySuccess(false);
    },
  });

  // Export mutation (fetches the JSON data)
  const exportMutation = useMutation({
    mutationFn: () =>
      api.get<GSTR1JsonExport>("/tax/gst/returns/gstr1/export", {
        period,
        format: "json",
      }),
    onSuccess: (data) => {
      setExportData(data);
      setCopySuccess(false);
    },
  });

  // Download JSON file
  const handleDownload = () => {
    if (!exportData) return;
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GSTR1_${exportData.gstin}_${exportData.fp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy to clipboard
  const handleCopy = async () => {
    if (!exportData) return;
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(exportData, null, 2)
      );
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = JSON.stringify(exportData, null, 2);
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    }
  };

  // Count summary
  const b2bInvoiceCount = exportData?.b2b?.reduce((sum, g) => sum + g.inv.length, 0) || 0;
  const b2csCount = exportData?.b2cs?.length || 0;
  const b2clCount = exportData?.b2cl?.reduce((sum: number, g: any) => sum + g.inv.length, 0) || 0;
  const cdnrCount = exportData?.cdnr?.reduce((sum, g) => sum + g.nt.length, 0) || 0;
  const cdnurCount = exportData?.cdnur?.length || 0;
  const hsnCount = exportData?.hsn?.data?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/tax">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            GSTR-1 JSON Export
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Export GSTR-1 in GST portal format for upload
          </p>
        </div>
      </div>

      {/* Period Selector + Actions */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <Select
            label="Tax Period"
            options={monthOptions}
            value={period}
            onChange={(val) => {
              setPeriod(val);
              setValidationResult(null);
              setExportData(null);
              setCopySuccess(false);
            }}
          />
          <Button
            variant="outline"
            icon={<Search className="h-4 w-4" />}
            onClick={() => validateMutation.mutate()}
            loading={validateMutation.isPending}
            className="h-10"
          >
            Validate
          </Button>
          <Button
            icon={<FileJson className="h-4 w-4" />}
            onClick={() => exportMutation.mutate()}
            loading={exportMutation.isPending}
            className="h-10"
            disabled={
              validationResult !== null &&
              validationResult.summary.errors > 0
            }
          >
            Generate JSON
          </Button>
          <div />
        </div>

        {validateMutation.isError && (
          <div className="mt-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700">
            {(validateMutation.error as Error).message ||
              "Validation failed"}
          </div>
        )}
        {exportMutation.isError && (
          <div className="mt-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700">
            {(exportMutation.error as Error).message || "Export failed"}
          </div>
        )}
      </Card>

      {/* Validation Report */}
      {validationResult && (
        <Card padding="none">
          <div
            className={`p-4 border-b ${validationResult.valid ? "bg-success-50 border-success-200" : "bg-warning-50 border-warning-200"}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {validationResult.valid ? (
                  <CheckCircle className="h-5 w-5 text-success-600" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-warning-600" />
                )}
                <h3
                  className={`text-sm font-semibold ${validationResult.valid ? "text-success-800" : "text-warning-800"}`}
                >
                  {validationResult.valid
                    ? "Validation Passed - Ready for Export"
                    : "Issues Found - Please Review"}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                {validationResult.summary.errors > 0 && (
                  <Badge variant="default">
                    {validationResult.summary.errors} Error
                    {validationResult.summary.errors !== 1 ? "s" : ""}
                  </Badge>
                )}
                {validationResult.summary.warnings > 0 && (
                  <Badge variant="warning">
                    {validationResult.summary.warnings} Warning
                    {validationResult.summary.warnings !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Summary counts */}
          <div className="p-4 border-b border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase">B2B Invoices</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {validationResult.summary.b2b_count}
                </p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase">
                  B2C Invoices
                </p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {validationResult.summary.b2cs_count}
                </p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase">
                  Credit/Debit Notes
                </p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {validationResult.summary.cdn_count}
                </p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase">
                  HSN Codes
                </p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {validationResult.summary.hsn_count}
                </p>
              </div>
            </div>
          </div>

          {/* Issues list */}
          {validationResult.issues.length > 0 && (
            <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
              {validationResult.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 px-4 py-3"
                >
                  {issue.severity === "error" ? (
                    <AlertCircle className="h-4 w-4 text-danger-500 mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-warning-500 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{issue.message}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline">{issue.section}</Badge>
                      {issue.invoice_number && (
                        <span className="text-xs text-gray-500 font-mono">
                          #{issue.invoice_number}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Export Preview & Download */}
      {exportData && (
        <>
          {/* Preview Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Export Summary</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <SectionCountCard
                label="B2B"
                description="Registered"
                count={b2bInvoiceCount}
              />
              <SectionCountCard
                label="B2CS"
                description="Small"
                count={b2csCount}
              />
              <SectionCountCard
                label="B2CL"
                description="Large"
                count={b2clCount}
              />
              <SectionCountCard
                label="CDNR"
                description="Registered"
                count={cdnrCount}
              />
              <SectionCountCard
                label="CDNUR"
                description="Unregistered"
                count={cdnurCount}
              />
              <SectionCountCard
                label="HSN"
                description="Summary"
                count={hsnCount}
              />
            </div>
          </Card>

          {/* Download Actions */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  GSTR1_{exportData.gstin}_{exportData.fp}.json
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  GSTIN: {exportData.gstin} | Period: {exportData.fp}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  icon={
                    copySuccess ? (
                      <CheckCircle className="h-4 w-4 text-success-600" />
                    ) : (
                      <ClipboardCopy className="h-4 w-4" />
                    )
                  }
                  onClick={handleCopy}
                >
                  {copySuccess ? "Copied!" : "Copy to Clipboard"}
                </Button>
                <Button
                  icon={<Download className="h-4 w-4" />}
                  onClick={handleDownload}
                >
                  Download JSON
                </Button>
              </div>
            </div>
          </Card>

          {/* JSON Preview */}
          <Card padding="none">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">
                JSON Preview
              </h3>
            </div>
            <div className="p-4 max-h-96 overflow-auto">
              <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(exportData, null, 2)}
              </pre>
            </div>
          </Card>

          {/* Upload Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-4 w-4 text-primary-600" />
                How to Upload to GST Portal
              </CardTitle>
            </CardHeader>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>
                Log in to{" "}
                <a
                  href="https://www.gst.gov.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 underline"
                >
                  www.gst.gov.in
                </a>{" "}
                with your credentials.
              </li>
              <li>
                Navigate to <strong>Services &gt; Returns &gt; Returns Dashboard</strong>.
              </li>
              <li>
                Select the return period ({exportData.fp.substring(0, 2)}/
                {exportData.fp.substring(2)}) and click{" "}
                <strong>PREPARE OFFLINE</strong>.
              </li>
              <li>
                Go to the <strong>Upload</strong> tab.
              </li>
              <li>
                Click <strong>Choose File</strong> and select the downloaded
                JSON file.
              </li>
              <li>
                Click <strong>Upload</strong>. The portal will process the file
                and show a status.
              </li>
              <li>
                Once processed, review each section (B2B, B2CS, etc.) on the
                portal for accuracy.
              </li>
              <li>
                Submit and file with DSC or EVC after verification.
              </li>
            </ol>
          </Card>
        </>
      )}
    </div>
  );
}

// ── Section Count Card ─────────────────────────────────────────

function SectionCountCard({
  label,
  description,
  count,
}: {
  label: string;
  description: string;
  count: number;
}) {
  return (
    <div className="text-center p-3 border border-gray-200 rounded-lg">
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
      <p className="text-xs text-gray-400">{description}</p>
    </div>
  );
}
