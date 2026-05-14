import { ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchableOption {
  label: string;
  value: string;
}

interface Props {
  id?: string;
  label?: string;
  options: SearchableOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  /** Show a clear (×) button when a value is selected. Default: true */
  clearable?: boolean;
  autoFocus?: boolean;
  tabIndex?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

const SearchableSelect = ({
  id,
  label,
  options,
  value = "",
  onChange,
  placeholder = "Search or select…",
  required,
  disabled,
  error,
  clearable = true,
  autoFocus = false,
  tabIndex,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, placement: "bottom" as "top" | "bottom" });

  // Auto focus logic
  useEffect(() => {
    if (autoFocus && triggerRef.current) {
      triggerRef.current.focus();
      setOpen(true);
    }
  }, [autoFocus]);

  // Derive selected label from value
  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  // Filtered options based on search query
  const filtered = query.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.trim().toLowerCase())
      )
    : options;

  // Reset highlighted index when filtered list changes
  useEffect(() => {
    setHighlightedIndex(filtered.length > 0 ? 0 : -1);
  }, [filtered.length]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        // If clicking inside the portal, don't close
        const portal = document.getElementById("select-portal-root");
        if (portal && portal.contains(e.target as Node)) return;
        
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Update coordinates when opening or scrolling
  useLayoutEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 250; // Estimated max height (search + list)
      
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      const placement = spaceBelow < dropdownHeight && spaceAbove > spaceBelow ? "top" : "bottom";

      setCoords({
        top: placement === "bottom" ? rect.bottom + window.scrollY : rect.top + window.scrollY - dropdownHeight,
        left: rect.left + window.scrollX,
        width: rect.width,
        placement
      });
    }
  }, [open]);

  // Re-calculate on window resize or scroll
  useEffect(() => {
    if (!open) return;
    const handleUpdate = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const dropdownHeight = 250;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const placement = spaceBelow < dropdownHeight && spaceAbove > spaceBelow ? "top" : "bottom";

        setCoords({
          top: placement === "bottom" ? rect.bottom + window.scrollY : rect.top + window.scrollY - dropdownHeight,
          left: rect.left + window.scrollX,
          width: rect.width,
          placement
        });
      }
    };
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);
    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
    };
  }, [open]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setOpen(false);
    setQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
  };

  const toggleOpen = () => {
    if (disabled) return;
    setOpen((prev) => !prev);
    if (!open) {
      setQuery("");
      setHighlightedIndex(filtered.length > 0 ? 0 : -1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % filtered.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
          handleSelect(filtered[highlightedIndex].value);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setQuery("");
        break;
      case "Tab":
        setOpen(false);
        setQuery("");
        break;
    }
  };

  return (
    <div className="flex w-full flex-col gap-1" ref={containerRef}>
      {/* Label */}
      {label && (
        <label className="text-xs font-medium text-gray-700 md:text-sm">
          {label}
          {required && <span className="ml-1 font-bold text-amber-500">*</span>}
        </label>
      )}

      {/* Trigger */}
      <div
        id={id}
        ref={triggerRef}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : (tabIndex ?? 0)}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        className={`
          relative flex w-full h-10.5 cursor-pointer items-center gap-2
          rounded-md border px-3 text-xs outline-none transition md:px-4
          ${error ? "border-amber-500 bg-amber-50/30" : "border-gray-300 bg-white"}
          ${disabled ? "cursor-not-allowed bg-gray-100 opacity-50" : ""}
          ${open ? "border-[#49293e] ring-1 ring-[#49293e]/20" : "hover:border-gray-400 focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20"}
        `}
      >
        {/* Displayed value or placeholder */}
        <span className={`flex-1 truncate ${!selectedLabel ? "text-gray-400" : "text-gray-900"}`}>
          {selectedLabel || placeholder}
        </span>

        {/* Clear button */}
        {clearable && value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
            aria-label="Clear selection"
          >
            <X size={14} />
          </button>
        )}

        {/* Chevron */}
        <ChevronDown
          size={16}
          className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </div>

      {/* Dropdown - Portaled */}
      {open && createPortal(
        <div 
          id="select-portal-root"
          className="fixed z-[9999]"
          style={{
            top: coords.top,
            left: coords.left,
            width: coords.width,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`
            w-full rounded-md border border-gray-200 bg-white shadow-xl duration-100
            ${coords.placement === "bottom" ? "mt-1 animate-in fade-in zoom-in-95" : "mb-1 animate-in fade-in slide-in-from-bottom-2"}
          `}>
            {/* Search input */}
            <div className="border-b border-gray-100 p-2">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type to search…"
                className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20"
              />
            </div>

            {/* Options list */}
            <ul
              ref={listRef}
              role="listbox"
              className="max-h-48 overflow-y-auto py-1"
            >
              {filtered.length === 0 ? (
                <li className="px-4 py-2 text-sm text-gray-400">No options found</li>
              ) : (
                filtered.map((opt, index) => (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={opt.value === value}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`
                      cursor-pointer px-4 py-2 text-sm transition
                      ${index === highlightedIndex ? "bg-[#49293e]/10 text-[#49293e]" : "text-gray-700"}
                      ${opt.value === value ? "font-bold underline decoration-[#49293e]/30 underline-offset-4" : ""}
                    `}
                  >
                    {opt.label}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>,
        document.body
      )}

      {/* Error */}
      {error && (
        <div className="mt-1 flex animate-in items-center gap-1.5 text-[11px] font-semibold text-amber-600 fade-in slide-in-from-top-1 md:text-xs">
          <span className="shrink-0">⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;