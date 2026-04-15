"use client";

import React, { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  align?: "left" | "right";
}

export function ActionMenu({ items, align = "right" }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Open actions menu"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div
          className={`absolute z-50 mt-1 min-w-[160px] rounded-lg border border-gray-200 bg-white shadow-lg py-1 ${
            align === "right" ? "right-0" : "left-0"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, idx) => (
            <button
              key={idx}
              type="button"
              disabled={item.disabled}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                item.onClick();
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                item.disabled
                  ? "text-gray-300 cursor-not-allowed"
                  : item.danger
                  ? "text-danger-600 hover:bg-danger-50"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {item.icon && <span className="h-4 w-4 shrink-0">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
