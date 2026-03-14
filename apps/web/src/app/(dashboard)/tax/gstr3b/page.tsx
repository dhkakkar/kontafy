"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Calculator,
  Save,
  CheckCircle,
  FileText,
  History,
  AlertTriangle,
  Edit3,
} from "lucide-react";
import dayjs from "dayjs";

// ── Types ──────────────────────────────────────────────────────

interface Table31Row {
  nature: string;
  taxable_amount: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
}

interface Table32Row {
  place_of_supply: string;
  taxable_amount: number;
  igst: number;
}

interface Table4Row {
  description: string;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
}

interface Table5Row {
  nature: string;
  inter_state: number;
  intra_state: number;
}

interface Table6Row {
  description: string;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
}

interface RateWiseSummary {
  rate: number;
  taxable_amount: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  total_tax: number;
}

interface GSTR3BFullData {
  period: string;
  gstin: string | null;
  table_3_1: Table31Row[];
  table_3_2: Table32Row[];
  table_4: Table4Row[];
  table_5: Table5Row[];
  table_6: Table6Row[];
  interest: { igst: number; cgst: number; sgst: number; cess: number };
  late_fee: { cgst: number; sgst: number };
  rate_wise_outward: RateWiseSummary[];
  rate_wise_inward: RateWiseSummary[];
}

interface GstReturnRecord {
  id: string;
  return_type: string;
  period: string;
  status: string;
  data: any;
  filed_at: string | null;
  arn: string | null;
  created_at: string;
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

const statusBadgeMap: Record<
  string,
  { variant: "default" | "warning" | "success" | "info"; label: string }
> = {
  draft: { variant: "default", label: "Draft" },
  computed: { variant: "warning", label: "Computed" },
  filed: { variant: "success", label: "Filed" },
};

// ── Main Page Component ────────────────────────────────────────

export default function GSTR3BPage() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState(
    dayjs().subtract(1, "month").format("MMYYYY")
  );
  const [computedData, setComputedData] = useState<GSTR3BFullData | null>(null);
  const [editedData, setEditedData] = useState<GSTR3BFullData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const monthOptions = getMonthOptions();

  // The data to display (edited or computed)
  const displayData = editedData || computedData;

  // Compute GSTR-3B
  const computeMutation = useMutation({
    mutationFn: () =>
      api.get<GSTR3BFullData>("/tax/gst/returns/gstr3b/compute", {
        period,
      }),
    onSuccess: (data) => {
      setComputedData(data);
      setEditedData(null);
      setSaveSuccess(false);
      setIsEditing(false);
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (status: string) =>
      api.post("/tax/gst/returns/gstr3b/save", {
        period,
        data: displayData,
        status,
      }),
    onSuccess: () => {
      setSaveSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["gstr3b-history"] });
    },
  });

  // History query
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["gstr3b-history"],
    queryFn: () =>
      api.get<{ data: GstReturnRecord[] }>("/tax/gst/returns/gstr3b/history"),
    enabled: showHistory,
  });

  // Edit handler for table values
  const handleEditValue = (
    table: string,
    rowIndex: number,
    field: string,
    value: number
  ) => {
    if (!displayData) return;
    const updated = JSON.parse(JSON.stringify(displayData)) as GSTR3BFullData;

    if (table === "table_3_1") {
      (updated.table_3_1[rowIndex] as any)[field] = value;
    } else if (table === "table_4") {
      (updated.table_4[rowIndex] as any)[field] = value;
    } else if (table === "table_6") {
      (updated.table_6[rowIndex] as any)[field] = value;
    }

    setEditedData(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/tax">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">GSTR-3B</h1>
            <p className="text-sm text-gray-500 mt-1">
              Monthly summary return - auto-computed from your invoices
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={<History className="h-4 w-4" />}
          onClick={() => setShowHistory(!showHistory)}
        >
          {showHistory ? "Hide History" : "Filing History"}
        </Button>
      </div>

      {/* History Panel */}
      {showHistory && (
        <Card padding="none">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">
              GSTR-3B Filing History
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {historyLoading ? (
              <div className="p-6 text-center text-sm text-gray-500">
                Loading history...
              </div>
            ) : !historyData?.data?.length ? (
              <div className="p-6 text-center text-sm text-gray-500">
                No GSTR-3B returns found
              </div>
            ) : (
              historyData.data.map((ret) => {
                const badge =
                  statusBadgeMap[ret.status] || statusBadgeMap.draft;
                return (
                  <div
                    key={ret.id}
                    className="flex items-center justify-between px-6 py-3"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Period: {ret.period}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Created {formatDate(ret.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={badge.variant} dot>
                        {badge.label}
                      </Badge>
                      {ret.arn && (
                        <span className="text-xs font-mono text-gray-500">
                          ARN: {ret.arn}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      )}

      {/* Period Selector + Compute */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Select
            label="Tax Period"
            options={monthOptions}
            value={period}
            onChange={(val) => {
              setPeriod(val);
              setComputedData(null);
              setEditedData(null);
              setSaveSuccess(false);
              setIsEditing(false);
            }}
          />
          <div className="md:col-span-2 flex items-center gap-3">
            <Button
              icon={<Calculator className="h-4 w-4" />}
              onClick={() => computeMutation.mutate()}
              loading={computeMutation.isPending}
              className="h-10"
            >
              Compute GSTR-3B
            </Button>
            {displayData && (
              <Button
                variant="outline"
                icon={<Edit3 className="h-4 w-4" />}
                onClick={() => setIsEditing(!isEditing)}
                className="h-10"
              >
                {isEditing ? "Lock Editing" : "Edit Values"}
              </Button>
            )}
          </div>
        </div>

        {computeMutation.isError && (
          <div className="mt-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700">
            {(computeMutation.error as Error).message ||
              "Failed to compute GSTR-3B"}
          </div>
        )}
      </Card>

      {/* GSTR-3B Tables */}
      {displayData && (
        <>
          {/* GSTIN + Period Header */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">GSTIN</p>
                <p className="text-lg font-mono font-semibold text-gray-900">
                  {displayData.gstin || "Not Set"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Return Period</p>
                <p className="text-lg font-semibold text-gray-900">
                  {displayData.period}
                </p>
              </div>
            </div>
          </Card>

          {/* Table 3.1 - Outward Supplies */}
          <Card padding="none">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">
                3.1 - Details of Outward Supplies and Inward Supplies Liable to
                Reverse Charge
              </h3>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="h-11 px-4 text-left font-medium text-gray-500 bg-gray-50 min-w-[250px]">
                      Nature of Supplies
                    </th>
                    <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">
                      Taxable Value
                    </th>
                    <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">
                      IGST
                    </th>
                    <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">
                      CGST
                    </th>
                    <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">
                      SGST
                    </th>
                    <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">
                      Cess
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayData.table_3_1.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="h-12 px-4 text-gray-900 text-xs">
                        {row.nature}
                      </td>
                      {(
                        [
                          "taxable_amount",
                          "igst",
                          "cgst",
                          "sgst",
                          "cess",
                        ] as const
                      ).map((field) => (
                        <td
                          key={field}
                          className="h-12 px-4 text-right text-gray-700"
                        >
                          {isEditing ? (
                            <EditableCell
                              value={row[field]}
                              onChange={(v) =>
                                handleEditValue("table_3_1", idx, field, v)
                              }
                            />
                          ) : (
                            formatCurrency(row[field])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Table 3.2 - Inter-state supplies to unregistered */}
          {displayData.table_3_2.length > 0 && (
            <Card padding="none">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900">
                  3.2 - Inter-State Supplies to Unregistered Persons
                </h3>
              </div>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="h-11 px-4 text-left font-medium text-gray-500 bg-gray-50">
                        Place of Supply
                      </th>
                      <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">
                        Taxable Value
                      </th>
                      <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">
                        IGST
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayData.table_3_2.map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-100">
                        <td className="h-12 px-4 text-gray-900">
                          {row.place_of_supply}
                        </td>
                        <td className="h-12 px-4 text-right text-gray-700">
                          {formatCurrency(row.taxable_amount)}
                        </td>
                        <td className="h-12 px-4 text-right text-gray-700">
                          {formatCurrency(row.igst)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Table 4 - Eligible ITC */}
          <Card padding="none">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">
                4 - Eligible ITC
              </h3>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="h-11 px-4 text-left font-medium text-gray-500 bg-gray-50 min-w-[250px]">
                      Details
                    </th>
                    <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">
                      IGST
                    </th>
                    <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">
                      CGST
                    </th>
                    <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">
                      SGST
                    </th>
                    <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">
                      Cess
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayData.table_4.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="h-12 px-4 text-gray-900 text-xs">
                        {row.description}
                      </td>
                      {(["igst", "cgst", "sgst", "cess"] as const).map(
                        (field) => (
                          <td
                            key={field}
                            className="h-12 px-4 text-right text-success-700"
                          >
                            {isEditing ? (
                              <EditableCell
                                value={row[field]}
                                onChange={(v) =>
                                  handleEditValue("table_4", idx, field, v)
                                }
                              />
                            ) : (
                              formatCurrency(row[field])
                            )}
                          </td>
                        )
                      )}
                    </tr>
                  ))}
                  {/* Total ITC row */}
                  <tr className="bg-success-50 font-semibold">
                    <td className="h-12 px-4 text-gray-900">Total ITC</td>
                    {(["igst", "cgst", "sgst", "cess"] as const).map(
                      (field) => (
                        <td
                          key={field}
                          className="h-12 px-4 text-right text-success-700"
                        >
                          {formatCurrency(
                            displayData.table_4.reduce(
                              (sum, r) => sum + r[field],
                              0
                            )
                          )}
                        </td>
                      )
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* Table 5 - Exempt supplies */}
          <Card padding="none">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-900">
                5 - Values of Exempt, Nil-Rated and Non-GST Inward Supplies
              </h3>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="h-11 px-4 text-left font-medium text-gray-500 bg-gray-50 min-w-[300px]">
                      Nature of Supplies
                    </th>
                    <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">
                      Inter-State
                    </th>
                    <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">
                      Intra-State
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayData.table_5.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="h-12 px-4 text-gray-900 text-xs">
                        {row.nature}
                      </td>
                      <td className="h-12 px-4 text-right text-gray-700">
                        {formatCurrency(row.inter_state)}
                      </td>
                      <td className="h-12 px-4 text-right text-gray-700">
                        {formatCurrency(row.intra_state)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Table 6 - Payment of Tax */}
          <Card padding="none">
            <div className="p-4 border-b border-gray-200 bg-primary-50">
              <h3 className="text-sm font-semibold text-primary-900">
                6 - Payment of Tax
              </h3>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="h-11 px-4 text-left font-medium text-gray-500 bg-gray-50 min-w-[200px]">
                      Description
                    </th>
                    <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">
                      IGST
                    </th>
                    <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">
                      CGST
                    </th>
                    <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">
                      SGST
                    </th>
                    <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">
                      Cess
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {displayData.table_6.map((row, idx) => (
                    <tr
                      key={idx}
                      className={`border-b border-gray-100 ${idx === 2 ? "bg-primary-50 font-semibold" : ""}`}
                    >
                      <td className="h-12 px-4 text-gray-900">
                        {row.description}
                      </td>
                      {(["igst", "cgst", "sgst", "cess"] as const).map(
                        (field) => (
                          <td
                            key={field}
                            className={`h-12 px-4 text-right ${
                              idx === 1
                                ? "text-success-700"
                                : idx === 2
                                  ? "text-primary-800"
                                  : "text-gray-700"
                            }`}
                          >
                            {isEditing && idx === 0 ? (
                              <EditableCell
                                value={row[field]}
                                onChange={(v) =>
                                  handleEditValue("table_6", idx, field, v)
                                }
                              />
                            ) : (
                              formatCurrency(row[field])
                            )}
                          </td>
                        )
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Interest & Late Fee */}
          {(displayData.interest.igst > 0 ||
            displayData.interest.cgst > 0 ||
            displayData.late_fee.cgst > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning-500" />
                  Interest & Late Fee
                </CardTitle>
              </CardHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Interest (18% p.a.)
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {(["igst", "cgst", "sgst", "cess"] as const).map(
                      (field) => (
                        <div key={field} className="p-2 bg-warning-50 rounded">
                          <p className="text-xs text-gray-500 uppercase">
                            {field}
                          </p>
                          <p className="text-sm font-medium text-warning-700">
                            {formatCurrency(displayData.interest[field])}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Late Fee
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-warning-50 rounded">
                      <p className="text-xs text-gray-500 uppercase">CGST</p>
                      <p className="text-sm font-medium text-warning-700">
                        {formatCurrency(displayData.late_fee.cgst)}
                      </p>
                    </div>
                    <div className="p-2 bg-warning-50 rounded">
                      <p className="text-xs text-gray-500 uppercase">SGST</p>
                      <p className="text-sm font-medium text-warning-700">
                        {formatCurrency(displayData.late_fee.sgst)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Save / Mark as Filed */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                {saveSuccess ? (
                  <div className="flex items-center gap-2 text-success-700">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">
                      GSTR-3B saved successfully
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Save this computed return as a draft or mark it as filed on
                    the GST portal.
                  </p>
                )}
                {editedData && (
                  <p className="text-xs text-warning-600 mt-1 flex items-center gap-1">
                    <Edit3 className="h-3 w-3" />
                    Values have been manually edited
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  icon={<Save className="h-4 w-4" />}
                  onClick={() => saveMutation.mutate("draft")}
                  loading={saveMutation.isPending}
                  disabled={saveSuccess}
                >
                  Save Draft
                </Button>
                <Button
                  variant="outline"
                  icon={<FileText className="h-4 w-4" />}
                  onClick={() => saveMutation.mutate("computed")}
                  loading={saveMutation.isPending}
                  disabled={saveSuccess}
                >
                  Finalize
                </Button>
                <Button
                  icon={<CheckCircle className="h-4 w-4" />}
                  onClick={() => saveMutation.mutate("filed")}
                  loading={saveMutation.isPending}
                  disabled={saveSuccess}
                >
                  Mark as Filed
                </Button>
              </div>
            </div>
            {saveMutation.isError && (
              <div className="mt-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700">
                {(saveMutation.error as Error).message ||
                  "Failed to save return"}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

// ── Editable Cell Component ────────────────────────────────────

function EditableCell({
  value,
  onChange,
}: {
  value: number;
  onChange: (val: number) => void;
}) {
  const [localValue, setLocalValue] = useState(String(value));

  return (
    <input
      type="number"
      step="0.01"
      className="w-24 h-8 rounded border border-primary-300 bg-primary-50 px-2 text-sm text-right text-gray-900 focus:outline-none focus:ring-1 focus:ring-primary-500"
      value={localValue}
      onChange={(e) => {
        setLocalValue(e.target.value);
        const num = parseFloat(e.target.value);
        if (!isNaN(num)) onChange(num);
      }}
      onBlur={() => {
        const num = parseFloat(localValue);
        if (isNaN(num)) {
          setLocalValue(String(value));
        }
      }}
    />
  );
}
