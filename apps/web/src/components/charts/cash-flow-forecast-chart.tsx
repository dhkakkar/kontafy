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
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import dayjs from "dayjs";

interface ForecastDataPoint {
  date: string;
  inflow: number;
  outflow: number;
  balance: number;
}

interface CashFlowForecastChartProps {
  data: ForecastDataPoint[];
  confidence: number;
}

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
    <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-3 min-w-[180px]">
      <p className="text-sm font-medium text-gray-900 mb-2">
        {label ? dayjs(label).format("DD MMM YYYY") : ""}
      </p>
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

export function CashFlowForecastChart({
  data,
  confidence,
}: CashFlowForecastChartProps) {
  // Mark today's date for the reference line
  const today = dayjs().format("YYYY-MM-DD");

  return (
    <div>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e3a5f" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#1e3a5f" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="inflowGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16a34a" stopOpacity={0.1} />
              <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="outflowGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f19f37" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#f19f37" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickFormatter={(v) => dayjs(v).format("DD MMM")}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            tickFormatter={(v) => `${(v / 100000).toFixed(1)}L`}
            dx={-10}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            x={today}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            label={{
              value: "Today",
              position: "top",
              fill: "#64748b",
              fontSize: 11,
            }}
          />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="#1e3a5f"
            strokeWidth={2.5}
            fill="url(#balanceGradient)"
            name="balance"
          />
          <Area
            type="monotone"
            dataKey="inflow"
            stroke="#16a34a"
            strokeWidth={1.5}
            fill="url(#inflowGradient)"
            strokeDasharray="4 2"
            name="inflow"
          />
          <Area
            type="monotone"
            dataKey="outflow"
            stroke="#f19f37"
            strokeWidth={1.5}
            fill="url(#outflowGradient)"
            strokeDasharray="4 2"
            name="outflow"
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-between mt-3 px-1">
        <div className="flex items-center gap-5 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#1e3a5f]" />
            <span>Projected Balance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#16a34a]" />
            <span>Inflow</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#f19f37]" />
            <span>Outflow</span>
          </div>
        </div>
        <div className="text-xs text-gray-400">
          Confidence: {Math.round(confidence * 100)}%
        </div>
      </div>
    </div>
  );
}
