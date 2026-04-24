import { Trash2 } from "lucide-react";
import type { GridRow } from "../types";
import { UNIT_OPTIONS } from "../constants";

interface GridRowItemProps {
  row: GridRow;
  rIdx: number;
  cellRefs: React.MutableRefObject<Map<string, HTMLInputElement | HTMLSelectElement>>;
  setFocusPos: (pos: { r: number; c: number }) => void;
  handleKeyDown: (e: React.KeyboardEvent, r: number, c: number) => void;
  handleRowChange: <K extends keyof GridRow>(idx: number, key: K, value: GridRow[K]) => void;
  removeRow: (idx: number) => void;
}

const GridRowItem = ({
  row,
  rIdx,
  cellRefs,
  setFocusPos,
  handleKeyDown,
  handleRowChange,
  removeRow,
}: GridRowItemProps) => {
  return (
    <tr className="group border-b border-gray-200 transition-colors hover:bg-slate-50">
      {/* Barcode Cell */}
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

      {/* Unit Cell */}
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

      {/* Cost Cell */}
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

      {/* Action Cell */}
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
  );
};

export default GridRowItem;
