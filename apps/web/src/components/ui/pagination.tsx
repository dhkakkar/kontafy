"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  // 1-indexed current page.
  page: number;
  pageSize: number;
  // Total number of rows across all pages (from the API's meta.total).
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

/**
 * Server-side pagination control. Renders a "Showing X–Y of Z" label,
 * a page-size selector, and Prev / page-input / Next buttons. The
 * page-input is a tiny number field so users with 200+ pages can
 * jump without clicking Next 30 times.
 *
 * Designed to be used alongside a useQuery whose key includes the
 * current page + pageSize — switching either kicks a fresh fetch.
 */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100, 200],
  className,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  // Echo the input box's text without spamming onPageChange on every
  // keystroke — we only commit on blur or Enter.
  const [pageInput, setPageInput] = React.useState(String(page));
  React.useEffect(() => setPageInput(String(page)), [page]);

  const commitPageInput = () => {
    const n = parseInt(pageInput, 10);
    if (!Number.isFinite(n)) {
      setPageInput(String(page));
      return;
    }
    const clamped = Math.max(1, Math.min(totalPages, n));
    setPageInput(String(clamped));
    if (clamped !== page) onPageChange(clamped);
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 text-sm text-gray-600",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span>
          Showing{" "}
          <span className="font-medium text-gray-900">{start}</span>–
          <span className="font-medium text-gray-900">{end}</span> of{" "}
          <span className="font-medium text-gray-900">{total}</span>
        </span>
        {onPageSizeChange && (
          <label className="flex items-center gap-2 text-xs text-gray-500">
            Rows per page:
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-7 rounded-md border border-gray-300 bg-white px-1.5 text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => canPrev && onPageChange(page - 1)}
          disabled={!canPrev}
          className={cn(
            "h-8 px-2 rounded-md border border-gray-300 bg-white flex items-center gap-1 text-xs transition-colors",
            canPrev
              ? "hover:bg-gray-50 text-gray-700"
              : "opacity-40 cursor-not-allowed text-gray-400",
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </button>

        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span>Page</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={commitPageInput}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              }
            }}
            className="w-12 h-7 rounded-md border border-gray-300 bg-white px-1.5 text-xs text-center text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <span>
            / <span className="font-medium text-gray-900">{totalPages}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => canNext && onPageChange(page + 1)}
          disabled={!canNext}
          className={cn(
            "h-8 px-2 rounded-md border border-gray-300 bg-white flex items-center gap-1 text-xs transition-colors",
            canNext
              ? "hover:bg-gray-50 text-gray-700"
              : "opacity-40 cursor-not-allowed text-gray-400",
          )}
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
