import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageShell } from "../../../../components/common";
import type { GridRow } from "../types";

const INITIAL_DATA: GridRow[] = [
  { id: "1", barcode: "123456789", unit: "Small", cost: 1.0 },
  { id: "2", barcode: "123456789", unit: "Medium", cost: "" },
  { id: "3", barcode: "987654321", unit: "Small", cost: 2.5 },
];

const UNIT_OPTIONS = ["Small", "Medium", "Large", "Extra Large", "Box", "Pack"];
const TOTAL_COLS = 3; // Barcode, Unit, Cost

const EditableGridView = () => {
  const [rows, setRows] = useState<GridRow[]>(INITIAL_DATA);
  const [focusPos, setFocusPos] = useState({ r: 0, c: 0 });
  const cellRefs = useRef<Map<string, HTMLInputElement | HTMLSelectElement>>(new Map());

  // Focus effect
  useEffect(() => {
    const key = `${focusPos.r}-${focusPos.c}`;
    const el = cellRefs.current.get(key);
    if (el) {
      el.focus();
      if (el instanceof HTMLInputElement) {
        el.select(); // Select text for easier overwriting
      }
    }
  }, [focusPos]);

  const handleRowChange = <K extends keyof GridRow>(idx: number, key: K, value: GridRow[K]) => {
    if (key === "cost" && value !== "" && !/^\d*\.?\d*$/.test(String(value))) return;

    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  };

  const addRow = () => {
    const newRow: GridRow = {
      id: crypto.randomUUID(),
      barcode: "",
      unit: "Small",
      cost: "",
    };
    setRows((prev) => [...prev, newRow]);
    return rows.length; // Will be the index of the new row
  };

  const removeRow = (idx: number) => {
    if (rows.length <= 1) return; // Keep at least one row
    setRows((prev) => prev.filter((_, i) => i !== idx));
    // Adjust focus if necessary
    if (focusPos.r >= rows.length - 1) {
        setFocusPos(p => ({ ...p, r: Math.max(0, rows.length - 2) }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, r: number, c: number) => {
    const isLastRow = r === rows.length - 1;
    const isLastCol = c === TOTAL_COLS - 1;

    switch (e.key) {
      case "ArrowUp":
        if (e.currentTarget instanceof HTMLSelectElement) return; // Allow native select interaction
        e.preventDefault();
        setFocusPos((prev) => ({ ...prev, r: Math.max(0, r - 1) }));
        break;
      case "ArrowDown":
        if (e.currentTarget instanceof HTMLSelectElement) return; // Allow native select interaction
        e.preventDefault();
        if (isLastRow) {
            addRow();
        }
        setFocusPos((prev) => ({ ...prev, r: Math.min(rows.length, r + 1) }));
        break;
      case "ArrowLeft":
        if (e.currentTarget instanceof HTMLInputElement && e.currentTarget.selectionStart !== 0) return;
        setFocusPos((prev) => ({ ...prev, c: Math.max(0, c - 1) }));
        break;
      case "ArrowRight":
        if (e.currentTarget instanceof HTMLInputElement && e.currentTarget.selectionStart !== e.currentTarget.value.length) return;
        setFocusPos((prev) => ({ ...prev, c: Math.min(TOTAL_COLS - 1, c + 1) }));
        break;
      case "Enter":
        e.preventDefault();
        if (isLastRow) {
          addRow();
        }
        setFocusPos({ r: r + 1, c: 0 }); // Move to start of next row
        break;
      case "Tab":
          if (isLastCol && isLastRow && !e.shiftKey) {
              e.preventDefault();
              addRow();
              setFocusPos({ r: r + 1, c: 0 });
          }
          break;
    }
  };

  return (
    <PageShell
      title="Excel-Style Pricing Grid"
      description="Keyboard-centric spreadsheet navigation. Use Arrow keys to move, Enter to add rows."
    >
      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left table-fixed">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="w-[40%] px-6 py-4 text-xs font-black uppercase tracking-widest text-[#49293e]">Barcode</th>
                  <th className="w-[30%] px-6 py-4 text-xs font-black uppercase tracking-widest text-[#49293e] border-l border-gray-200">Unit</th>
                  <th className="w-[30%] px-6 py-4 text-xs font-black uppercase tracking-widest text-[#49293e] border-l border-gray-200">Cost</th>
                  <th className="w-[60px] px-4 py-4 border-l border-gray-200"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => (
                  <tr
                    key={row.id}
                    className="group border-b border-gray-200 transition-colors hover:bg-slate-50"
                  >
                    <td className="p-0 border-r border-gray-100">
                      <input
                        ref={(el) => { if (el) cellRefs.current.set(`${rIdx}-0`, el); }}
                        type="text"
                        value={row.barcode}
                        onFocus={() => setFocusPos({ r: rIdx, c: 0 })}
                        onKeyDown={(e) => handleKeyDown(e, rIdx, 0)}
                        onChange={(e) => handleRowChange(rIdx, "barcode", e.target.value)}
                        placeholder="Type barcode..."
                        className="h-full w-full border-none bg-transparent px-6 py-4 font-mono text-sm font-semibold text-[#49293e] outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[#49293e]/20"
                      />
                    </td>
                    <td className="p-0 border-r border-gray-200">
                      <div className="relative h-full w-full">
                        <select
                          ref={(el) => { if (el) cellRefs.current.set(`${rIdx}-1`, el); }}
                          value={row.unit}
                          onFocus={() => setFocusPos({ r: rIdx, c: 1 })}
                          onKeyDown={(e) => handleKeyDown(e, rIdx, 1)}
                          onChange={(e) => handleRowChange(rIdx, "unit", e.target.value)}
                          className={`h-full w-full appearance-none border-none bg-transparent px-6 py-4 text-sm font-bold outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[#49293e]/20 ${
                            row.unit === "Small" ? "text-blue-600" :
                            row.unit === "Medium" ? "text-purple-600" :
                            "text-orange-600"
                          }`}
                        >
                          {UNIT_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="p-0 border-r border-gray-200">
                      <input
                        ref={(el) => { if (el) cellRefs.current.set(`${rIdx}-2`, el); }}
                        type="text"
                        value={row.cost}
                        onFocus={() => setFocusPos({ r: rIdx, c: 2 })}
                        onKeyDown={(e) => handleKeyDown(e, rIdx, 2)}
                        onChange={(e) => handleRowChange(rIdx, "cost", e.target.value)}
                        placeholder="0.000"
                        className="h-full w-full border-none bg-transparent px-6 py-4 text-sm font-bold text-slate-700 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[#49293e]/20"
                      />
                    </td>
                    <td className="px-4 py-2 text-center align-middle">
                        <button
                          onClick={() => removeRow(rIdx)}
                          tabIndex={-1}
                          className="rounded-lg p-2 text-slate-300 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 md:opacity-0"
                          title="Remove row"
                        >
                          <Trash2 size={16} />
                        </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50/80 px-6 py-4">
             <button
              onClick={addRow}
              tabIndex={-1}
              className="group flex items-center gap-2 text-sm font-bold text-[#49293e]/60 transition-all hover:text-[#49293e]"
             >
               <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#49293e]/10 group-hover:bg-[#49293e]/20 transition-all">
                 <Plus size={14} />
               </div>
               Add New Pricing Row (or press Enter)
             </button>
          </div>
        </div>

        <div className="flex justify-between items-center px-2">
            <div className="flex flex-col gap-1">
                <p className="text-xs text-slate-400 font-medium">
                    <kbd className="rounded border bg-white px-1 shadow-sm text-slate-600 font-bold">↑ ↓ ← →</kbd> Navigate between cells
                </p>
                <p className="text-xs text-slate-400 font-medium">
                   <kbd className="rounded border bg-white px-1 shadow-sm text-slate-600 font-bold">Enter</kbd> Save and move to next row
                </p>
            </div>
            <div className="text-[10px] text-[#49293e]/40 font-black uppercase tracking-[0.2em] text-right">
                Keyboard Mode: Active<br />
                {rows.length} rows recorded
            </div>
        </div>
      </div>
    </PageShell>
  );
};

export default EditableGridView;
