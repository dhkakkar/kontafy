"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  flexRender,
  type Table as TanstackTable,
  type Header,
} from "@tanstack/react-table";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

interface DataTableProps<T> {
  table: TanstackTable<T>;
  className?: string;
  onRowClick?: (row: T) => void;
}

function SortIcon<T>({ header }: { header: Header<T, unknown> }) {
  const sorted = header.column.getIsSorted();
  if (!header.column.getCanSort()) return null;

  if (sorted === "asc") return <ChevronUp className="h-4 w-4" />;
  if (sorted === "desc") return <ChevronDown className="h-4 w-4" />;
  return <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400" />;
}

export function DataTable<T>({
  table,
  className,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className={cn("w-full overflow-auto", className)}>
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-gray-200">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={cn(
                    "h-11 px-4 text-left font-medium text-gray-500 bg-gray-50",
                    header.column.getCanSort() &&
                      "cursor-pointer select-none hover:text-gray-700"
                  )}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  <div className="flex items-center gap-1.5">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    <SortIcon header={header} />
                  </div>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  "border-b border-gray-100 transition-colors",
                  "hover:bg-gray-50",
                  onRowClick && "cursor-pointer"
                )}
                onClick={() => onRowClick?.(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="h-12 px-4 text-gray-700">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={table.getAllColumns().length}
                className="h-24 text-center text-gray-500"
              >
                No results found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
