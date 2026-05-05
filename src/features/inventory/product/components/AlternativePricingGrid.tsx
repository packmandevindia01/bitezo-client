import { useRef, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { formatAmount, sanitizeAmountInput } from "../../../../utils/formatters";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import { SearchableSelect } from "../../../../components/common";
import { useToast } from "../../../../app/providers/useToast";
import type { AltProductDraft, ProductMasterData, MasterItem } from "../types";

interface AlternativePricingGridProps {
  alternatives: AltProductDraft[];
  masterData: ProductMasterData | null;
  branches: MasterItem[];
  mainUnitId: string;
  mainBranchId: string;
  onAlternativesChange: (alternatives: AltProductDraft[]) => void;
}

export const AlternativePricingGrid = ({
  alternatives,
  masterData,
  branches,
  mainUnitId,
  mainBranchId,
  onAlternativesChange,
}: AlternativePricingGridProps) => {
  const { showToast } = useToast();
  const [focusPos, setFocusPos] = useState({ r: 0, c: 0 });
  const decimalPart = useAppSelector(selectDecimalPart);
  const cellRefs = useRef<Map<string, HTMLElement>>(new Map());
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const nextRowId = useRef(-1);
  const TOTAL_COLS = 7;

  useEffect(() => {
    if (alternatives.length === 0) {
      addButtonRef.current?.focus();
      return;
    }

    const key = `${focusPos.r}-${focusPos.c}`;
    const el = cellRefs.current.get(key) ?? document.getElementById(`alt-unit-${focusPos.r}`);
    if (el) {
      el.focus();
      if (el instanceof HTMLInputElement) el.select();
    }
  }, [focusPos, alternatives.length]);

  const branchOptions = branches.map(b => ({ label: b.name, value: String(b.id) }));
  const mainUnitSelected = masterData?.unit?.find(u => String(u.id) === String(mainUnitId));
  const mainUnitCategory = mainUnitSelected?.category;
  const mgUnit = masterData?.unit?.find(u => u.name === "Mg");
  console.log("[Unit Filter Debug] mainUnitCategory raw:", mainUnitCategory);
  console.log("[Unit Filter Debug] Mg category raw:", mgUnit?.category);
  console.log("[Unit Filter Debug] Are they equal:", mainUnitCategory === mgUnit?.category);
  
  const altUnitOptions = masterData?.unit
    ?.filter(u => {
      if (!mainUnitCategory || !u.category) return true;
      return u.category.toLowerCase().trim() === mainUnitCategory.toLowerCase().trim();
    })
    .map(u => ({ label: u.name, value: String(u.id) })) ?? [];

  console.log("[Unit Filter Debug] Final altUnitOptions:", altUnitOptions);

  const ALL_BRANCH_ID = branches.find(b => b.name.toLowerCase() === "all")?.id ?? 0;

  const isDuplicateUnit = (unitId: number, branchId: number, excludeIdx: number): string | null => {
    // Check against main product
    const mUnitId = parseInt(mainUnitId);
    const mBranchId = parseInt(mainBranchId);
    if (unitId === mUnitId) {
      if (branchId === mBranchId) return "Unit already used by main product in this branch";
      if (branchId === ALL_BRANCH_ID || mBranchId === ALL_BRANCH_ID) 
        return "Unit conflicts with main product's 'All' branch assignment";
    }

    // Check against other alternatives
    for (let i = 0; i < alternatives.length; i++) {
      if (i === excludeIdx) continue;
      const other = alternatives[i];
      if (parseInt(String(other.unitId)) === unitId) {
        if (parseInt(String(other.branchId)) === branchId) {
          return `Unit already assigned to this branch in row ${i + 1}`;
        }
        if (branchId === ALL_BRANCH_ID || parseInt(String(other.branchId)) === ALL_BRANCH_ID) {
          return `Unit assigned to 'All' branch cannot be used in individual branches`;
        }
      }
    }
    return null;
  };

  const isDuplicateBarcode = (barcode: string, branchId: number, excludeIdx: number): string | null => {
    if (!barcode.trim()) return null;
    for (let i = 0; i < alternatives.length; i++) {
      if (i === excludeIdx) continue;
      const other = alternatives[i];
      if (other.barcode.trim().toLowerCase() === barcode.trim().toLowerCase()) {
        if (parseInt(String(other.branchId)) === branchId) {
          return `Barcode already assigned to this branch in row ${i + 1}`;
        }
        if (branchId === ALL_BRANCH_ID || parseInt(String(other.branchId)) === ALL_BRANCH_ID) {
          return `Barcode assigned to 'All' branch cannot be used in individual branches`;
        }
      }
    }
    return null;
  };

  const handleGridChange = (idx: number, key: keyof AltProductDraft, value: AltProductDraft[keyof AltProductDraft]) => {
    const next = [...alternatives];
    
    // Validate unit uniqueness
    if (key === "unitId" || key === "branchId") {
      const uId = key === "unitId" ? parseInt(String(value)) : parseInt(String(next[idx].unitId));
      const bId = key === "branchId" ? parseInt(String(value)) : parseInt(String(next[idx].branchId));
      const error = isDuplicateUnit(uId, bId, idx);
      if (error) {
        showToast(error, "warning");
        return;
      }
    }

    // Validate barcode uniqueness
    if (key === "barcode" || key === "branchId") {
      const bcode = key === "barcode" ? String(value) : next[idx].barcode;
      const bId = key === "branchId" ? parseInt(String(value)) : parseInt(String(next[idx].branchId));
      const error = isDuplicateBarcode(bcode, bId, idx);
      if (error) {
        showToast(error, "warning");
        return;
      }
    }

    next[idx] = { ...next[idx], [key]: value };
    onAlternativesChange(next);
  };

  const addGridRow = () => {
    const nextRowIndex = alternatives.length;
    const newRow: AltProductDraft = {
      id: nextRowId.current,
      branchId: branches[0]?.id || 0,
      barcode: "",
      isIncl: true,
      unitId: masterData?.unit?.[0]?.id || 0,
      price: "0",
      altName: "",
      altArabic: "",
    };
    nextRowId.current -= 1;
    onAlternativesChange([...alternatives, newRow]);
    setFocusPos({ r: nextRowIndex, c: 0 });
  };

  const removeGridRow = (idx: number) => {
    onAlternativesChange(alternatives.filter((_, i) => i !== idx));
    if (focusPos.r >= alternatives.length - 1) {
      setFocusPos(p => ({ ...p, r: Math.max(0, alternatives.length - 2) }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, r: number, c: number) => {
    const isLastRow = r === alternatives.length - 1;
    const isLastCol = c === TOTAL_COLS - 1;

    switch (e.key) {
      case "ArrowUp":
        if (e.currentTarget instanceof HTMLSelectElement) return;
        e.preventDefault();
        setFocusPos(p => ({ ...p, r: Math.max(0, r - 1) }));
        break;
      case "ArrowDown":
        if (e.currentTarget instanceof HTMLSelectElement) return;
        e.preventDefault();
        if (isLastRow) addGridRow();
        setFocusPos(p => ({ ...p, r: Math.min(alternatives.length, r + 1) }));
        break;
      case "ArrowLeft":
        if (e.currentTarget instanceof HTMLInputElement && e.currentTarget.selectionStart !== 0) return;
        setFocusPos(p => ({ ...p, c: Math.max(0, c - 1) }));
        break;
      case "ArrowRight":
        if (e.currentTarget instanceof HTMLInputElement && e.currentTarget.selectionStart !== e.currentTarget.value.length) return;
        setFocusPos(p => ({ ...p, c: Math.min(TOTAL_COLS - 1, c + 1) }));
        break;
      case "Enter":
        if (c === 3) {
          e.preventDefault();
          handleGridChange(r, "isIncl", !alternatives[r].isIncl);
          return;
        }
        e.preventDefault();
        if (isLastRow) addGridRow();
        setFocusPos({ r: r + 1, c: 0 });
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

  return (
    <div className="animate-in fade-in slide-in-from-right-2 duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Alternative Pricing Grid</h3>
        <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest text-[#49293e]/40">
           <span>Kbd Arrows: Nav</span> • <span>Enter: Add Row</span>
        </div>
      </div>
      
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left table-fixed">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="w-[18%] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#49293e]">Branch</th>
<th className="w-[15%] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#49293e] border-l border-gray-200">Barcode</th>
<th className="w-[15%] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#49293e] border-l border-gray-200">Unit</th>
<th className="w-[8%] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#49293e] border-l border-gray-200 text-center">Incl.</th>
<th className="w-[12%] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#49293e] border-l border-gray-200 text-right">Price</th>
<th className="w-[18%] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#49293e] border-l border-gray-200">Alt Name</th>
<th className="w-[20%] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#49293e] border-l border-gray-200">Alt Name (Arabic)</th>
                <th className="w-12.5 px-2 py-3 border-l border-gray-200"></th>
              </tr>
            </thead>
            <tbody>
              {alternatives.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400 text-sm">
                    No alternative prices added.
                  </td>
                </tr>
              ) : (
                alternatives.map((alt, rIdx) => (
                  <tr key={alt.id} className="group border-b border-gray-100 transition-colors hover:bg-gray-50/50">
                    <td className="p-0 border-r border-gray-100">
                      <select
                        ref={(el) => { if (el) cellRefs.current.set(`${rIdx}-0`, el); }}
                        value={alt.branchId}
                        onFocus={() => setFocusPos({ r: rIdx, c: 0 })}
                        onKeyDown={(e) => handleKeyDown(e, rIdx, 0)}
                        onChange={(e) => handleGridChange(rIdx, "branchId", parseInt(e.target.value))}
                        className="h-full w-full appearance-none border-none bg-transparent px-4 py-3 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[#49293e]/10"
                      >
                        {branchOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </td>
                    <td className="p-0 border-r border-gray-100">
                      <input
                        ref={(el) => { if (el) cellRefs.current.set(`${rIdx}-1`, el); }}
                        type="text"
                        value={alt.barcode}
                        onFocus={() => setFocusPos({ r: rIdx, c: 1 })}
                        onKeyDown={(e) => handleKeyDown(e, rIdx, 1)}
                        onChange={(e) => handleGridChange(rIdx, "barcode", e.target.value)}
                        className="h-full w-full border-none bg-transparent px-4 py-3 font-mono text-xs font-bold text-[#49293e] outline-none focus:bg-white focus:ring-2 focus:ring-[#49293e]/10"
                      />
                    </td>
                    <td className="p-0 border-r border-gray-100">
                      <div
                        onFocus={() => setFocusPos({ r: rIdx, c: 2 })}
                        className="px-2 py-1"
                      >
                        <SearchableSelect
                          key={`unit-select-${rIdx}-${alt.id}`}
                          id={`alt-unit-${rIdx}`}
                          options={altUnitOptions}
                          value={String(alt.unitId || "")}
                          onChange={(value) => handleGridChange(rIdx, "unitId", parseInt(value) || 0)}
                          placeholder="Search unit..."
                        />
                      </div>
                    </td>
                    <td className="p-0 border-r border-gray-100 text-center">
                       <input
                        ref={(el) => { if (el) cellRefs.current.set(`${rIdx}-3`, el); }}
                        type="checkbox"
                        checked={alt.isIncl}
                        onFocus={() => setFocusPos({ r: rIdx, c: 3 })}
                        onKeyDown={(e) => handleKeyDown(e, rIdx, 3)}
                        onChange={(e) => handleGridChange(rIdx, "isIncl", e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-[#49293e] focus:ring-[#49293e]"
                       />
                    </td>
                    <td className="p-0 border-r border-gray-100">
                      <input
                        ref={(el) => { if (el) cellRefs.current.set(`${rIdx}-4`, el); }}
                        type="text"
                        inputMode="decimal"
                        value={alt.price === "0" ? formatAmount(0, decimalPart) : alt.price}
                        onFocus={(e) => {
                          setFocusPos({ r: rIdx, c: 4 });
                          e.target.select();
                        }}
                        onKeyDown={(e) => handleKeyDown(e, rIdx, 4)}
                        onChange={(e) => {
                          const next = sanitizeAmountInput(e.target.value, decimalPart);
                          if (next !== null) handleGridChange(rIdx, "price", next);
                        }}
                        onBlur={(e) => {
                          if (e.target.value !== "" && e.target.value !== ".") {
                            handleGridChange(rIdx, "price", formatAmount(e.target.value, decimalPart));
                          }
                        }}
                        className="h-full w-full border-none bg-transparent px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-[#49293e]/10 font-mono text-right"
                        style={{ textAlign: 'right' }}
                      />
                    </td>
                    <td className="p-0 border-r border-gray-100">
                      <input
                        ref={(el) => { if (el) cellRefs.current.set(`${rIdx}-5`, el); }}
                        type="text"
                        value={alt.altName}
                        onFocus={() => setFocusPos({ r: rIdx, c: 5 })}
                        onKeyDown={(e) => handleKeyDown(e, rIdx, 5)}
                        onChange={(e) => handleGridChange(rIdx, "altName", e.target.value)}
                        className="h-full w-full border-none bg-transparent px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-[#49293e]/10"
                      />
                    </td>
                    <td className="p-0 border-r border-gray-100">
                      <input
                        ref={(el) => { if (el) cellRefs.current.set(`${rIdx}-6`, el); }}
                        type="text"
                        dir="rtl"
                        value={alt.altArabic || ""}
                        onFocus={() => setFocusPos({ r: rIdx, c: 6 })}
                        onKeyDown={(e) => handleKeyDown(e, rIdx, 6)}
                        onChange={(e) => handleGridChange(rIdx, "altArabic", e.target.value)}
                        className="h-full w-full border-none bg-transparent px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-[#49293e]/10 text-right"
                      />
                    </td>
                    <td className="px-2 py-1 text-center">
                       <button
                        onClick={() => removeGridRow(rIdx)}
                        className="rounded-lg p-1.5 text-gray-300 transition-all hover:bg-red-50 hover:text-red-500"
                       >
                         <Trash2 size={14} />
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
           <button
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
