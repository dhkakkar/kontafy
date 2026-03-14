"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface CashFlowDataPoint {
  month: string;
  inflow: number;
  outflow: number;
}

interface CashFlowChartProps {
  data?: CashFlowDataPoint[];
}

const sampleData: CashFlowDataPoint[] = [
  { month: "Apr", inflow: 280000, outflow: 210000 },
  { month: "May", inflow: 340000, outflow: 230000 },
  { month: "Jun", inflow: 310000, outflow: 250000 },
  { month: "Jul", inflow: 390000, outflow: 260000 },
  { month: "Aug", inflow: 420000, outflow: 280000 },
  { month: "Sep", inflow: 450000, outflow: 290000 },
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
              className="h-2.5 w-2.5 rounded-sm"
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

export function CashFlowChart({ data = sampleData }: CashFlowChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
          iconType="square"
          iconSize={10}
        />
        <Bar dataKey="inflow" fill="#1e3a5f" radius={[4, 4, 0, 0]} barSize={24} />
        <Bar dataKey="outflow" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
