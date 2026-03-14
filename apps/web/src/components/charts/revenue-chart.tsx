"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface RevenueDataPoint {
  month: string;
  revenue: number;
  expenses: number;
}

interface RevenueChartProps {
  data: RevenueDataPoint[];
}

const sampleData: RevenueDataPoint[] = [
  { month: "Apr", revenue: 245000, expenses: 180000 },
  { month: "May", revenue: 312000, expenses: 195000 },
  { month: "Jun", revenue: 285000, expenses: 210000 },
  { month: "Jul", revenue: 350000, expenses: 225000 },
  { month: "Aug", revenue: 398000, expenses: 240000 },
  { month: "Sep", revenue: 425000, expenses: 255000 },
  { month: "Oct", revenue: 380000, expenses: 230000 },
  { month: "Nov", revenue: 445000, expenses: 265000 },
  { month: "Dec", revenue: 490000, expenses: 280000 },
  { month: "Jan", revenue: 520000, expenses: 290000 },
  { month: "Feb", revenue: 475000, expenses: 275000 },
  { month: "Mar", revenue: 550000, expenses: 310000 },
];

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-3 min-w-[160px]">
      <p className="text-sm font-medium text-gray-900 mb-2">{label}</p>
      {payload.map((entry) => (
        <div
          key={entry.dataKey}
          className="flex items-center justify-between gap-4 text-sm"
        >
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 capitalize">{entry.dataKey}</span>
          </div>
          <span className="font-medium text-gray-900">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RevenueChart({ data = sampleData }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e3a5f" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#1e3a5f" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f19f37" stopOpacity={0.1} />
            <stop offset="100%" stopColor="#f19f37" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#9ca3af" }}
          dy={10}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "#9ca3af" }}
          tickFormatter={(v) => `${(v / 100000).toFixed(1)}L`}
          dx={-10}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#1e3a5f"
          strokeWidth={2.5}
          fill="url(#revenueGradient)"
        />
        <Area
          type="monotone"
          dataKey="expenses"
          stroke="#f19f37"
          strokeWidth={2}
          fill="url(#expenseGradient)"
          strokeDasharray="6 3"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
