"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
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

// Use useLayoutEffect on the client and a no-op on the server to keep
// Next.js SSR happy. useLayoutEffect is what gives the dropdown its
// jitter-free position (measure → place before paint).
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Searchable single-select with portal-rendered dropdown.
 *
 * The panel is rendered into document.body so no ancestor with
 * `overflow: hidden|auto` (table containers, scrollable cards, modals
 * with internal scroll, ...) can clip it. Position is recomputed each
 * frame the panel is open via `requestAnimationFrame` so the dropdown
 * sticks to the trigger when the page scrolls or the window resizes.
 *
 * Keyboard: ArrowDown / ArrowUp move the highlight, Enter selects,
 * Escape closes. Click outside both the trigger and the panel closes.
 */
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
  const [highlight, setHighlight] = useState(-1);
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
    placement: "below" | "above";
  } | null>(null);

  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const filtered = searchable
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()),
      )
    : options;

  // Reposition the panel against the trigger. Called on open, every
  // frame while open, and on layout effects. Uses position: fixed so
  // body scroll lock / sticky headers don't shift it.
  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const PANEL_MAX = 320;
    const PADDING = 8;
    const viewportH = window.innerHeight;
    const spaceBelow = viewportH - rect.bottom - PADDING;
    const spaceAbove = rect.top - PADDING;
    // Flip above when there's no room below AND there's more room above.
    const placement: "below" | "above" =
      spaceBelow < Math.min(PANEL_MAX, 240) && spaceAbove > spaceBelow
        ? "above"
        : "below";
    setPos({
      top: placement === "below" ? rect.bottom + 4 : rect.top - 4,
      left: rect.left,
      width: rect.width,
      placement,
    });
  }, []);

  // While the panel is open, follow the trigger on scroll / resize.
  // RAF loop is light — just one getBoundingClientRect per frame —
  // and stops as soon as the panel closes.
  useEffect(() => {
    if (!open) return;
    let raf = 0;
    const tick = () => {
      updatePosition();
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [open, updatePosition]);

  // First-paint position before the panel becomes visible — avoids a
  // single-frame flash where the dropdown briefly lands at 0,0.
  useIsomorphicLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  // Click-outside that considers BOTH the trigger and the portaled
  // panel — without the panel check, clicking on a result would
  // immediately close the dropdown before onChange fires.
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      const t = event.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
      setSearch("");
      setHighlight(-1);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // When opening, reset search + highlight, focus the search input
  // on the next tick so the cursor is ready for typing.
  useEffect(() => {
    if (open) {
      setHighlight(filtered.length > 0 ? 0 : -1);
      if (searchable) {
        requestAnimationFrame(() => searchInputRef.current?.focus());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Reset highlight whenever the visible result set changes.
  useEffect(() => {
    setHighlight(filtered.length > 0 ? 0 : -1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const commit = (val: string) => {
    onChange(val);
    setOpen(false);
    setSearch("");
    setHighlight(-1);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (filtered.length === 0 ? -1 : (h + 1) % filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) =>
        filtered.length === 0 ? -1 : (h - 1 + filtered.length) % filtered.length,
      );
    } else if (e.key === "Enter") {
      if (open && highlight >= 0 && filtered[highlight]) {
        e.preventDefault();
        commit(filtered[highlight].value);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setSearch("");
      }
    }
  };

  return (
    <div className={cn("relative w-full", className)} ref={triggerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        aria-invalid={!!error}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKey}
        className={cn(
          "w-full h-10 rounded-lg border bg-white px-3 text-sm text-left",
          "flex items-center justify-between",
          "transition-colors duration-150",
          "focus:outline-none focus:ring-2 focus:ring-primary-500",
          "disabled:opacity-50 disabled:bg-gray-50",
          error ? "border-danger-500" : "border-gray-300",
          open && "ring-2 ring-primary-500 border-primary-500",
        )}
      >
        <span
          className={cn(
            "truncate",
            selectedOption ? "text-gray-900" : "text-gray-400",
          )}
        >
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-400 transition-transform shrink-0 ml-2",
            open && "rotate-180",
          )}
        />
      </button>
      {error && (
        <p role="alert" className="mt-1.5 text-sm font-medium text-danger-600">
          {error}
        </p>
      )}

      {open &&
        pos &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            onKeyDown={onKey}
            style={{
              position: "fixed",
              top:
                pos.placement === "below"
                  ? pos.top
                  : Math.max(8, pos.top - 320),
              left: pos.left,
              width: pos.width,
              zIndex: 9999,
            }}
            className="bg-white rounded-lg border border-gray-200 shadow-lg py-1 max-h-80 overflow-auto"
          >
            {searchable && (
              <div className="px-3 py-2 border-b border-gray-100 sticky top-0 bg-white">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={onKey}
                    placeholder="Search..."
                    className="w-full h-8 pl-8 pr-3 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>
            )}
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-gray-500">
                No options found
              </div>
            ) : (
              filtered.map((option, idx) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => commit(option.value)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm flex items-center justify-between",
                    "transition-colors",
                    idx === highlight && "bg-gray-50",
                    option.value === value && "bg-primary-50 text-primary-800",
                  )}
                >
                  <div className="min-w-0">
                    <span className="font-medium block truncate">
                      {option.label}
                    </span>
                    {option.description && (
                      <span className="block text-xs text-gray-500 truncate">
                        {option.description}
                      </span>
                    )}
                  </div>
                  {option.value === value && (
                    <Check className="h-4 w-4 text-primary-600 shrink-0 ml-2" />
                  )}
                </button>
              ))
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
