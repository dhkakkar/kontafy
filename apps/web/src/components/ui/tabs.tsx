"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface Tab {
  value: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function Tabs({ tabs, value, onChange, className }: TabsProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 border-b border-gray-200",
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "relative px-4 py-2.5 text-sm font-medium transition-colors",
            "hover:text-gray-900",
            value === tab.value
              ? "text-primary-800"
              : "text-gray-500"
          )}
        >
          <span className="flex items-center gap-2">
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-xs font-medium",
                  value === tab.value
                    ? "bg-primary-100 text-primary-800"
                    : "bg-gray-100 text-gray-600"
                )}
              >
                {tab.count}
              </span>
            )}
          </span>
          {value === tab.value && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-800 rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
