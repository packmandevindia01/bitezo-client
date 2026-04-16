import { ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SearchableOption {
  label: string;
  value: string;
}

interface Props {
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
}

// ─── Component ────────────────────────────────────────────────────────────────

const SearchableSelect = ({
  label,
  options,
  value = "",
  onChange,
  placeholder = "Search or select…",
  required,
  disabled,
  error,
  clearable = true,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive selected label from value
  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  // Filtered options based on search query
  const filtered = query.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.trim().toLowerCase())
      )
    : options;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
    if (!open) setQuery("");
  };

  return (
    <div className="mb-4 flex w-full flex-col gap-1" ref={containerRef}>
      {/* Label */}
      {label && (
        <label className="text-xs font-medium text-gray-700 md:text-sm">
          {label}
          {required && <span className="ml-1 font-bold text-red-500">*</span>}
        </label>
      )}

      {/* Trigger */}
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={toggleOpen}
        className={`
          relative flex w-full cursor-pointer items-center gap-2
          rounded-md border px-3 py-2 text-sm outline-none transition md:px-4 md:text-base
          ${error ? "border-red-500 bg-red-50/30" : "border-gray-300 bg-white"}
          ${disabled ? "cursor-not-allowed bg-gray-100 opacity-50" : ""}
          ${open ? "border-[#49293e] ring-1 ring-[#49293e]/20" : ""}
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

      {/* Dropdown */}
      {open && (
        <div className="relative z-50">
          <div className="absolute top-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
            {/* Search input */}
            <div className="border-b border-gray-100 p-2">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type to search…"
                className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Options list */}
            <ul
              role="listbox"
              className="max-h-48 overflow-y-auto py-1"
            >
              {filtered.length === 0 ? (
                <li className="px-4 py-2 text-sm text-gray-400">No options found</li>
              ) : (
                filtered.map((opt) => (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={opt.value === value}
                    onClick={() => handleSelect(opt.value)}
                    className={`
                      cursor-pointer px-4 py-2 text-sm transition
                      hover:bg-[#49293e]/10 hover:text-[#49293e]
                      ${opt.value === value ? "bg-[#49293e]/10 font-medium text-[#49293e]" : "text-gray-700"}
                    `}
                  >
                    {opt.label}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-1 flex animate-in items-center gap-1.5 text-[11px] font-semibold text-red-600 fade-in slide-in-from-top-1 md:text-xs">
          <span className="shrink-0">⚠️</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;