import { ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState, useLayoutEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import { handleFocusNextInput } from "../../utils/keyboard";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  /** Show a clear (×) button when a value is selected. Default: true */
  clearable?: boolean;
  allowClear?: boolean;
  autoFocus?: boolean;
  tabIndex?: number;
  labelIcon?: React.ReactNode;
  onKeyDown?: (e: React.KeyboardEvent<any>) => void;
  onSearch?: (query: string) => void;
  onBarcodeScan?: (barcode: string) => void;
  loading?: boolean;
  className?: string;
  minQueryLength?: number;
  forcePlacement?: "top" | "bottom";
  disableAutoOpenOnFocus?: boolean;
  hideErrorText?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

const SearchableSelect = forwardRef<HTMLDivElement, Props>(({
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
  disableAutoOpenOnFocus = false,
  hideErrorText = false,
}, ref) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  
  useImperativeHandle(ref, () => triggerRef.current as HTMLDivElement);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, placement: "bottom" as "top" | "bottom" });
  const [inputElement, setInputElement] = useState<HTMLInputElement | null>(null);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const inputCallbackRef = useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node;
    setInputElement(node);
  }, []);

  // Auto focus logic
  useEffect(() => {
    if (autoFocus && triggerRef.current && !disabled) {
      triggerRef.current.focus();
      if (!disableAutoOpenOnFocus) {
        setOpen(true);
      }
    }
  }, [autoFocus, disabled, disableAutoOpenOnFocus]);

  // Preserve last known label for a valid value so temporary option reloading/emptying doesn't display raw IDs
  const lastKnownLabelRef = useRef<{ value: string; label: string }>({ value: "", label: "" });

  const foundOption = options.find((o) => String(o.value) === String(value));
  if (foundOption && String(value) !== "0" && value !== "") {
    lastKnownLabelRef.current = { value: String(value), label: foundOption.label };
  }

  // Derive selected label from value - robust comparison. Fallback to last known label, then value if not found
  const selectedLabel = foundOption?.label ?? (
    lastKnownLabelRef.current.value === String(value) && String(value) !== "" && String(value) !== "0"
      ? lastKnownLabelRef.current.label
      : (String(value) === "0" ? "" : value)
  );

  // Filtered options based on search query
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

  // Reset highlighted index when filtered list changes
  useEffect(() => {
    setHighlightedIndex(query.trim().length > 0 && filtered.length > 0 ? 0 : -1);
  }, [filtered.length, query]);

  // Scroll highlighted item into view manually without triggering page scroll
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
        // If clicking inside a portal, don't close
        if ((e.target as HTMLElement).closest(".select-portal-content")) return;
        
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
      // Force bottom placement unless explicitly overridden, as requested by user
      const placement = forcePlacement ? forcePlacement : "bottom";

      setCoords({
        top: placement === "bottom" ? rect.bottom : rect.top,
        left: rect.left,
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
        const placement = forcePlacement ? forcePlacement : "bottom";
        const newTop = placement === "bottom" ? rect.bottom : rect.top;

        setCoords(prev => {
          if (prev.top === newTop && prev.left === rect.left && prev.width === rect.width && prev.placement === placement) {
            return prev;
          }
          return {
            top: newTop,
            left: rect.left,
            width: rect.width,
            placement
          };
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

  // Focus input when dropdown opens and input mounts (only on non-touch/large screens)
  useEffect(() => {
    if (open && inputElement && window.innerWidth > 1024) {
      const timer = setTimeout(() => {
        inputElement.focus();
      }, 10); // small delay ensures browser paints portal
      return () => clearTimeout(timer);
    }
  }, [open, inputElement]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

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
        if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
          e.preventDefault();
          e.stopPropagation();
          handleSelect(filtered[highlightedIndex].value);
        } else if (filtered.length === 1 && query.trim().length > 0) {
          // If only one option and user typed something, select it on Enter
          e.preventDefault();
          e.stopPropagation();
          handleSelect(filtered[0].value);
        } else {
          // Nothing selected, close and forward Enter to parent
          setOpen(false);
          setQuery("");
          if (onKeyDown) onKeyDown(e);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setQuery("");
        triggerRef.current?.focus();
        break;
      case "Tab":
        // Do not e.preventDefault() here, we want the browser to move focus
        setOpen(false);
        setQuery("");
        triggerRef.current?.focus();
        break;
    }
  };

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setOpen(false);
    setQuery("");
    // Focus the next logical input field after a tiny delay 
    // to prevent 'keyup' events from accidentally clicking newly focused buttons
    setTimeout(() => {
      if (triggerRef.current) {
        handleFocusNextInput(triggerRef.current);
      }
    }, 50);
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

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    // Always prevent page scroll for up/down arrows when interacting with the select
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
    }

    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setOpen(true);
      } else {
        if (onKeyDown) onKeyDown(e);
      }
    } else {
      // If open but focus is mysteriously still on the trigger, handle navigation directly
      if (e.key === "ArrowDown") {
        setHighlightedIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        setHighlightedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
          e.preventDefault();
          e.stopPropagation();
          handleSelect(filtered[highlightedIndex].value);
        } else {
          setOpen(false);
          if (onKeyDown) onKeyDown(e);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      } else {
        if (onKeyDown) onKeyDown(e);
      }
    }
    
    onKeyDown?.(e);
  };

  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBlur = (e: React.FocusEvent) => {
    const newFocus = e.relatedTarget as Node | null;
    const isInsideContainer = containerRef.current?.contains(newFocus);
    const isInsidePortal = newFocus && (newFocus as HTMLElement).closest(".select-portal-content");
    
    if (!isInsideContainer && !isInsidePortal) {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      blurTimerRef.current = setTimeout(() => {
        setOpen(false);
      }, 150);
    }
  };

  return (
    <div className="flex flex-col justify-end gap-1 mb-1 w-full min-w-0 relative h-full" ref={containerRef} onBlur={handleBlur}>
      {/* Label */}
      {label && (
        <label 
          htmlFor={id}
          className="flex items-center whitespace-nowrap overflow-hidden text-[10px] font-bold uppercase tracking-widest text-slate-600 cursor-pointer min-w-0 mb-0.5"
          onClick={() => {
            if (disabled) return;
            triggerRef.current?.focus();
            setOpen(true);
          }}
        >
          {labelIcon && <span className="shrink-0 mr-1">{labelIcon}</span>}
          <span className="truncate shrink">{label}</span>
          {required && <span className="text-red-500 ml-1 font-bold shrink-0">*</span>}
          {error && <span className="text-[10px] text-red-500 font-bold ml-2 normal-case truncate shrink" title={error}>({error.toLowerCase().includes('required') ? 'required' : error})</span>}
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
        onMouseDown={(e) => {
          if (disabled) return;
          // If clicking the clear button, don't toggle open here
          if ((e.target as HTMLElement).closest(".clear-btn")) return;
          
          e.preventDefault(); // Prevent trigger focus to avoid flash, we'll focus the search input
          toggleOpen();
        }}
        onFocus={() => {
          if (disabled) return;
          if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
          if (!open && !disableAutoOpenOnFocus) {
            setOpen(true);
          }
        }}
        onKeyDown={handleTriggerKeyDown}
        className={`
          relative flex w-full cursor-pointer items-center gap-2
          rounded-md border px-3 text-xs outline-none transition md:px-3
          ${className.includes('h-') ? '' : 'h-9'}
          ${className}
          ${disabled ? "cursor-not-allowed bg-gray-100 opacity-50 border-gray-300" : (error ? "border-red-500 bg-red-50/30" : "border-gray-300 bg-white")}
          ${!disabled && open ? "border-[#49293e] ring-1 ring-[#49293e]/20" : (!disabled ? "hover:border-gray-400 focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20" : "")}
        `}
      >
        {/* Displayed value or placeholder */}
        <span className={`flex-1 truncate ${!selectedLabel ? "text-gray-400 font-normal" : "text-gray-900 font-medium"}`}>
          {selectedLabel || placeholder}
        </span>

        {/* Clear button */}
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

        {/* Chevron */}
        <ChevronDown
          size={16}
          className={`shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </div>

      {/* Dropdown - Portaled */}
      {open && coords.width > 0 && createPortal(
        <div 
          className="fixed z-[10001] select-portal-content"
          style={{
            top: coords.placement === "bottom" ? coords.top + 4 : coords.top - 4,
            left: coords.left,
            width: coords.width,
            transform: coords.placement === "top" ? "translateY(-100%)" : "none"
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className={`
            w-full rounded-md border border-gray-200 bg-white shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] duration-100
            ${coords.placement === "bottom" ? "animate-in fade-in zoom-in-95" : "animate-in fade-in slide-in-from-bottom-2"}
          `}>
            {/* Search input */}
            <div className="border-b border-gray-100 p-1.5">
              <input
                ref={inputCallbackRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Type to search…"
                className={`w-full rounded border border-gray-200 px-2 py-1 outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 text-xs`}
              />
            </div>

            {/* Options list */}
            <ul
              ref={listRef}
              role="listbox"
              className="max-h-40 overflow-y-auto py-1"
            >
              {loading && open ? (
                <li className="px-3 py-1.5 text-gray-400 text-xs">Loading...</li>
              ) : !meetsMinQuery ? (
                <li className="px-3 py-1.5 text-gray-400 text-xs">Start typing to search...</li>
              ) : filtered.length === 0 ? (
                <li className="px-3 py-1.5 text-gray-400 text-xs">No options found</li>
              ) : (
                filtered.map((opt, index) => (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={String(opt.value) === String(value)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
                      handleSelect(opt.value);
                    }}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
                      handleSelect(opt.value);
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
                      handleSelect(opt.value);
                    }}
                    onMouseMove={(e) => {
                      if (lastMousePos.current.x === e.clientX && lastMousePos.current.y === e.clientY) return;
                      lastMousePos.current = { x: e.clientX, y: e.clientY };
                      if (highlightedIndex !== index) setHighlightedIndex(index);
                    }}
                    className={`
                      cursor-pointer px-3 py-1.5 transition flex items-center min-h-[28px] text-xs
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

      {/* Error is rendered inline in the label, or fallback if no label */}
      {error && !label && !hideErrorText && (
        <span className="mt-0.5 block text-[10px] font-bold text-red-500 truncate" title={error}>
          {error.toLowerCase().includes('required') ? 'required' : error}
        </span>
      )}
    </div>
  );
});

export default SearchableSelect;