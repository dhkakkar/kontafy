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

// ─── Types matching actual API response ─────────────────────────

interface BSAccount {
  account_id: string;
  code: string | null;
  name: string;
  amount: number;
}

interface BSSubSection {
  accounts: BSAccount[];
  total: number;
}

interface BSAssetsSection {
  current_assets: BSSubSection;
  fixed_assets: BSSubSection;
  other_assets: BSSubSection;
  total: number;
}

interface BSLiabilitiesSection {
  current_liabilities: BSSubSection;
  long_term_liabilities: BSSubSection;
  total: number;
}

interface BSEquitySection {
  accounts: BSAccount[];
  retained_earnings: number;
  total: number;
}

interface BSReport {
  as_of: string;
  assets: BSAssetsSection;
  liabilities: BSLiabilitiesSection;
  equity: BSEquitySection;
  total_liabilities_and_equity: number;
  is_balanced: boolean;
}

interface ApiResponse<T> {
  data: T;
}

// ─── Helpers ────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Flatten a sub-section into a labeled group for rendering */
interface FlatGroup {
  label: string;
  key: string;
  accounts: BSAccount[];
  total: number;
}

function flattenAssets(a: BSAssetsSection): FlatGroup[] {
  const groups: FlatGroup[] = [];
  if (a.current_assets?.accounts?.length > 0) {
    groups.push({
      label: "Current Assets",
      key: "current_assets",
      accounts: a.current_assets.accounts,
      total: a.current_assets.total,
    });
  }
  if (a.fixed_assets?.accounts?.length > 0) {
    groups.push({
      label: "Fixed Assets",
      key: "fixed_assets",
      accounts: a.fixed_assets.accounts,
      total: a.fixed_assets.total,
    });
  }
  if (a.other_assets?.accounts?.length > 0) {
    groups.push({
      label: "Other Assets",
      key: "other_assets",
      accounts: a.other_assets.accounts,
      total: a.other_assets.total,
    });
  }
  // If no sub-groups had data but total is non-zero, show as single group
  if (groups.length === 0) {
    const allAccounts = [
      ...(a.current_assets?.accounts || []),
      ...(a.fixed_assets?.accounts || []),
      ...(a.other_assets?.accounts || []),
    ];
    if (allAccounts.length > 0 || a.total !== 0) {
      groups.push({
        label: "Assets",
        key: "assets",
        accounts: allAccounts,
        total: a.total,
      });
    }
  }
  return groups;
}

function flattenLiabilities(l: BSLiabilitiesSection): FlatGroup[] {
  const groups: FlatGroup[] = [];
  if (l.current_liabilities?.accounts?.length > 0) {
    groups.push({
      label: "Current Liabilities",
      key: "current_liabilities",
      accounts: l.current_liabilities.accounts,
      total: l.current_liabilities.total,
    });
  }
  if (l.long_term_liabilities?.accounts?.length > 0) {
    groups.push({
      label: "Long-Term Liabilities",
      key: "long_term_liabilities",
      accounts: l.long_term_liabilities.accounts,
      total: l.long_term_liabilities.total,
    });
  }
  if (groups.length === 0) {
    const allAccounts = [
      ...(l.current_liabilities?.accounts || []),
      ...(l.long_term_liabilities?.accounts || []),
    ];
    if (allAccounts.length > 0 || l.total !== 0) {
      groups.push({
        label: "Liabilities",
        key: "liabilities",
        accounts: allAccounts,
        total: l.total,
      });
    }
  }
  return groups;
}

// ─── Component ──────────────────────────────────────────────────

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

  // Totals
  const assetsTotal = report?.assets?.total ?? 0;
  const liabilitiesTotal = report?.liabilities?.total ?? 0;
  const equityTotal = report?.equity?.total ?? 0;
  const isBalanced =
    report &&
    Math.abs(assetsTotal - (liabilitiesTotal + equityTotal)) < 0.01;

  // ─── CSV Export ─────────────────────────────────────────────

  const handleExport = () => {
    if (!report) return;
    const rows: string[][] = [
      isComparing
        ? ["Account", `Amount (${formatDate(asOfDate)})`, `Amount (${formatDate(compareDate)})`]
        : ["Account", "Amount"],
    ];
    const addGroup = (label: string, accounts: BSAccount[], total: number) => {
      rows.push([label, "", ...(isComparing ? [""] : [])]);
      accounts.forEach((a) => {
        rows.push([
          `  ${a.name}`,
          String(a.amount),
          ...(isComparing ? [""] : []),
        ]);
      });
      rows.push([`Total ${label}`, String(total), ...(isComparing ? [""] : [])]);
    };

    flattenAssets(report.assets).forEach((g) =>
      addGroup(g.label, g.accounts, g.total)
    );
    rows.push(["Total Assets", String(assetsTotal), ...(isComparing ? [""] : [])]);

    flattenLiabilities(report.liabilities).forEach((g) =>
      addGroup(g.label, g.accounts, g.total)
    );
    rows.push(["Total Liabilities", String(liabilitiesTotal), ...(isComparing ? [""] : [])]);

    rows.push(["Equity", "", ...(isComparing ? [""] : [])]);
    (report.equity.accounts || []).forEach((a) => {
      rows.push([`  ${a.name}`, String(a.amount), ...(isComparing ? [""] : [])]);
    });
    if (report.equity.retained_earnings !== 0) {
      rows.push(["  Retained Earnings", String(report.equity.retained_earnings), ...(isComparing ? [""] : [])]);
    }
    rows.push(["Total Equity", String(equityTotal), ...(isComparing ? [""] : [])]);
    rows.push(["Total Liabilities + Equity", String(liabilitiesTotal + equityTotal), ...(isComparing ? [""] : [])]);

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `balance-sheet-${asOfDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Print ──────────────────────────────────────────────────

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

  // ─── Render sub-section group ───────────────────────────────

  const renderGroup = (
    group: FlatGroup,
    compareGroup?: FlatGroup
  ) => {
    const isCollapsed = collapsedSections[group.key];
    const accounts = group.accounts || [];

    return (
      <React.Fragment key={group.key}>
        <tr
          className="bg-gray-50/80 cursor-pointer select-none group"
          onClick={() => toggleSection(group.key)}
        >
          <td className="py-3 px-4 pl-8 font-semibold text-gray-800" colSpan={isComparing ? 3 : 2}>
            <div className="flex items-center gap-2">
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
              )}
              {group.label}
              <span className="text-xs font-normal text-gray-400 ml-1">
                ({accounts.length} account{accounts.length !== 1 ? "s" : ""})
              </span>
            </div>
          </td>
        </tr>

        {!isCollapsed &&
          accounts.map((a) => {
            const compareAmt = compareGroup?.accounts?.find(
              (ca) => ca.account_id === a.account_id
            );
            return (
              <tr
                key={a.account_id}
                className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors"
              >
                <td className="py-2.5 px-4 pl-14 text-gray-700">
                  {a.code && (
                    <span className="text-xs text-gray-400 mr-2 font-mono">
                      {a.code}
                    </span>
                  )}
                  {a.name}
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

        {!isCollapsed && (
          <tr className="border-t border-gray-200">
            <td className="py-2 px-4 pl-14 font-semibold text-gray-700 text-xs uppercase">
              Total {group.label}
            </td>
            <td className="py-2 px-4 text-right font-semibold text-gray-900 tabular-nums">
              {formatCurrency(group.total)}
            </td>
            {isComparing && (
              <td className="py-2 px-4 text-right font-semibold text-gray-500 tabular-nums">
                {formatCurrency(compareGroup?.total ?? 0)}
              </td>
            )}
          </tr>
        )}
      </React.Fragment>
    );
  };

  // ─── Render major section header + total ────────────────────

  const renderMajorSection = (
    label: string,
    sectionKey: string,
    groups: FlatGroup[],
    compareGroups: FlatGroup[],
    sectionTotal: number,
    compareSectionTotal: number
  ) => {
    const isCollapsed = collapsedSections[sectionKey];
    const totalAccounts = groups.reduce((s, g) => s + g.accounts.length, 0);

    return (
      <React.Fragment key={sectionKey}>
        {/* Major section header */}
        <tr
          className="bg-blue-50/60 cursor-pointer select-none group border-t border-blue-100"
          onClick={() => toggleSection(sectionKey)}
        >
          <td className="py-3 px-4 font-bold text-gray-900" colSpan={isComparing ? 3 : 2}>
            <div className="flex items-center gap-2">
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-blue-500 group-hover:text-blue-700" />
              ) : (
                <ChevronDown className="h-4 w-4 text-blue-500 group-hover:text-blue-700" />
              )}
              {label}
              <span className="text-xs font-normal text-gray-400 ml-1">
                ({totalAccounts} account{totalAccounts !== 1 ? "s" : ""})
              </span>
            </div>
          </td>
        </tr>

        {/* Sub-groups */}
        {!isCollapsed &&
          groups.map((g) => {
            const cg = compareGroups.find((c) => c.key === g.key);
            return renderGroup(g, cg);
          })}

        {/* Section total */}
        <tr className="border-t-2 border-gray-300 bg-gray-50/50">
          <td className="py-3 px-4 pl-8 font-bold text-gray-900">
            Total {label}
          </td>
          <td className="py-3 px-4 text-right font-bold text-gray-900 tabular-nums">
            {formatCurrency(sectionTotal)}
          </td>
          {isComparing && (
            <td className="py-3 px-4 text-right font-bold text-gray-500 tabular-nums">
              {formatCurrency(compareSectionTotal)}
            </td>
          )}
        </tr>

        {/* Spacer */}
        <tr>
          <td colSpan={isComparing ? 3 : 2} className="py-1" />
        </tr>
      </React.Fragment>
    );
  };

  // ─── Equity section (special: has retained_earnings) ────────

  const renderEquitySection = () => {
    if (!report) return null;
    const sectionKey = "equity";
    const isCollapsed = collapsedSections[sectionKey];
    const equityAccounts = report.equity.accounts || [];
    const retainedEarnings = report.equity.retained_earnings ?? 0;
    const totalAccountCount = equityAccounts.length + (retainedEarnings !== 0 ? 1 : 0);

    const compareEquity = compareReport?.equity;

    return (
      <React.Fragment>
        {/* Equity header */}
        <tr
          className="bg-blue-50/60 cursor-pointer select-none group border-t border-blue-100"
          onClick={() => toggleSection(sectionKey)}
        >
          <td className="py-3 px-4 font-bold text-gray-900" colSpan={isComparing ? 3 : 2}>
            <div className="flex items-center gap-2">
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-blue-500 group-hover:text-blue-700" />
              ) : (
                <ChevronDown className="h-4 w-4 text-blue-500 group-hover:text-blue-700" />
              )}
              Equity
              <span className="text-xs font-normal text-gray-400 ml-1">
                ({totalAccountCount} item{totalAccountCount !== 1 ? "s" : ""})
              </span>
            </div>
          </td>
        </tr>

        {/* Equity accounts */}
        {!isCollapsed &&
          equityAccounts.map((a) => {
            const compareAmt = compareEquity?.accounts?.find(
              (ca) => ca.account_id === a.account_id
            );
            return (
              <tr
                key={a.account_id}
                className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors"
              >
                <td className="py-2.5 px-4 pl-14 text-gray-700">
                  {a.code && (
                    <span className="text-xs text-gray-400 mr-2 font-mono">
                      {a.code}
                    </span>
                  )}
                  {a.name}
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

        {/* Retained Earnings */}
        {!isCollapsed && retainedEarnings !== 0 && (
          <tr className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
            <td className="py-2.5 px-4 pl-14 text-gray-700 italic">
              Retained Earnings (Net Income)
            </td>
            <td className="py-2.5 px-4 text-right font-medium text-gray-900 tabular-nums">
              {formatCurrency(retainedEarnings)}
            </td>
            {isComparing && (
              <td className="py-2.5 px-4 text-right font-medium text-gray-500 tabular-nums">
                {formatCurrency(compareEquity?.retained_earnings ?? 0)}
              </td>
            )}
          </tr>
        )}

        {/* Equity total */}
        <tr className="border-t-2 border-gray-300 bg-gray-50/50">
          <td className="py-3 px-4 pl-8 font-bold text-gray-900">
            Total Equity
          </td>
          <td className="py-3 px-4 text-right font-bold text-gray-900 tabular-nums">
            {formatCurrency(equityTotal)}
          </td>
          {isComparing && (
            <td className="py-3 px-4 text-right font-bold text-gray-500 tabular-nums">
              {formatCurrency(compareEquity?.total ?? 0)}
            </td>
          )}
        </tr>

        <tr>
          <td colSpan={isComparing ? 3 : 2} className="py-1" />
        </tr>
      </React.Fragment>
    );
  };

  // ─── Main render ────────────────────────────────────────────

  const assetGroups = report ? flattenAssets(report.assets) : [];
  const liabilityGroups = report ? flattenLiabilities(report.liabilities) : [];
  const compareAssetGroups = compareReport ? flattenAssets(compareReport.assets) : [];
  const compareLiabilityGroups = compareReport ? flattenLiabilities(compareReport.liabilities) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Balance Sheet</h1>
          <p className="text-sm text-gray-500 mt-1">
            Statement of financial position as of{" "}
            {report ? formatDate(asOfDate) : "selected date"}
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
                Unbalanced (Diff:{" "}
                {formatCurrency(
                  Math.abs(assetsTotal - (liabilitiesTotal + equityTotal))
                )}
                )
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
                {/* Assets */}
                {renderMajorSection(
                  "Assets",
                  "assets_major",
                  assetGroups,
                  compareAssetGroups,
                  assetsTotal,
                  compareReport?.assets?.total ?? 0
                )}

                {/* Liabilities */}
                {renderMajorSection(
                  "Liabilities",
                  "liabilities_major",
                  liabilityGroups,
                  compareLiabilityGroups,
                  liabilitiesTotal,
                  compareReport?.liabilities?.total ?? 0
                )}

                {/* Equity */}
                {renderEquitySection()}

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
