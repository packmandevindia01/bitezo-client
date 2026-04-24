import { useRef, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { formatAmount, sanitizeAmountInput } from "../../../../utils/formatters";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import type { AltProductDraft, ProductMasterData, MasterItem } from "../types";

interface AlternativePricingGridProps {
  alternatives: AltProductDraft[];
  masterData: ProductMasterData | null;
  branches: MasterItem[];
  mainUnitId: string;
  onAlternativesChange: (alternatives: AltProductDraft[]) => void;
}

export const AlternativePricingGrid = ({
  alternatives,
  masterData,
  branches,
  mainUnitId,
  onAlternativesChange,
}: AlternativePricingGridProps) => {
  const [focusPos, setFocusPos] = useState({ r: 0, c: 0 });
  const decimalPart = useAppSelector(selectDecimalPart);
  const cellRefs = useRef<Map<string, HTMLInputElement | HTMLSelectElement>>(new Map());
  const nextRowId = useRef(-1);
  const TOTAL_COLS = 7;

  useEffect(() => {
    const key = `${focusPos.r}-${focusPos.c}`;
    const el = cellRefs.current.get(key);
    if (el) {
      el.focus();
      if (el instanceof HTMLInputElement) el.select();
    }
  }, [focusPos]);

  const branchOptions = branches.map(b => ({ label: b.name, value: String(b.id) }));
  const mainUnitSelected = masterData?.unit?.find(u => String(u.id) === String(mainUnitId));
  const mainUnitCategory = mainUnitSelected?.category;
  const altUnitOptions = masterData?.unit
    ?.filter(u => (mainUnitCategory && u.category) ? u.category === mainUnitCategory : true)
    .map(u => ({ label: u.name, value: String(u.id) })) ?? [];

  const handleGridChange = (idx: number, key: keyof AltProductDraft, value: AltProductDraft[keyof AltProductDraft]) => {
    const next = [...alternatives];
    next[idx] = { ...next[idx], [key]: value };
    onAlternativesChange(next);
  };

  const addGridRow = () => {
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
                <th className="w-[12%] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#49293e] border-l border-gray-200">Price</th>
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
                      <select
                        ref={(el) => { if (el) cellRefs.current.set(`${rIdx}-2`, el); }}
                        value={alt.unitId}
                        onFocus={() => setFocusPos({ r: rIdx, c: 2 })}
                        onKeyDown={(e) => handleKeyDown(e, rIdx, 2)}
                        onChange={(e) => handleGridChange(rIdx, "unitId", parseInt(e.target.value))}
                        className="h-full w-full appearance-none border-none bg-transparent px-4 py-3 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[#49293e]/10"
                      >
                        {altUnitOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
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
                        className="h-full w-full border-none bg-transparent px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-[#49293e]/10 font-mono"
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
            onClick={addGridRow}
            className="flex items-center gap-2 text-xs font-bold text-[#49293e]/60 hover:text-[#49293e] transition-all"
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
