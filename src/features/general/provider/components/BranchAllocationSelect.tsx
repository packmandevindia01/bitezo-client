import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X, Check } from "lucide-react";

export interface BranchOption {
  id: number;
  name: string;
}

interface BranchAllocationSelectProps {
  id?: string;
  branchOptions: BranchOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
  error?: string;
  tabIndex?: number;
}

export const BranchAllocationSelect: React.FC<BranchAllocationSelectProps> = ({
  id = "prov-branch-select",
  branchOptions = [],
  selectedIds = [],
  onChange,
  disabled = false,
  error,
  tabIndex = 4,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
    placement: "top" | "bottom";
  }>({
    top: 0,
    left: 0,
    width: 0,
    placement: "bottom",
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  // Calculate coordinates for portal rendering
  useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const placement = spaceBelow < 220 && rect.top > spaceBelow ? "top" : "bottom";

      setCoords({
        top: placement === "bottom" ? rect.bottom + 4 : rect.top - 4,
        left: rect.left,
        width: rect.width,
        placement,
      });
    }
  }, [isOpen]);

  // Recalculate coordinates on window scroll or resize
  useEffect(() => {
    if (!isOpen) return;
    const handleUpdate = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const placement = spaceBelow < 220 && rect.top > spaceBelow ? "top" : "bottom";

        setCoords((prev) => {
          const newTop = placement === "bottom" ? rect.bottom + 4 : rect.top - 4;
          if (
            prev.top === newTop &&
            prev.left === rect.left &&
            prev.width === rect.width &&
            prev.placement === placement
          ) {
            return prev;
          }
          return {
            top: newTop,
            left: rect.left,
            width: rect.width,
            placement,
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
  }, [isOpen]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !target.closest(".branch-select-portal")
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOne = (branchId: number) => {
    if (disabled) return;
    if (selectedIds.includes(branchId)) {
      onChange(selectedIds.filter((id) => id !== branchId));
    } else {
      onChange([...selectedIds, branchId]);
    }
  };

  const handleSelectAll = () => {
    if (disabled) return;
    if (selectedIds.length === branchOptions.length) {
      onChange([]);
    } else {
      onChange(branchOptions.map((b: any) => b.id ?? b.branchId));
    }
  };

  const filteredOptions = branchOptions.filter((b: any) =>
    String(b.name ?? b.branchName ?? "").toLowerCase().includes(search.trim().toLowerCase())
  );

  const selectedBranches = branchOptions.filter((b: any) => selectedIds.includes(b.id ?? b.branchId));
  const isAllSelected = branchOptions.length > 0 && selectedIds.length === branchOptions.length;
  const totalItems = branchOptions.length === 0 ? 0 : 1 + filteredOptions.length;

  // Auto-scroll the active item into view
  useEffect(() => {
    if (isOpen && activeIndex >= 0 && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex]?.scrollIntoView({
        block: "nearest",
      });
    }
  }, [isOpen, activeIndex]);

  // Reset or initialize active index when open state changes
  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(-1);
    } else {
      setActiveIndex((prev) => (prev >= 0 ? prev : (branchOptions.length > 0 ? 0 : -1)));
    }
  }, [isOpen, branchOptions.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
        setActiveIndex(0);
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (totalItems > 0) {
        setActiveIndex((prev) => (prev + 1) % totalItems);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (totalItems > 0) {
        setActiveIndex((prev) => (prev - 1 + totalItems) % totalItems);
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (activeIndex === 0) {
        handleSelectAll();
      } else if (activeIndex > 0 && activeIndex <= filteredOptions.length) {
        const branch: any = filteredOptions[activeIndex - 1];
        if (branch) {
          toggleOne(branch.id ?? branch.branchId);
        }
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === "Tab") {
      setIsOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-1 w-full relative" ref={containerRef}>
      {/* Label Row */}
      <div className="flex items-center justify-between mb-0.5">
        <label
          htmlFor={id}
          className="flex items-center gap-1 whitespace-nowrap overflow-hidden text-[10px] font-bold uppercase tracking-widest text-slate-600 cursor-pointer"
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <span>Branch Allocation</span>
          <span className="text-red-500 font-bold">*</span>
        </label>
        {error && (
          <span className="text-xs text-red-500 font-medium">{error}</span>
        )}
      </div>

      {/* Trigger Button */}
      <div
        id={id}
        ref={triggerRef}
        tabIndex={disabled ? -1 : tabIndex}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full bg-white border rounded-lg px-3 py-1.5 min-h-[38px] text-xs font-semibold text-[#49293e] focus:outline-none transition-all shadow-sm flex items-center justify-between cursor-pointer ${
          disabled
            ? "opacity-50 cursor-not-allowed bg-slate-50 border-slate-200"
            : error
            ? "border-red-500 bg-red-50/20 ring-1 ring-red-500/30"
            : isOpen
            ? "border-[#49293e] ring-1 ring-[#49293e]/20"
            : "border-slate-300 hover:border-slate-400 focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20"
        }`}
      >
        <div className="flex flex-wrap gap-1.5 flex-1 items-center mr-2">
          {branchOptions.length === 0 ? (
            <span className="text-gray-400 font-normal text-xs">No branches available</span>
          ) : selectedIds.length === 0 ? (
            <span className="text-gray-400 font-normal text-xs">Select branches...</span>
          ) : isAllSelected ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#49293e]/10 text-[#49293e] text-xs font-semibold">
              All Branches ({branchOptions.length})
            </span>
          ) : (
            selectedBranches.map((b: any) => {
              const bId = b.id ?? b.branchId;
              const bName = b.name ?? b.branchName;
              return (
                <span
                  key={bId}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#49293e]/10 text-[#49293e] text-xs font-medium"
                >
                  <span>{bName}</span>
                  <X
                    size={12}
                    className="hover:text-red-500 cursor-pointer shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOne(bId);
                    }}
                  />
                </span>
              );
            })
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      {/* Dropdown Menu - Portaled to document.body to avoid clipping by modal overflow */}
      {isOpen && coords.width > 0 && createPortal(
        <div
          className="fixed z-[10001] branch-select-portal"
          style={{
            top: coords.top,
            left: coords.left,
            width: coords.width,
            transform: coords.placement === "top" ? "translateY(-100%)" : "none",
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-100">
            {/* Action Row: Select All / Search */}
            <div className="flex items-center justify-between gap-2 pb-2 mb-1 border-b border-slate-100 px-1">
              <button
                ref={(el) => {
                  itemRefs.current[0] = el;
                }}
                type="button"
                onClick={handleSelectAll}
                onMouseEnter={() => setActiveIndex(0)}
                className={`text-[11px] font-semibold text-[#49293e] hover:underline px-1.5 py-0.5 rounded transition-colors ${
                  activeIndex === 0 ? "bg-[#49293e]/15 ring-1 ring-[#49293e]/30" : ""
                }`}
              >
                {isAllSelected ? "Deselect All" : "Select All"}
              </button>
              {branchOptions.length > 4 && (
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setActiveIndex(1);
                      triggerRef.current?.focus();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      setIsOpen(false);
                      triggerRef.current?.focus();
                    }
                  }}
                  placeholder="Filter branches..."
                  className="text-xs px-2 py-1 border border-slate-200 rounded-md focus:outline-none focus:border-[#49293e] w-36"
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>

            {/* Options List */}
            <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5">
              {filteredOptions.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center italic">No branches found</p>
              ) : (
                filteredOptions.map((branch: any, idx) => {
                  const bId = branch.id ?? branch.branchId;
                  const bName = branch.name ?? branch.branchName;
                  const itemIndex = idx + 1;
                  const isSelected = selectedIds.includes(bId);
                  const isActive = activeIndex === itemIndex;

                  return (
                    <div
                      key={bId}
                      ref={(el) => {
                        itemRefs.current[itemIndex] = el;
                      }}
                      onClick={() => toggleOne(bId)}
                      onMouseEnter={() => setActiveIndex(itemIndex)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-xs ${
                        isActive
                          ? "bg-[#49293e]/15 ring-1 ring-[#49293e]/30 font-semibold text-[#49293e]"
                          : isSelected
                          ? "bg-[#49293e]/8 text-[#49293e] font-medium"
                          : "text-slate-700 hover:bg-slate-50 font-normal"
                      }`}
                    >
                      <span>{bName}</span>
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                          isSelected
                            ? "bg-[#49293e] border-[#49293e] text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
