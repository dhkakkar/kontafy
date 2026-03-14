"use client";

import React, { useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  ArrowLeft,
  ArrowRight,
  Loader2,
  FileUp,
  Trash2,
  CloudUpload,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

type ImportStep = "upload" | "preview" | "validate" | "import";
type EntityType = "contacts" | "products" | "opening_balances";
type MigrationSource = "tally" | "busy" | null;

interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: string;
}

interface ImportResult {
  success: boolean;
  total: number;
  imported: number;
  skipped: number;
  errors: ValidationError[];
}

interface ValidationResult {
  valid: boolean;
  total: number;
  errors: ValidationError[];
  preview: Record<string, string>[];
}

const entityOptions = [
  { value: "contacts", label: "Contacts" },
  { value: "products", label: "Products" },
  { value: "opening_balances", label: "Opening Balances" },
];

const templateTypes = [
  {
    type: "contacts" as EntityType,
    label: "Contacts Template",
    description: "Customer and vendor details",
  },
  {
    type: "products" as EntityType,
    label: "Products Template",
    description: "Product catalog with prices and HSN",
  },
  {
    type: "opening_balances" as EntityType,
    label: "Opening Balances Template",
    description: "Account opening balances",
  },
];

export default function DataImportPage() {
  const [step, setStep] = useState<ImportStep>("upload");
  const [entityType, setEntityType] = useState<EntityType>("contacts");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [migrationSource, setMigrationSource] =
    useState<MigrationSource>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

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

  // ─── Drag & Drop ──────────────────────────────────────────────

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // ─── API Actions ──────────────────────────────────────────────

  const handleValidate = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", entityType);

      const response = await fetch(`${API_BASE}/data-transfer/import/validate`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: "Validation failed" }));
        throw new Error(err.message);
      }

      const result: ValidationResult = await response.json();
      setValidationResult(result);
      setStep("validate");
    } catch (err: any) {
      console.error("Validation error:", err);
      setValidationResult({
        valid: false,
        total: 0,
        errors: [{ row: 0, field: "file", message: err.message || "Failed to validate file" }],
        preview: [],
      });
      setStep("validate");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setProgress(0);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 300);

    try {
      const formData = new FormData();
      formData.append("file", file);

      let endpoint: string;
      if (migrationSource === "tally") {
        endpoint = "/data-transfer/import/tally";
      } else if (migrationSource === "busy") {
        endpoint = "/data-transfer/import/busy";
      } else {
        endpoint = `/data-transfer/import/${entityType}`;
      }

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ message: "Import failed" }));
        throw new Error(err.message);
      }

      const result: ImportResult = await response.json();
      setImportResult(result);
      setProgress(100);
      setStep("import");
    } catch (err: any) {
      console.error("Import error:", err);
      setImportResult({
        success: false,
        total: 0,
        imported: 0,
        skipped: 0,
        errors: [{ row: 0, field: "file", message: err.message || "Import failed" }],
      });
      setStep("import");
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
    }
  };

  const handleMigrationImport = async (source: MigrationSource) => {
    setMigrationSource(source);
    // Reset for migration flow
    setFile(null);
    setValidationResult(null);
    setImportResult(null);
    setStep("upload");
  };

  const handleDownloadTemplate = async (type: EntityType) => {
    try {
      const response = await fetch(
        `${API_BASE}/data-transfer/import/template/${type}`,
        { headers: getAuthHeaders() }
      );
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}_template.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Template download failed:", err);
    }
  };

  const reset = () => {
    setStep("upload");
    setFile(null);
    setValidationResult(null);
    setImportResult(null);
    setMigrationSource(null);
    setProgress(0);
  };

  // ─── Step indicators ──────────────────────────────────────────

  const steps: { key: ImportStep; label: string }[] = [
    { key: "upload", label: "Upload" },
    { key: "preview", label: "Preview" },
    { key: "validate", label: "Validate" },
    { key: "import", label: "Import" },
  ];

  const stepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <React.Fragment key={s.key}>
            <div
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
                i <= stepIndex
                  ? "bg-primary-50 text-primary-800"
                  : "bg-gray-100 text-gray-500"
              )}
            >
              <span
                className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                  i < stepIndex
                    ? "bg-primary-800 text-white"
                    : i === stepIndex
                      ? "bg-primary-200 text-primary-800"
                      : "bg-gray-200 text-gray-500"
                )}
              >
                {i < stepIndex ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  i + 1
                )}
              </span>
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "h-px flex-1",
                  i < stepIndex ? "bg-primary-300" : "bg-gray-200"
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step: Upload */}
      {step === "upload" && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-gray-400" />
              <h3 className="text-base font-semibold text-gray-900">
                {migrationSource
                  ? `Migrate from ${migrationSource === "tally" ? "Tally" : "Busy"}`
                  : "Import Data"}
              </h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {migrationSource === "tally"
                ? "Upload your Tally XML export file. Go to Tally > Export > XML to generate it."
                : migrationSource === "busy"
                  ? "Upload your Busy CSV export file. Use Data > Export from Busy."
                  : "Upload a CSV or Excel file to import data into Kontafy."}
            </p>
          </div>

          <div className="p-4 space-y-4">
            {/* Entity type selector (not for migration) */}
            {!migrationSource && (
              <Select
                label="What are you importing?"
                options={entityOptions}
                value={entityType}
                onChange={(val) => setEntityType(val as EntityType)}
              />
            )}

            {/* File dropzone */}
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer",
                dragActive
                  ? "border-primary-400 bg-primary-50"
                  : file
                    ? "border-green-300 bg-green-50"
                    : "border-gray-300 bg-gray-50 hover:border-gray-400"
              )}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.xml"
                onChange={handleFileSelect}
                className="hidden"
              />

              {file ? (
                <div className="space-y-2">
                  <FileSpreadsheet className="h-10 w-10 text-green-500 mx-auto" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <CloudUpload className="h-10 w-10 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Drag and drop your file here
                    </p>
                    <p className="text-xs text-gray-500">
                      or click to browse. Supported: CSV, Excel (.xlsx)
                      {migrationSource === "tally" ? ", XML" : ""}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-2">
              {migrationSource && (
                <Button variant="ghost" size="sm" onClick={reset}>
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Back
                </Button>
              )}
              <div className="ml-auto">
                {migrationSource ? (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!file}
                    loading={loading}
                    onClick={handleImport}
                  >
                    Start Migration
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!file}
                    loading={loading}
                    onClick={() => {
                      // Move to preview by validating first
                      handleValidate();
                    }}
                  >
                    Next: Preview & Validate
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Step: Validate (combined preview + validation) */}
      {step === "validate" && validationResult && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              {validationResult.valid ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              <h3 className="text-base font-semibold text-gray-900">
                Validation Results
              </h3>
              <Badge
                variant={validationResult.valid ? "success" : "warning"}
              >
                {validationResult.total} rows found
              </Badge>
            </div>
          </div>

          {/* Data Preview */}
          {validationResult.preview.length > 0 && (
            <div className="border-b border-gray-200">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Preview (first 10 rows)
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-3 py-2 text-left font-medium text-gray-500">
                        #
                      </th>
                      {Object.keys(validationResult.preview[0]).map((key) => (
                        <th
                          key={key}
                          className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap"
                        >
                          {key
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {validationResult.preview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                        {Object.values(row).map((val, ci) => (
                          <td
                            key={ci}
                            className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[200px] truncate"
                          >
                            {val || "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {validationResult.errors.length > 0 && (
            <div className="p-4 border-b border-gray-200">
              <h4 className="text-sm font-medium text-red-700 mb-2">
                {validationResult.errors.length} validation error
                {validationResult.errors.length !== 1 ? "s" : ""} found:
              </h4>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {validationResult.errors.map((err, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 text-xs bg-red-50 px-3 py-2 rounded-lg"
                  >
                    <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium text-red-700">
                        Row {err.row}, {err.field}:
                      </span>{" "}
                      <span className="text-red-600">{err.message}</span>
                      {err.value && (
                        <span className="text-red-400 ml-1">
                          (value: {err.value})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {validationResult.valid && validationResult.errors.length === 0 && (
            <div className="p-4 border-b border-gray-200 bg-green-50">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <p className="text-sm text-green-700">
                  All {validationResult.total} rows passed validation and are
                  ready to import.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-4 flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => setStep("upload")}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Back
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!validationResult.valid}
              loading={loading}
              onClick={handleImport}
            >
              Import {validationResult.total} Records
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step: Import Results */}
      {step === "import" && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              {importResult?.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              )}
              <h3 className="text-base font-semibold text-gray-900">
                Import {importResult?.success ? "Complete" : "Finished with Issues"}
              </h3>
            </div>
          </div>

          {/* Progress bar */}
          <div className="px-4 pt-4">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  importResult?.success ? "bg-green-500" : "bg-amber-500"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {importResult && (
            <div className="p-4 space-y-4">
              {/* Summary stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {importResult.total}
                  </p>
                  <p className="text-xs text-gray-500">Total Records</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">
                    {importResult.imported}
                  </p>
                  <p className="text-xs text-green-600">Imported</p>
                </div>
                <div
                  className={cn(
                    "rounded-lg p-3 text-center",
                    importResult.skipped > 0 ? "bg-amber-50" : "bg-gray-50"
                  )}
                >
                  <p
                    className={cn(
                      "text-2xl font-bold",
                      importResult.skipped > 0
                        ? "text-amber-700"
                        : "text-gray-400"
                    )}
                  >
                    {importResult.skipped}
                  </p>
                  <p
                    className={cn(
                      "text-xs",
                      importResult.skipped > 0
                        ? "text-amber-600"
                        : "text-gray-400"
                    )}
                  >
                    Skipped
                  </p>
                </div>
              </div>

              {/* Errors */}
              {importResult.errors.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {importResult.errors.map((err, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 text-xs bg-red-50 px-3 py-2 rounded-lg"
                    >
                      <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                      <span className="text-red-600">
                        Row {err.row}: {err.message}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Done action */}
              <div className="flex justify-end pt-2">
                <Button variant="primary" size="sm" onClick={reset}>
                  Import More Data
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Template Downloads */}
      {step === "upload" && !migrationSource && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-gray-400" />
              <h3 className="text-base font-semibold text-gray-900">
                Download Templates
              </h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Use these Excel templates to format your data correctly before
              importing.
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {templateTypes.map((tmpl) => (
              <div
                key={tmpl.type}
                className="p-4 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    {tmpl.label}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {tmpl.description}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadTemplate(tmpl.type)}
                  icon={<Download className="h-3.5 w-3.5" />}
                >
                  Download
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Migration Section */}
      {step === "upload" && !migrationSource && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900">
              Migrate from Other Software
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Import your existing data from Tally or Busy accounting software.
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {/* Tally */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                  <span className="text-blue-700 font-bold text-xs">
                    Tally
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    Migrate from Tally
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Import ledgers, parties, and stock items from Tally XML
                    export
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleMigrationImport("tally")}
                icon={<FileUp className="h-3.5 w-3.5" />}
              >
                Start Migration
              </Button>
            </div>

            {/* Busy */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center">
                  <span className="text-orange-700 font-bold text-xs">
                    Busy
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">
                    Migrate from Busy
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Import accounts, contacts, and balances from Busy CSV export
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleMigrationImport("busy")}
                icon={<FileUp className="h-3.5 w-3.5" />}
              >
                Start Migration
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
