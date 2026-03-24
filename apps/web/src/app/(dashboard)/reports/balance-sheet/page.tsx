"use client";

import React, { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  Download,
  Loader2,
  Printer,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface BSAccount {
  account_name: string;
  account_code: string;
  amount: number;
}

interface BSSection {
  label: string;
  accounts: BSAccount[];
  total: number;
}

interface BSReport {
  assets: BSSection;
  liabilities: BSSection;
  equity: BSSection;
  as_of: string;
}

interface ApiResponse<T> {
  data: T;
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function BalanceSheetPage() {
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const [asOfDate, setAsOfDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [compareDate, setCompareDate] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  const { data: report, isLoading } = useQuery<BSReport>({
    queryKey: ["balance-sheet", asOfDate],
    queryFn: async () => {
      const res = await api.get<ApiResponse<BSReport>>(
        "/books/reports/balance-sheet",
        { asOfDate }
      );
      return res.data;
    },
  });

  const { data: compareReport, isLoading: isCompareLoading } =
    useQuery<BSReport>({
      queryKey: ["balance-sheet", compareDate],
      queryFn: async () => {
        const res = await api.get<ApiResponse<BSReport>>(
          "/books/reports/balance-sheet",
          { asOfDate: compareDate }
        );
        return res.data;
      },
      enabled: !!compareDate,
    });

  const isComparing = !!compareDate && !!compareReport;

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Equation check
  const assetsTotal = report?.assets?.total ?? 0;
  const liabilitiesTotal = report?.liabilities?.total ?? 0;
  const equityTotal = report?.equity?.total ?? 0;
  const isBalanced =
    report &&
    Math.abs(assetsTotal - (liabilitiesTotal + equityTotal)) < 0.01;

  const handleExport = () => {
    if (!report) return;
    const rows: string[][] = [
      isComparing
        ? ["Account", `Amount (${formatDate(asOfDate)})`, `Amount (${formatDate(compareDate)})`]
        : ["Account", "Amount"],
    ];
    const addSection = (s: BSSection, cs?: BSSection) => {
      rows.push([s.label, "", ...(isComparing ? [""] : [])]);
      (s.accounts || []).forEach((a) => {
        const compareAmt = cs?.accounts?.find(
          (ca) => ca.account_code === a.account_code
        );
        rows.push([
          `  ${a.account_name}`,
          String(a.amount),
          ...(isComparing ? [String(compareAmt?.amount ?? 0)] : []),
        ]);
      });
      rows.push([
        `Total ${s.label}`,
        String(s.total),
        ...(isComparing ? [String(cs?.total ?? 0)] : []),
      ]);
    };
    addSection(report.assets, compareReport?.assets);
    addSection(report.liabilities, compareReport?.liabilities);
    addSection(report.equity, compareReport?.equity);
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `balance-sheet-${asOfDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Balance Sheet - ${formatDate(asOfDate)}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; color: #111; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th { text-align: left; padding: 8px 12px; border-bottom: 2px solid #333; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #555; }
            th.amount { text-align: right; }
            td { padding: 6px 12px; border-bottom: 1px solid #eee; }
            td.amount { text-align: right; font-variant-numeric: tabular-nums; }
            .section-header td { font-weight: 700; background: #f7f7f7; padding: 10px 12px; border-bottom: 1px solid #ddd; }
            .section-total td { font-weight: 700; border-top: 2px solid #333; border-bottom: 2px solid #333; padding: 10px 12px; }
            .account-row td { padding-left: 32px; }
            .equation { margin-top: 24px; padding: 12px 16px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; font-size: 14px; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            .subtitle { color: #666; font-size: 13px; margin-bottom: 20px; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Balance Sheet</h1>
          <div class="subtitle">As of ${formatDate(asOfDate)}</div>
          ${content.innerHTML}
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const renderSectionRows = (
    section: BSSection,
    compareSection?: BSSection,
    sectionKey?: string
  ) => {
    const key = sectionKey || section.label;
    const isCollapsed = collapsedSections[key];
    const accounts = section.accounts || [];

    return (
      <>
        {/* Section header */}
        <tr
          className="bg-gray-50/80 cursor-pointer select-none group"
          onClick={() => toggleSection(key)}
        >
          <td className="py-3 px-4 font-bold text-gray-900" colSpan={isComparing ? 3 : 2}>
            <div className="flex items-center gap-2">
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
              )}
              {section.label}
              <span className="text-xs font-normal text-gray-400 ml-1">
                ({accounts.length} account{accounts.length !== 1 ? "s" : ""})
              </span>
            </div>
          </td>
        </tr>

        {/* Account rows */}
        {!isCollapsed &&
          accounts.map((a) => {
            const compareAmt = compareSection?.accounts?.find(
              (ca) => ca.account_code === a.account_code
            );
            return (
              <tr
                key={a.account_code}
                className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors"
              >
                <td className="py-2.5 px-4 pl-12 text-gray-700">
                  <span className="text-xs text-gray-400 mr-2 font-mono">
                    {a.account_code}
                  </span>
                  {a.account_name}
                </td>
                <td className="py-2.5 px-4 text-right font-medium text-gray-900 tabular-nums">
                  {formatCurrency(a.amount)}
                </td>
                {isComparing && (
                  <td className="py-2.5 px-4 text-right font-medium text-gray-500 tabular-nums">
                    {formatCurrency(compareAmt?.amount ?? 0)}
                  </td>
                )}
              </tr>
            );
          })}

        {/* Accounts with no match in compare period (only in compare) */}
        {!isCollapsed &&
          isComparing &&
          compareSection &&
          (compareSection.accounts || [])
            .filter(
              (ca) => !accounts.find((a) => a.account_code === ca.account_code)
            )
            .map((ca) => (
              <tr
                key={ca.account_code}
                className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors"
              >
                <td className="py-2.5 px-4 pl-12 text-gray-400">
                  <span className="text-xs text-gray-300 mr-2 font-mono">
                    {ca.account_code}
                  </span>
                  {ca.account_name}
                </td>
                <td className="py-2.5 px-4 text-right font-medium text-gray-300 tabular-nums">
                  {formatCurrency(0)}
                </td>
                <td className="py-2.5 px-4 text-right font-medium text-gray-500 tabular-nums">
                  {formatCurrency(ca.amount)}
                </td>
              </tr>
            ))}

        {/* Section total */}
        <tr className="border-t-2 border-gray-300 bg-gray-50/50">
          <td className="py-3 px-4 pl-12 font-bold text-gray-900">
            Total {section.label}
          </td>
          <td className="py-3 px-4 text-right font-bold text-gray-900 tabular-nums">
            {formatCurrency(section.total)}
          </td>
          {isComparing && (
            <td className="py-3 px-4 text-right font-bold text-gray-500 tabular-nums">
              {formatCurrency(compareSection?.total ?? 0)}
            </td>
          )}
        </tr>

        {/* Spacer row */}
        <tr>
          <td colSpan={isComparing ? 3 : 2} className="py-1" />
        </tr>
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Balance Sheet</h1>
          <p className="text-sm text-gray-500 mt-1">
            Statement of financial position as of {report ? formatDate(asOfDate) : "selected date"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => router.push("/books/journal/new")}
          >
            Add Journal Entry
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Printer className="h-4 w-4" />}
            onClick={handlePrint}
          >
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="h-4 w-4" />}
            onClick={handleExport}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-end gap-4 flex-wrap">
          <Input
            label="As of Date"
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="max-w-xs"
          />
          <Input
            label="Compare with"
            type="date"
            value={compareDate}
            onChange={(e) => setCompareDate(e.target.value)}
            className="max-w-xs"
          />
          {compareDate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCompareDate("")}
            >
              Clear Comparison
            </Button>
          )}
        </div>
      </Card>

      {/* Equation indicator */}
      {report && (
        <Card>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3 text-sm">
              <span className="font-semibold text-gray-700">
                Assets ({formatCurrency(assetsTotal)})
              </span>
              <span className="text-gray-400">=</span>
              <span className="font-semibold text-gray-700">
                Liabilities ({formatCurrency(liabilitiesTotal)})
              </span>
              <span className="text-gray-400">+</span>
              <span className="font-semibold text-gray-700">
                Equity ({formatCurrency(equityTotal)})
              </span>
            </div>
            {isBalanced ? (
              <Badge variant="success">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1 inline" />
                Balanced
              </Badge>
            ) : (
              <Badge variant="danger">
                <AlertTriangle className="h-3.5 w-3.5 mr-1 inline" />
                Unbalanced (Diff: {formatCurrency(Math.abs(assetsTotal - (liabilitiesTotal + equityTotal)))})
              </Badge>
            )}
          </div>
        </Card>
      )}

      {/* Report table */}
      <Card padding="none">
        {isLoading || isCompareLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="text-sm text-gray-400">Loading report...</span>
          </div>
        ) : report ? (
          <div ref={printRef} className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Particulars
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-44">
                    {isComparing ? formatDate(asOfDate) : "Amount"}
                  </th>
                  {isComparing && (
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-44">
                      {formatDate(compareDate)}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {renderSectionRows(
                  report.assets,
                  compareReport?.assets,
                  "assets"
                )}
                {renderSectionRows(
                  report.liabilities,
                  compareReport?.liabilities,
                  "liabilities"
                )}
                {renderSectionRows(
                  report.equity,
                  compareReport?.equity,
                  "equity"
                )}

                {/* Grand totals */}
                <tr className="border-t-2 border-gray-900 bg-gray-100">
                  <td className="py-3 px-4 font-bold text-gray-900 text-sm">
                    Total Liabilities + Equity
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-gray-900 tabular-nums text-sm">
                    {formatCurrency(liabilitiesTotal + equityTotal)}
                  </td>
                  {isComparing && (
                    <td className="py-3 px-4 text-right font-bold text-gray-500 tabular-nums text-sm">
                      {formatCurrency(
                        (compareReport?.liabilities?.total ?? 0) +
                          (compareReport?.equity?.total ?? 0)
                      )}
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-gray-500">
            <p className="text-sm">No data available for the selected date.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() =>
                setAsOfDate(new Date().toISOString().split("T")[0])
              }
            >
              Reset to Today
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
