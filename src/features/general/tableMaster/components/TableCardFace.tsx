import { Armchair, GripVertical } from "lucide-react";
import type { TableRecord } from "../schemas";

interface TableCardFaceProps {
  table: TableRecord;
  selected?: boolean;
  draggable?: boolean;
  lifted?: boolean;
}

/** What a table looks like: used by the card in the grid and by the copy that follows the pointer. */
const TableCardFace = ({ table, selected = false, draggable = false, lifted = false }: TableCardFaceProps) => {
  const tone = selected
    ? "border-[#49293e] bg-[#49293e] text-white"
    : table.isActive
      ? "border-gray-200 bg-white text-[#49293e]"
      : "border-dashed border-gray-300 bg-gray-50 text-gray-400";

  const subTone = selected ? "text-white/70" : "text-gray-500";

  return (
    <span
      className={`relative flex h-24 w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 px-2 shadow-sm transition-colors ${tone} ${
        lifted ? "rotate-2 scale-90 cursor-grabbing opacity-95 shadow-xl ring-2 ring-[#49293e]/30" : ""
      }`}
    >
      {draggable && (
        <GripVertical
          size={14}
          aria-hidden="true"
          className={`absolute left-1.5 top-1.5 ${selected ? "text-white/50" : "text-gray-400"}`}
        />
      )}
      <span className="w-full truncate text-center text-lg font-black leading-tight">{table.tableName}</span>
      <span className={`flex items-center gap-1 text-xs font-semibold ${subTone}`}>
        <Armchair size={13} aria-hidden="true" />
        {table.chairs} {table.chairs === 1 ? "chair" : "chairs"}
      </span>
      {!table.isActive && (
        <span className="rounded-full bg-gray-200 px-2 py-px text-[10px] font-bold uppercase tracking-wide text-gray-600">
          Inactive
        </span>
      )}
    </span>
  );
};

export default TableCardFace;
