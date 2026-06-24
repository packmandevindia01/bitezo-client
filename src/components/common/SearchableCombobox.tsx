import { ChevronDown, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { handleFocusNextInput } from "../../utils/keyboard";

export interface SearchableOption {
  label: string;
  value: string;
  [key: string]: any;
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
  clearable?: boolean;
  autoFocus?: boolean;
  tabIndex?: number;
  labelIcon?: React.ReactNode;
  onKeyDown?: (e: React.KeyboardEvent<any>) => void;
  onSearch?: (query: string) => void;
  loading?: boolean;
  className?: string;
  minQueryLength?: number;
  forcePlacement?: "top" | "bottom";
}

const SearchableCombobox = ({
  id,
  label,
  options = [],
  value = "",
  onChange,
  placeholder = "Search or select…",
  required,
  disabled,
  error,
  clearable = true,
  autoFocus = false,
  tabIndex,
  labelIcon,
  onKeyDown,
  onSearch,
  loading,
  className = "",
  minQueryLength = 0,
  forcePlacement,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, placement: "bottom" as "top" | "bottom" });
  const lastMousePos = useRef({ x: 0, y: 0 });

  const textSizeClass = className.includes('text-[10px]') ? 'text-[10px]' :
                        className.includes('text-xs') ? 'text-xs' :
                        className.includes('text-lg') ? 'text-lg' : 'text-sm';

  // Sync query with selected label when closed or value changes
  useEffect(() => {
    if (!focused) {
      const selectedLabel = options.find((o) => String(o.value) === String(value))?.label;
      if (selectedLabel) {
        setQuery(selectedLabel);
      } else if (!value) {
        setQuery("");
      }
    }
  }, [value, options, focused]);

  const meetsMinQuery = query.trim().length >= minQueryLength;

  const filtered = !meetsMinQuery
    ? []
    : onSearch
    ? options
    : query.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  useEffect(() => {
    if (onSearch) {
      if (query.trim().length < minQueryLength) return;
      
      const timer = setTimeout(() => {
        onSearch(query.trim());
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [query, onSearch, minQueryLength]);

  useEffect(() => {
    setHighlightedIndex(filtered.length > 0 ? 0 : -1);
  }, [filtered.length]);

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const listEl = listRef.current;
      const highlightedEl = listEl.children[highlightedIndex] as HTMLElement;
      
      if (highlightedEl) {
        const itemTop = highlightedEl.offsetTop;
        const itemBottom = itemTop + highlightedEl.offsetHeight;
        const listTop = listEl.scrollTop;
        const listBottom = listTop + listEl.clientHeight;

        if (itemTop < listTop) {
          listEl.scrollTop = itemTop;
        } else if (itemBottom > listBottom) {
          listEl.scrollTop = itemBottom - listEl.clientHeight;
        }
      }
    }
  }, [highlightedIndex]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if ((e.target as HTMLElement).closest(".combobox-portal-content")) return;
        setOpen(false);
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useLayoutEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 280;
      
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      const placement = forcePlacement ? forcePlacement : (spaceBelow < dropdownHeight && spaceAbove > spaceBelow ? "top" : "bottom");

      setCoords({
        top: placement === "bottom" ? rect.bottom : rect.top,
        left: rect.left,
        width: rect.width,
        placement
      });
    }
  }, [open, forcePlacement]);

  useEffect(() => {
    if (!open) return;
    const handleUpdate = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const dropdownHeight = 280;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const placement = forcePlacement ? forcePlacement : (spaceBelow < dropdownHeight && spaceAbove > spaceBelow ? "top" : "bottom");
        const newTop = placement === "bottom" ? rect.bottom : rect.top;

        setCoords(prev => {
          if (prev.top === newTop && prev.left === rect.left && prev.width === rect.width && prev.placement === placement) return prev;
          return { top: newTop, left: rect.left, width: rect.width, placement };
        });
      }
    };
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);
    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
    };
  }, [open, forcePlacement]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
    }

    switch (e.key) {
      case "ArrowDown":
        setHighlightedIndex((prev) => (prev + 1) % filtered.length);
        break;
      case "ArrowUp":
        setHighlightedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
        break;
      case "Enter":
        e.preventDefault();
        e.stopPropagation();
        if (open && highlightedIndex >= 0 && highlightedIndex < filtered.length) {
          handleSelect(filtered[highlightedIndex].value);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        inputRef.current?.blur();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
    
    if (onKeyDown) onKeyDown(e);
  };

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    
    const opt = options.find((o) => String(o.value) === String(optValue));
    if (opt) setQuery(opt.label);
    
    setOpen(false);
    
    // Focus the next logical input field after a tiny delay
    setTimeout(() => {
      if (inputRef.current) {
        handleFocusNextInput(inputRef.current);
      }
    }, 50);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
    inputRef.current?.focus();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setOpen(true);
  };

  return (
    <div className="flex flex-col gap-1 mb-1 w-full relative">
      {label && (
        <label 
          htmlFor={id}
          className="flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-600 cursor-pointer w-fit mb-0.5"
          onClick={() => {
            if (disabled) return;
            inputRef.current?.focus();
          }}
        >
          {labelIcon && <span className="shrink-0 mr-1">{labelIcon}</span>}
          <span>{label}</span>
          {required && <span className="text-red-500 ml-1 font-bold">*</span>}
          {error && <span className="text-[10px] text-red-500 font-bold ml-2 normal-case">({error})</span>}
        </label>
      )}

      <div
        ref={containerRef}
        className={`
          relative flex w-full cursor-text items-center gap-2
          rounded-md border px-3 transition md:px-4
          ${textSizeClass}
          ${className.includes('h-') ? '' : 'h-10.5'}
          ${className}
          ${error ? "border-red-500 bg-red-50/30" : "border-gray-300 bg-white"}
          ${disabled ? "cursor-not-allowed bg-gray-100 opacity-50" : ""}
          ${open || focused ? "border-[#49293e] ring-1 ring-[#49293e]/20" : "hover:border-gray-400"}
        `}
        onClick={() => {
          if (!disabled) {
            inputRef.current?.focus();
          }
        }}
      >
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setFocused(true);
            setOpen(true);
            inputRef.current?.select();
          }}
          onBlur={() => {
            // Delay blur slightly so click on dropdown can register
            setTimeout(() => {
              setFocused(false);
            }, 150);
          }}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          tabIndex={disabled ? -1 : (tabIndex ?? 0)}
          className={`flex-1 w-full min-w-0 bg-transparent outline-none text-gray-900 placeholder:text-gray-400 ${textSizeClass}`}
          autoComplete="off"
        />

        {clearable && value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            onMouseDown={(e) => e.stopPropagation()}
            className="clear-btn shrink-0 text-gray-400 hover:text-gray-600 p-1 -mr-1"
            tabIndex={-1}
            aria-label="Clear selection"
          >
            <X size={14} />
          </button>
        )}

        {loading && (open || focused) ? (
          <Loader2 size={16} className="animate-spin shrink-0 text-gray-400" />
        ) : (
          <ChevronDown
            size={16}
            className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              if (disabled) return;
              if (open) {
                setOpen(false);
              } else {
                inputRef.current?.focus();
                setOpen(true);
              }
            }}
          />
        )}
      </div>

      {open && coords.width > 0 && createPortal(
        <div 
          className="fixed z-[10001] combobox-portal-content"
          style={{
            top: coords.placement === "bottom" ? coords.top + 4 : coords.top - 4,
            left: coords.left,
            width: coords.width,
            transform: coords.placement === "top" ? "translateY(-100%)" : "none"
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className={`
            w-full rounded-md border border-gray-200 bg-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] duration-100
            ${coords.placement === "bottom" ? "animate-in fade-in zoom-in-95" : "animate-in fade-in slide-in-from-bottom-2"}
          `}>
            <ul
              ref={listRef}
              role="listbox"
              className="max-h-48 overflow-y-auto py-1"
            >
              {loading ? (
                <li className={`px-4 py-2 text-gray-400 ${textSizeClass}`}>Loading...</li>
              ) : !meetsMinQuery ? (
                <li className={`px-4 py-2 text-gray-400 ${textSizeClass}`}>Start typing to search...</li>
              ) : filtered.length === 0 ? (
                <li className={`px-4 py-2 text-gray-400 ${textSizeClass}`}>No options found</li>
              ) : (
                filtered.map((opt, index) => (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={String(opt.value) === String(value)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(opt.value);
                    }}
                    onMouseMove={(e) => {
                      if (lastMousePos.current.x === e.clientX && lastMousePos.current.y === e.clientY) return;
                      lastMousePos.current = { x: e.clientX, y: e.clientY };
                      if (highlightedIndex !== index) setHighlightedIndex(index);
                    }}
                    className={`
                      cursor-pointer px-3 transition flex items-center
                      ${className.includes('h-') ? className.match(/h-\d+(\.\d+)?/)?.[0] : 'py-2.5'}
                      ${textSizeClass}
                      ${index === highlightedIndex ? "bg-[#49293e]/10 text-[#49293e]" : "text-gray-700"}
                      ${String(opt.value) === String(value) ? "font-bold underline decoration-[#49293e]/30 underline-offset-4" : ""}
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
    </div>
  );
};

export default SearchableCombobox;
