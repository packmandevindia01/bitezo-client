import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import FormInput from "./FormInput";

interface AutocompleteOption {
  label: string;
  value: string;
}

interface Props {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelectOption: (value: string, label: string) => void;
  options: AutocompleteOption[];
  onSearch: (query: string) => void;
  loading?: boolean;
  required?: boolean;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  autoFocus?: boolean;
  tabIndex?: number;
}

export const AutocompleteInput = ({
  id,
  label,
  value,
  onChange,
  onSelectOption,
  options = [],
  onSearch,
  loading,
  required,
  disabled,
  onKeyDown,
  autoFocus,
  tabIndex,
}: Props) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Trigger search when value changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (open) {
        onSearch(value);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [value, open, onSearch]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (open && options.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % options.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + options.length) % options.length);
        return;
      }
      if (e.key === "Enter" && highlightedIndex >= 0) {
        e.preventDefault();
        const opt = options[highlightedIndex];
        onSelectOption(opt.value, opt.label);
        setOpen(false);
        return;
      }
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
    } else {
      if (e.key === "ArrowDown") {
        setOpen(true);
      }
    }
    
    // Pass event to parent for tab chains, etc.
    if (onKeyDown) onKeyDown(e);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <FormInput
          id={id}
          label={label}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          tabIndex={tabIndex}
          autoComplete="off"
        />
        <div className="absolute right-3 top-[34px] text-gray-400 pointer-events-none">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ChevronDown size={16} />}
        </div>
      </div>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg">
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500">Searching...</div>
          ) : options.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">No matches found</div>
          ) : (
            options.map((opt, index) => (
              <div
                key={index}
                className={`cursor-pointer px-4 py-2 text-sm transition-colors ${
                  index === highlightedIndex ? "bg-[#49293e]/10 text-[#49293e] font-medium" : "text-gray-700 hover:bg-gray-50"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent input from losing focus immediately
                  onSelectOption(opt.value, opt.label);
                  setOpen(false);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default AutocompleteInput;
