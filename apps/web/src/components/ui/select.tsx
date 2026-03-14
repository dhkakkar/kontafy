"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, Check, Search } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  searchable?: boolean;
  className?: string;
  disabled?: boolean;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = "Select...",
  label,
  error,
  searchable = false,
  className,
  disabled = false,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filtered = searchable
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={cn("relative w-full", className)} ref={ref}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full h-10 rounded-lg border bg-white px-3 text-sm text-left",
          "flex items-center justify-between",
          "transition-colors duration-150",
          "focus:outline-none focus:ring-2 focus:ring-primary-500",
          "disabled:opacity-50 disabled:bg-gray-50",
          error ? "border-danger-500" : "border-gray-300",
          open && "ring-2 ring-primary-500 border-primary-500"
        )}
      >
        <span className={selectedOption ? "text-gray-900" : "text-gray-400"}>
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-400 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {error && <p className="mt-1 text-sm text-danger-500">{error}</p>}

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg py-1 max-h-60 overflow-auto">
          {searchable && (
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full h-8 pl-8 pr-3 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                  autoFocus
                />
              </div>
            </div>
          )}
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-gray-500">
              No options found
            </div>
          ) : (
            filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                  setSearch("");
                }}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm flex items-center justify-between",
                  "hover:bg-gray-50 transition-colors",
                  option.value === value && "bg-primary-50 text-primary-800"
                )}
              >
                <div>
                  <span className="font-medium">{option.label}</span>
                  {option.description && (
                    <span className="block text-xs text-gray-500">
                      {option.description}
                    </span>
                  )}
                </div>
                {option.value === value && (
                  <Check className="h-4 w-4 text-primary-600" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
