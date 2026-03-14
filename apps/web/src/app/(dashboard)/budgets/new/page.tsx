"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useCreateBudget } from "@/hooks/use-budgets";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";

interface BudgetLine {
  id: string;
  account_id: string;
  jan: number; feb: number; mar: number;
  apr: number; may: number; jun: number;
  jul: number; aug: number; sep: number;
  oct: number; nov: number; dec: number;
}

function genId() {
  return Math.random().toString(36).slice(2, 10);
}

const MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
const MONTH_KEYS = ["apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec", "jan", "feb", "mar"] as const;

// Sample accounts - in production these would come from API
const accountOptions = [
  { value: "acc-rent", label: "Rent Expense" },
  { value: "acc-salary", label: "Salary & Wages" },
  { value: "acc-marketing", label: "Marketing Expense" },
  { value: "acc-travel", label: "Travel & Conveyance" },
  { value: "acc-utilities", label: "Utilities" },
  { value: "acc-professional", label: "Professional Fees" },
  { value: "acc-office", label: "Office Supplies" },
  { value: "acc-insurance", label: "Insurance" },
  { value: "acc-depreciation", label: "Depreciation" },
  { value: "acc-misc", label: "Miscellaneous Expense" },
];

export default function NewBudgetPage() {
  const router = useRouter();
  const createMutation = useCreateBudget();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fiscalYear, setFiscalYear] = useState("25-26");
  const [periodType, setPeriodType] = useState("monthly");

  const [lines, setLines] = useState<BudgetLine[]>([
    {
      id: genId(),
      account_id: "",
      jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
      jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0,
    },
  ]);

  const addLine = () => {
    setLines([
      ...lines,
      {
        id: genId(),
        account_id: "",
        jan: 0, feb: 0, mar: 0, apr: 0, may: 0, jun: 0,
        jul: 0, aug: 0, sep: 0, oct: 0, nov: 0, dec: 0,
      },
    ]);
  };

  const removeLine = (id: string) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((l) => l.id !== id));
  };

  const updateLine = (id: string, field: string, value: string | number) => {
    setLines(
      lines.map((line) =>
        line.id === id ? { ...line, [field]: value } : line
      )
    );
  };

  const lineTotal = (line: BudgetLine) =>
    MONTH_KEYS.reduce((sum, k) => sum + (line[k] || 0), 0);

  const grandTotal = lines.reduce((sum, line) => sum + lineTotal(line), 0);

  const fyStart = fiscalYear === "25-26" ? "2025" : "2024";
  const fyEnd = fiscalYear === "25-26" ? "2026" : "2025";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        name,
        description: description || undefined,
        fiscal_year: fiscalYear,
        period_type: periodType,
        start_date: `${fyStart}-04-01`,
        end_date: `${fyEnd}-03-31`,
        line_items: lines
          .filter((l) => l.account_id)
          .map(({ id, ...rest }) => rest),
      });
      router.push("/budgets");
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="h-9 w-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Budget</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Create a new financial budget
            </p>
          </div>
        </div>
        <Button
          icon={<Save className="h-4 w-4" />}
          onClick={handleSubmit}
          loading={createMutation.isPending}
        >
          Save Budget
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card padding="md">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Budget Name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Operating Expenses FY 25-26"
                required
              />
            </div>
            <Select
              label="Fiscal Year"
              options={[
                { value: "25-26", label: "FY 2025-26" },
                { value: "24-25", label: "FY 2024-25" },
              ]}
              value={fiscalYear}
              onChange={setFiscalYear}
            />
            <Select
              label="Period Type"
              options={[
                { value: "monthly", label: "Monthly" },
                { value: "quarterly", label: "Quarterly" },
                { value: "yearly", label: "Yearly" },
              ]}
              value={periodType}
              onChange={setPeriodType}
            />
            <div className="md:col-span-4">
              <Input
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this budget"
              />
            </div>
          </div>
        </Card>

        {/* Budget Line Items */}
        <Card padding="none">
          <div className="p-4 border-b border-gray-200">
            <CardHeader className="!mb-0">
              <CardTitle>Budget Allocations</CardTitle>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={<Plus className="h-4 w-4" />}
                onClick={addLine}
              >
                Add Account
              </Button>
            </CardHeader>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[180px]">
                    Account
                  </th>
                  {MONTHS.map((m) => (
                    <th
                      key={m}
                      className="text-right py-3 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider w-[80px]"
                    >
                      {m}
                    </th>
                  ))}
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">
                    Total
                  </th>
                  <th className="w-[40px]" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-b border-gray-100">
                    <td className="py-2 px-4">
                      <Select
                        options={accountOptions}
                        value={line.account_id}
                        onChange={(val) => updateLine(line.id, "account_id", val)}
                        placeholder="Select account"
                      />
                    </td>
                    {MONTH_KEYS.map((month) => (
                      <td key={month} className="py-2 px-1">
                        <input
                          type="number"
                          value={line[month] || ""}
                          onChange={(e) =>
                            updateLine(
                              line.id,
                              month,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full h-9 rounded border border-gray-300 bg-white px-2 text-xs text-right focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="0"
                        />
                      </td>
                    ))}
                    <td className="py-2 px-4 text-right font-semibold text-gray-900 text-xs">
                      {lineTotal(line).toLocaleString("en-IN")}
                    </td>
                    <td className="py-2 px-2">
                      <button
                        type="button"
                        onClick={() => removeLine(line.id)}
                        disabled={lines.length <= 1}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-danger-500 hover:bg-danger-50 transition-colors disabled:opacity-30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300">
                  <td className="py-3 px-4 font-semibold text-gray-900 text-xs">
                    Grand Total
                  </td>
                  {MONTH_KEYS.map((month) => {
                    const colTotal = lines.reduce(
                      (sum, line) => sum + (line[month] || 0),
                      0
                    );
                    return (
                      <td
                        key={month}
                        className="py-3 px-2 text-right text-xs font-medium text-gray-700"
                      >
                        {colTotal > 0 ? colTotal.toLocaleString("en-IN") : "-"}
                      </td>
                    );
                  })}
                  <td className="py-3 px-4 text-right font-bold text-gray-900">
                    {grandTotal.toLocaleString("en-IN")}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </form>
    </div>
  );
}
