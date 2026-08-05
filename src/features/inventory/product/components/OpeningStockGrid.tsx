import React, { useRef, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { formatAmount, sanitizeAmountInput } from "../../../../utils/formatters";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import { SearchableSelect } from "../../../../components/common";
import { useToast } from "../../../../app/providers/useToast";
import type { ProductMasterData, MasterItem } from "../types";
import type { OpeningStockDraft } from "../schema/productSchema";

interface OpeningStockGridProps {
  openingStocks: OpeningStockDraft[];
  masterData: ProductMasterData | null;
  branches: MasterItem[];
  mainUnitId: string;
  mainBranchId: string;
  defaultCost?: string;
  onOpeningStocksChange: (stocks: OpeningStockDraft[]) => void;
}

export const OpeningStockGrid = ({
  openingStocks,
  masterData,
  branches,
  mainUnitId,
  mainBranchId,
  defaultCost,
  onOpeningStocksChange,
}: OpeningStockGridProps) => {
  const { showToast } = useToast();
  const [focusPos, setFocusPos] = useState({ r: 0, c: 0 });
  const decimalPart = useAppSelector(selectDecimalPart);
  const cellRefs = useRef<Map<string, HTMLElement>>(new Map());
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const nextRowId = useRef(-1);
  const isInitialMount = useRef(true);
  const TOTAL_COLS = 4; // Editable columns: Branch, Unit, Qty, Cost

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (openingStocks.length === 0) {
        addButtonRef.current?.focus();
      }
      return;
    }

    if (openingStocks.length === 0) {
      addButtonRef.current?.focus();
      return;
    }

    const key = `${focusPos.r}-${focusPos.c}`;
    const el = cellRefs.current.get(key) ?? document.getElementById(`stock-branch-${focusPos.r}`);
    if (el) {
      el.focus();
      if (el instanceof HTMLInputElement) el.select();
    }
  }, [focusPos, openingStocks.length]);

  const validBranches = branches.filter(b => b.name.toLowerCase() !== "all");
  const branchOptions = validBranches.map(b => ({ label: b.name, value: String(b.id) }));

  const mainUnitSelected = masterData?.unit?.find(u => String(u.id) === String(mainUnitId));
  const mainUnitCategory = mainUnitSelected?.category;

  const altUnitOptions = masterData?.unit
    ?.filter(u => {
      if (!mainUnitCategory || !u.category) return true;
      return u.category.toLowerCase().trim() === mainUnitCategory.toLowerCase().trim();
    })
    .map(u => ({ label: u.name, value: String(u.id) })) ?? [];

  const isDuplicateEntry = (branchId: number, unitId: number, excludeIdx: number): string | null => {
    for (let i = 0; i < openingStocks.length; i++) {
      if (i === excludeIdx) continue;
      const other = openingStocks[i];
      if (parseInt(String(other.branchId)) === branchId && parseInt(String(other.unitId)) === unitId) {
        return `Opening stock for this Branch and Unit already exists in row ${i + 1}`;
      }
    }
    return null;
  };

  const handleGridChange = (idx: number, key: keyof OpeningStockDraft, value: OpeningStockDraft[keyof OpeningStockDraft]) => {
    const next = [...openingStocks];
    
    if (key === "branchId" || key === "unitId") {
      const bId = key === "branchId" ? parseInt(String(value)) : parseInt(String(next[idx].branchId || "0"));
      const uId = key === "unitId" ? parseInt(String(value)) : parseInt(String(next[idx].unitId || "0"));
      if (!isNaN(bId) && !isNaN(uId) && bId > 0 && uId > 0) {
        const error = isDuplicateEntry(bId, uId, idx);
        if (error) {
          showToast(error, "warning");
          return;
        }
      }
    }

    const updated = { ...next[idx], [key]: value };
    // Automatically keep baseQty in sync when qty changes unless user manually altered baseQty
    if (key === "qty" && (!next[idx].baseQty || next[idx].baseQty === next[idx].qty)) {
      updated.baseQty = String(value);
    }

    next[idx] = updated;
    onOpeningStocksChange(next);
  };

  const addGridRow = () => {
    const nextRowIndex = openingStocks.length;
    const usedBranchIds = new Set(openingStocks.map(s => String(s.branchId)));
    const defaultBranch = validBranches.find(b => !usedBranchIds.has(String(b.id)))?.id;
    const initialBranchId = defaultBranch !== undefined ? String(defaultBranch) : (validBranches.length > 0 ? String(validBranches[0].id) : "");
    const initialUnitId = mainUnitId || (altUnitOptions.length > 0 ? String(altUnitOptions[0].value) : "");
    const initialCost = defaultCost ? Number(defaultCost).toFixed(decimalPart) : formatAmount(0, decimalPart);

    const newRow: any = {
      id: nextRowId.current,
      branchId: initialBranchId,
      unitId: initialUnitId,
      qty: "1",
      cost: initialCost,
      baseQty: "1",
    };
    nextRowId.current -= 1;
    onOpeningStocksChange([...openingStocks, newRow]);
    
    // Auto-focus the Qty column (c=2) if Branch and Unit defaulted successfully, otherwise Branch (c=0)
    const startCol = (initialBranchId && initialUnitId) ? 2 : 0;
    setFocusPos({ r: nextRowIndex, c: startCol });
  };

  const removeGridRow = (idx: number) => {
    onOpeningStocksChange(openingStocks.filter((_, i) => i !== idx));
    if (focusPos.r >= openingStocks.length - 1) {
      setFocusPos(p => ({ ...p, r: Math.max(0, openingStocks.length - 2) }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, r: number, c: number) => {
    const isLastRow = r === openingStocks.length - 1;
    const isLastCol = c === TOTAL_COLS - 1;

    switch (e.key) {
      case "Enter":
        e.preventDefault();
        if (isLastRow && c === 0 && !openingStocks[r].branchId) {
          removeGridRow(r);
          setTimeout(() => {
            document.getElementById("prod-save-btn")?.focus();
          }, 50);
          return;
        }
        
        if (isLastCol) {
          if (isLastRow) {
            addGridRow();
          } else {
            setFocusPos({ r: r + 1, c: 0 });
          }
        } else {
          setFocusPos({ r, c: c + 1 });
        }
        break;
      case "Tab":
        if (isLastCol && isLastRow && !e.shiftKey) {
          e.preventDefault();
          addGridRow();
          setFocusPos({ r: r + 1, c: 0 });
        }
        break;
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        addGridRow();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [openingStocks, mainBranchId, mainUnitId, defaultCost, branches]);

  const calcRowValues = (stock: OpeningStockDraft) => {
    const q = Number(stock.qty) || 0;
    const c = Number(stock.cost) || 0;
    const amt = q * c;
    const unitObj = masterData?.unit?.find(u => String(u.id) === String(stock.unitId));
    const uVal = unitObj?.currentvalue !== undefined && unitObj?.currentvalue !== null ? Number(unitObj.currentvalue) : 1;
    const bQty = q * (isNaN(uVal) ? 1 : uVal);
    return { amt, bQty };
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-2 duration-300">
      <div className="flex items-center justify-end mb-3">
        <div className="flex gap-2 text-[9px] font-bold uppercase tracking-widest text-[#49293e]/40">
           <span>Arrows: Nav</span> • <span>Enter: Add Row</span>
        </div>
      </div>
      
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="max-h-[250px] overflow-auto">
          <table className="w-full border-collapse text-left table-fixed">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="sticky top-0 bg-gray-50 z-10 w-[24%] px-2 py-1 text-left text-[9px] font-bold uppercase tracking-widest text-[#49293e]/60">Branch</th>
                <th className="sticky top-0 bg-gray-50 z-10 w-[20%] px-2 py-1 text-left text-[9px] font-bold uppercase tracking-widest text-[#49293e]/60 border-l border-gray-200">Unit</th>
                <th className="sticky top-0 bg-gray-50 z-10 w-[14%] px-2 py-1 text-right text-[9px] font-bold uppercase tracking-widest text-[#49293e]/60 border-l border-gray-200">Qty</th>
                <th className="sticky top-0 bg-gray-50 z-10 w-[14%] px-2 py-1 text-right text-[9px] font-bold uppercase tracking-widest text-[#49293e]/60 border-l border-gray-200">Cost</th>
                <th className="sticky top-0 bg-gray-50 z-10 w-[14%] px-2 py-1 text-right text-[9px] font-bold uppercase tracking-widest text-[#49293e]/60 border-l border-gray-200">Amount</th>
                <th className="sticky top-0 bg-gray-50 z-10 w-[14%] px-2 py-1 text-right text-[9px] font-bold uppercase tracking-widest text-[#49293e]/60 border-l border-gray-200">Base Qty</th>
                <th className="sticky top-0 bg-gray-50 z-10 w-8 px-1 py-1 border-l border-gray-200"></th>
              </tr>
            </thead>
            <tbody>
              {openingStocks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-4 text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                    No opening stock records added.
                  </td>
                </tr>
              ) : (
                openingStocks.map((stock, rIdx) => {
                  const { amt, bQty } = calcRowValues(stock);
                  return (
                    <tr key={stock.id ?? rIdx} className="group border-b border-gray-100 transition-colors hover:bg-gray-50/50">
                      <td className="p-0 border-r border-gray-100">
                        <div
                          onFocus={() => setFocusPos({ r: rIdx, c: 0 })}
                          className="px-0.5 py-0"
                        >
                          <SearchableSelect
                            ref={(el) => { if (el) cellRefs.current.set(`${rIdx}-0`, el); }}
                            key={`stock-branch-${rIdx}-${stock.id}`}
                            id={`stock-branch-${rIdx}`}
                            options={branchOptions}
                            value={String(stock.branchId || "")}
                            onChange={(value) => handleGridChange(rIdx, "branchId", value)}
                            onKeyDown={(e) => handleKeyDown(e, rIdx, 0)}
                            placeholder="Branch"
                            clearable={false}
                            className="h-8 w-full border-none !bg-transparent text-left text-sm font-bold shadow-none focus-within:bg-white focus-within:ring-1 focus-within:ring-[#49293e]/10 [&>button]:!bg-transparent [&>button]:!border-none [&>button]:!shadow-none [&>button]:!ring-0 [&>button]:hover:!bg-transparent"
                          />
                        </div>
                      </td>
                      <td className="p-0 border-r border-gray-100">
                        <div
                          onFocus={() => setFocusPos({ r: rIdx, c: 1 })}
                          className="px-0.5 py-0"
                        >
                          <SearchableSelect
                            key={`stock-unit-${rIdx}-${stock.id}`}
                            id={`stock-unit-${rIdx}`}
                            options={altUnitOptions.length > 0 ? altUnitOptions : (masterData?.unit?.map(u => ({ label: u.name, value: String(u.id) })) ?? [])}
                            value={String(stock.unitId || "")}
                            onChange={(value) => handleGridChange(rIdx, "unitId", value)}
                            onKeyDown={(e) => handleKeyDown(e, rIdx, 1)}
                            placeholder="Unit"
                          />
                        </div>
                      </td>
                      <td className="p-0 border-r border-gray-100">
                        <input
                          ref={(el) => { if (el) cellRefs.current.set(`${rIdx}-2`, el); }}
                          type="text"
                          inputMode="decimal"
                          value={stock.qty}
                          onFocus={(e) => {
                            setFocusPos({ r: rIdx, c: 2 });
                            e.target.select();
                          }}
                          onKeyDown={(e) => handleKeyDown(e, rIdx, 2)}
                          onChange={(e) => {
                            let next = sanitizeAmountInput(e.target.value, decimalPart);
                            if (next !== null) {
                              if (next.length > 15) next = next.slice(0, 15);
                              handleGridChange(rIdx, "qty", next);
                            }
                          }}
                          onBlur={(e) => {
                            if (e.target.value !== "" && e.target.value !== ".") {
                              const num = Number(e.target.value);
                              handleGridChange(rIdx, "qty", isNaN(num) ? "0" : String(num));
                            } else {
                              handleGridChange(rIdx, "qty", "0");
                            }
                          }}
                          className="h-8 w-full border-none bg-transparent px-2 py-0 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-1 focus:ring-[#49293e]/10 font-mono text-right"
                          style={{ textAlign: "right" }}
                        />
                      </td>
                      <td className="p-0 border-r border-gray-100">
                        <input
                          ref={(el) => { if (el) cellRefs.current.set(`${rIdx}-3`, el); }}
                          type="text"
                          inputMode="decimal"
                          value={stock.cost === "0" ? formatAmount(0, decimalPart) : stock.cost}
                          onFocus={(e) => {
                            setFocusPos({ r: rIdx, c: 3 });
                            e.target.select();
                          }}
                          onKeyDown={(e) => handleKeyDown(e, rIdx, 3)}
                          onChange={(e) => {
                            let next = sanitizeAmountInput(e.target.value, decimalPart);
                            if (next !== null) {
                              if (next.length > 15) next = next.slice(0, 15);
                              handleGridChange(rIdx, "cost", next);
                            }
                          }}
                          onBlur={(e) => {
                            if (e.target.value !== "" && e.target.value !== ".") {
                              handleGridChange(rIdx, "cost", formatAmount(e.target.value, decimalPart));
                            }
                          }}
                          className="h-8 w-full border-none bg-transparent px-2 py-0 text-sm font-bold text-slate-700 outline-none focus:bg-white focus:ring-1 focus:ring-[#49293e]/10 font-mono text-right"
                          style={{ textAlign: "right" }}
                        />
                      </td>
                      <td className="p-0 border-r border-gray-100 px-2 py-1 text-right font-mono text-sm font-bold text-emerald-700 select-none bg-gray-50/40">
                        {formatAmount(amt, decimalPart)}
                      </td>
                      <td className="p-0 border-r border-gray-100 px-2 py-1 text-right font-mono text-sm font-bold text-slate-600 select-none bg-gray-50/40">
                        {Number(bQty).toLocaleString("en-US", { maximumFractionDigits: 4 })}
                      </td>
                      <td className="px-1 py-0 text-center">
                         <button
                           type="button"
                           onClick={() => removeGridRow(rIdx)}
                           className="rounded-lg p-1 text-gray-300 transition-all hover:bg-red-50 hover:text-red-500"
                         >
                           <Trash2 size={12} />
                         </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
           <button
            type="button"
            ref={addButtonRef}
            onClick={addGridRow}
            className="flex items-center gap-2 rounded-md text-xs font-bold text-[#49293e]/60 transition-all hover:text-[#49293e] focus:outline-none focus:ring-2 focus:ring-[#49293e]/25 focus:ring-offset-2"
           >
             <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#49293e]/10">
               <Plus size={12} />
             </div>
             Add New Row (Alt+N or Enter at end)
            </button>
        </div>
      </div>
    </div>
  );
};
