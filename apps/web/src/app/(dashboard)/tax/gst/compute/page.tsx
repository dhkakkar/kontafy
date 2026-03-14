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
  Calculator,
  Save,
  CheckCircle,
  FileText,
} from "lucide-react";
import dayjs from "dayjs";

interface GSTR1Data {
  b2b: Array<{
    gstin: string;
    contact_name: string;
    invoice_number: string;
    invoice_date: string;
    taxable_amount: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    total_tax: number;
    invoice_total: number;
    place_of_supply: string | null;
  }>;
  b2c: {
    taxable_amount: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    total_tax: number;
    rate_wise: Array<{
      rate: number;
      taxable_amount: number;
      cgst: number;
      sgst: number;
      igst: number;
      cess: number;
      total_tax: number;
    }>;
  };
  summary: {
    total_invoices: number;
    total_taxable_amount: number;
    total_cgst: number;
    total_sgst: number;
    total_igst: number;
    total_cess: number;
    total_tax: number;
    total_value: number;
  };
}

interface GSTR3BData {
  outward_supplies: {
    taxable_amount: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    total_tax: number;
  };
  inward_supplies_itc: {
    taxable_amount: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    total_tax: number;
  };
  net_tax_payable: {
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    total: number;
  };
  rate_wise_outward: Array<{
    rate: number;
    taxable_amount: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    total_tax: number;
  }>;
  rate_wise_inward: Array<{
    rate: number;
    taxable_amount: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
    total_tax: number;
  }>;
}

// Generate month options for the last 12 months
function getMonthOptions() {
  const options = [];
  for (let i = 0; i < 12; i++) {
    const d = dayjs().subtract(i, "month");
    options.push({
      value: d.format("YYYY-MM"),
      label: d.format("MMMM YYYY"),
    });
  }
  return options;
}

const returnTypeOptions = [
  { value: "GSTR1", label: "GSTR-1 (Outward Supplies)" },
  { value: "GSTR3B", label: "GSTR-3B (Summary Return)" },
];

export default function GstComputePage() {
  const [returnType, setReturnType] = useState("GSTR3B");
  const [period, setPeriod] = useState(dayjs().subtract(1, "month").format("YYYY-MM"));
  const [computedData, setComputedData] = useState<GSTR1Data | GSTR3BData | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const monthOptions = getMonthOptions();

  // Compute mutation
  const computeMutation = useMutation({
    mutationFn: () => {
      const fromDate = dayjs(period).startOf("month").format("YYYY-MM-DD");
      const toDate = dayjs(period).endOf("month").format("YYYY-MM-DD");
      return api.post<GSTR1Data | GSTR3BData>("/tax/gst/returns/compute", {
        return_type: returnType,
        from_date: fromDate,
        to_date: toDate,
      });
    },
    onSuccess: (data) => {
      setComputedData(data);
      setSaveSuccess(false);
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (status: string) =>
      api.post("/tax/gst/returns", {
        return_type: returnType,
        period,
        data: computedData,
        status,
      }),
    onSuccess: () => {
      setSaveSuccess(true);
    },
  });

  const isGstr1 = returnType === "GSTR1";
  const gstr1Data = computedData as GSTR1Data | null;
  const gstr3bData = computedData as GSTR3BData | null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/tax/gst">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Compute GST Return
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Auto-compute your GST return from invoices
          </p>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Select
            label="Return Type"
            options={returnTypeOptions}
            value={returnType}
            onChange={(val) => {
              setReturnType(val);
              setComputedData(null);
              setSaveSuccess(false);
            }}
          />
          <Select
            label="Period"
            options={monthOptions}
            value={period}
            onChange={(val) => {
              setPeriod(val);
              setComputedData(null);
              setSaveSuccess(false);
            }}
          />
          <Button
            icon={<Calculator className="h-4 w-4" />}
            onClick={() => computeMutation.mutate()}
            loading={computeMutation.isPending}
            className="h-10"
          >
            Compute
          </Button>
        </div>

        {computeMutation.isError && (
          <div className="mt-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700">
            {(computeMutation.error as Error).message || "Failed to compute return"}
          </div>
        )}
      </Card>

      {/* Results */}
      {computedData && !isGstr1 && gstr3bData && (
        <GSTR3BResults data={gstr3bData} />
      )}
      {computedData && isGstr1 && gstr1Data && (
        <GSTR1Results data={gstr1Data} />
      )}

      {/* Save/Finalize Buttons */}
      {computedData && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              {saveSuccess ? (
                <div className="flex items-center gap-2 text-success-700">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Return saved successfully</span>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Save this computed return as a draft or finalize it.
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
                icon={<FileText className="h-4 w-4" />}
                onClick={() => saveMutation.mutate("computed")}
                loading={saveMutation.isPending}
                disabled={saveSuccess}
              >
                Finalize
              </Button>
            </div>
          </div>
          {saveMutation.isError && (
            <div className="mt-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-sm text-danger-700">
              {(saveMutation.error as Error).message || "Failed to save return"}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ── GSTR-3B Results Component ──────────────────────────────────

function GSTR3BResults({ data }: { data: GSTR3BData }) {
  return (
    <div className="space-y-6">
      {/* Net Payable Summary */}
      <Card>
        <CardHeader>
          <CardTitle>GSTR-3B Summary - Net Tax Payable</CardTitle>
        </CardHeader>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="h-11 px-4 text-left font-medium text-gray-500 bg-gray-50">Component</th>
                <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">Output Tax</th>
                <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">Input Tax Credit</th>
                <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">Net Payable</th>
              </tr>
            </thead>
            <tbody>
              {(["cgst", "sgst", "igst", "cess"] as const).map((key) => (
                <tr key={key} className="border-b border-gray-100">
                  <td className="h-12 px-4 font-medium text-gray-900 uppercase">{key}</td>
                  <td className="h-12 px-4 text-right text-gray-700">
                    {formatCurrency(data.outward_supplies[key])}
                  </td>
                  <td className="h-12 px-4 text-right text-success-700">
                    {formatCurrency(data.inward_supplies_itc[key])}
                  </td>
                  <td className="h-12 px-4 text-right font-semibold text-gray-900">
                    {formatCurrency(data.net_tax_payable[key])}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="h-12 px-4 text-gray-900">Total</td>
                <td className="h-12 px-4 text-right text-gray-900">
                  {formatCurrency(data.outward_supplies.total_tax)}
                </td>
                <td className="h-12 px-4 text-right text-success-700">
                  {formatCurrency(data.inward_supplies_itc.total_tax)}
                </td>
                <td className="h-12 px-4 text-right text-primary-800">
                  {formatCurrency(data.net_tax_payable.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Outward Supplies Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>3.1 - Outward Supplies (Rate-wise)</CardTitle>
          </CardHeader>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="h-11 px-4 text-left font-medium text-gray-500 bg-gray-50">Rate</th>
                  <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">Taxable Value</th>
                  <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">Tax</th>
                </tr>
              </thead>
              <tbody>
                {data.rate_wise_outward.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="h-16 text-center text-gray-500">
                      No outward supplies
                    </td>
                  </tr>
                ) : (
                  data.rate_wise_outward.map((r) => (
                    <tr key={r.rate} className="border-b border-gray-100">
                      <td className="h-12 px-4 text-gray-900">
                        <Badge variant="outline">{r.rate}%</Badge>
                      </td>
                      <td className="h-12 px-4 text-right text-gray-700">
                        {formatCurrency(r.taxable_amount)}
                      </td>
                      <td className="h-12 px-4 text-right text-gray-700">
                        {formatCurrency(r.total_tax)}
                      </td>
                    </tr>
                  ))
                )}
                <tr className="bg-gray-50 font-semibold">
                  <td className="h-12 px-4 text-gray-900">Total</td>
                  <td className="h-12 px-4 text-right text-gray-900">
                    {formatCurrency(data.outward_supplies.taxable_amount)}
                  </td>
                  <td className="h-12 px-4 text-right text-gray-900">
                    {formatCurrency(data.outward_supplies.total_tax)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>4 - Input Tax Credit (Rate-wise)</CardTitle>
          </CardHeader>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="h-11 px-4 text-left font-medium text-gray-500 bg-gray-50">Rate</th>
                  <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">Taxable Value</th>
                  <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">ITC</th>
                </tr>
              </thead>
              <tbody>
                {data.rate_wise_inward.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="h-16 text-center text-gray-500">
                      No input tax credit
                    </td>
                  </tr>
                ) : (
                  data.rate_wise_inward.map((r) => (
                    <tr key={r.rate} className="border-b border-gray-100">
                      <td className="h-12 px-4 text-gray-900">
                        <Badge variant="outline">{r.rate}%</Badge>
                      </td>
                      <td className="h-12 px-4 text-right text-gray-700">
                        {formatCurrency(r.taxable_amount)}
                      </td>
                      <td className="h-12 px-4 text-right text-success-700">
                        {formatCurrency(r.total_tax)}
                      </td>
                    </tr>
                  ))
                )}
                <tr className="bg-gray-50 font-semibold">
                  <td className="h-12 px-4 text-gray-900">Total</td>
                  <td className="h-12 px-4 text-right text-gray-900">
                    {formatCurrency(data.inward_supplies_itc.taxable_amount)}
                  </td>
                  <td className="h-12 px-4 text-right text-success-700">
                    {formatCurrency(data.inward_supplies_itc.total_tax)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── GSTR-1 Results Component ───────────────────────────────────

function GSTR1Results({ data }: { data: GSTR1Data }) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-gray-500">Total Invoices</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {data.summary.total_invoices}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Taxable Value</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(data.summary.total_taxable_amount)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Total Tax</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatCurrency(data.summary.total_tax)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Total Value</p>
          <p className="text-2xl font-bold text-primary-800 mt-1">
            {formatCurrency(data.summary.total_value)}
          </p>
        </Card>
      </div>

      {/* Tax Breakup */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Breakup</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase">CGST</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {formatCurrency(data.summary.total_cgst)}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase">SGST</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {formatCurrency(data.summary.total_sgst)}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase">IGST</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {formatCurrency(data.summary.total_igst)}
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 uppercase">Cess</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">
              {formatCurrency(data.summary.total_cess)}
            </p>
          </div>
        </div>
      </Card>

      {/* B2B Invoices */}
      <Card padding="none">
        <div className="p-6 border-b border-gray-200">
          <CardHeader className="mb-0">
            <CardTitle>B2B Invoices (Registered Recipients)</CardTitle>
            <Badge variant="info">{data.b2b.length} invoices</Badge>
          </CardHeader>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="h-11 px-4 text-left font-medium text-gray-500 bg-gray-50">GSTIN</th>
                <th className="h-11 px-4 text-left font-medium text-gray-500 bg-gray-50">Party</th>
                <th className="h-11 px-4 text-left font-medium text-gray-500 bg-gray-50">Invoice #</th>
                <th className="h-11 px-4 text-left font-medium text-gray-500 bg-gray-50">Date</th>
                <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">Taxable</th>
                <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">Tax</th>
                <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.b2b.length === 0 ? (
                <tr>
                  <td colSpan={7} className="h-16 text-center text-gray-500">
                    No B2B invoices found
                  </td>
                </tr>
              ) : (
                data.b2b.map((entry, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    <td className="h-12 px-4 font-mono text-xs text-gray-700">
                      {entry.gstin}
                    </td>
                    <td className="h-12 px-4 text-gray-900">
                      {entry.contact_name}
                    </td>
                    <td className="h-12 px-4 font-medium text-primary-800">
                      {entry.invoice_number}
                    </td>
                    <td className="h-12 px-4 text-gray-600">
                      {entry.invoice_date}
                    </td>
                    <td className="h-12 px-4 text-right text-gray-700">
                      {formatCurrency(entry.taxable_amount)}
                    </td>
                    <td className="h-12 px-4 text-right text-gray-700">
                      {formatCurrency(entry.total_tax)}
                    </td>
                    <td className="h-12 px-4 text-right font-semibold text-gray-900">
                      {formatCurrency(entry.invoice_total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* B2C Summary */}
      <Card>
        <CardHeader>
          <CardTitle>B2C Supplies (Unregistered Recipients)</CardTitle>
        </CardHeader>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="h-11 px-4 text-left font-medium text-gray-500 bg-gray-50">Rate</th>
                <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">Taxable Value</th>
                <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">CGST</th>
                <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">SGST</th>
                <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">IGST</th>
                <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">Cess</th>
                <th className="h-11 px-4 text-right font-medium text-gray-500 bg-gray-50">Total Tax</th>
              </tr>
            </thead>
            <tbody>
              {data.b2c.rate_wise.length === 0 ? (
                <tr>
                  <td colSpan={7} className="h-16 text-center text-gray-500">
                    No B2C supplies
                  </td>
                </tr>
              ) : (
                data.b2c.rate_wise.map((r) => (
                  <tr key={r.rate} className="border-b border-gray-100">
                    <td className="h-12 px-4 text-gray-900">
                      <Badge variant="outline">{r.rate}%</Badge>
                    </td>
                    <td className="h-12 px-4 text-right text-gray-700">
                      {formatCurrency(r.taxable_amount)}
                    </td>
                    <td className="h-12 px-4 text-right text-gray-700">
                      {formatCurrency(r.cgst)}
                    </td>
                    <td className="h-12 px-4 text-right text-gray-700">
                      {formatCurrency(r.sgst)}
                    </td>
                    <td className="h-12 px-4 text-right text-gray-700">
                      {formatCurrency(r.igst)}
                    </td>
                    <td className="h-12 px-4 text-right text-gray-700">
                      {formatCurrency(r.cess)}
                    </td>
                    <td className="h-12 px-4 text-right font-semibold text-gray-900">
                      {formatCurrency(r.total_tax)}
                    </td>
                  </tr>
                ))
              )}
              <tr className="bg-gray-50 font-semibold">
                <td className="h-12 px-4 text-gray-900">Total</td>
                <td className="h-12 px-4 text-right text-gray-900">
                  {formatCurrency(data.b2c.taxable_amount)}
                </td>
                <td className="h-12 px-4 text-right text-gray-900">
                  {formatCurrency(data.b2c.cgst)}
                </td>
                <td className="h-12 px-4 text-right text-gray-900">
                  {formatCurrency(data.b2c.sgst)}
                </td>
                <td className="h-12 px-4 text-right text-gray-900">
                  {formatCurrency(data.b2c.igst)}
                </td>
                <td className="h-12 px-4 text-right text-gray-900">
                  {formatCurrency(data.b2c.cess)}
                </td>
                <td className="h-12 px-4 text-right text-gray-900">
                  {formatCurrency(data.b2c.total_tax)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
