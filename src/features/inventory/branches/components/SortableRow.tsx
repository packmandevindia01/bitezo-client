import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Type } from "lucide-react";
import { DragHandle, PositionSlider } from "../../../../components/common";

import type { LineItem } from "../types";
import { resolveFontSizePx } from "../utils/lineHelpers";

interface Props {
  item: LineItem;
  index: number;
  onChange: (v: string) => void;
  onOffsetChange: (offset: number) => void;
  onOpenFont: () => void;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const SortableRow = ({
  item, index, onChange, onOffsetChange, onOpenFont, disabled, onKeyDown,
}: Props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const slotLabel = item.code || (
    item.section === "header" ? `H${index + 1}` : item.section === "footer" ? `F${index + 1}` : `EH${index + 1}`
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
      className="flex items-center gap-1.5 bg-white rounded-md py-1.5 px-2 group border border-transparent hover:border-gray-100 transition-colors"
    >
      {/* Drag handle */}
      <DragHandle listeners={listeners} attributes={attributes} />

      {/* Label */}
      <span className="text-[10px] text-gray-400 font-bold w-6 shrink-0 text-center">
        {slotLabel}
      </span>

      {/* Input */}
      <input
        className="flex-1 text-[11px] border border-gray-100 rounded-md px-2 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#49293e]/20 focus:border-[#49293e]/40 transition disabled:bg-gray-50 min-w-0"
        value={item.value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        onKeyDown={onKeyDown}
        placeholder="Enter text..."
        style={{
          fontFamily: item.fontFamily || "Courier",
          fontWeight: String(item.fontStyle || "").toLowerCase().includes("bold") ? "bold" : "normal",
          fontStyle: String(item.fontStyle || "").toLowerCase().includes("italic") ? "italic" : "normal",
          fontSize: `${resolveFontSizePx(item.fontSize)}px`,
        }}
      />

      {/* Position slider */}
      <div className="flex items-center gap-1.5 w-24 sm:w-32 shrink-0">
        <span className="text-[8px] font-bold text-slate-300 uppercase shrink-0">POS</span>
        <PositionSlider
          value={item.offsetX}
          onChange={onOffsetChange}
          disabled={disabled}
        />
      </div>

      {/* Font button */}
      <button
        onClick={onOpenFont}
        disabled={disabled}
        title="Font Settings"
        className="flex h-7 w-7 items-center justify-center rounded-md text-white bg-[#49293e] hover:bg-[#5c3550] transition disabled:opacity-40 shrink-0 shadow-sm"
      >
        <Type size={12} />
      </button>
    </div>
  );
};

export default SortableRow;
