import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Type } from "lucide-react";
import { DragHandle, PositionSlider } from "../../../../components/common";

import type { LineItem } from "../types";

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

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
      className="flex flex-col gap-1.5 bg-white rounded-lg py-1"
    >
      <div className="flex items-center gap-2">
        {/* Drag handle */}
        <DragHandle listeners={listeners} attributes={attributes} />

        {/* Label */}
        <span className="text-xs text-gray-500 font-medium w-14 shrink-0">
          {item.section === "header" ? "H" : "F"}{index + 1}
        </span>

        {/* Input */}
        <input
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#49293e]/20 focus:border-[#49293e]/40 transition disabled:bg-gray-50 min-w-0"
          value={item.value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          onKeyDown={onKeyDown}
          style={{
            fontFamily: item.fontFamily,
            fontWeight: item.fontStyle.includes("Bold") ? "bold" : "normal",
            fontStyle: item.fontStyle.includes("Italic") ? "italic" : "normal",
            fontSize: `${item.fontSize}px`,
          }}
        />

        {/* Font button */}
        <button
          onClick={onOpenFont}
          disabled={disabled}
          className="flex items-center gap-1 px-2 py-2 rounded-lg text-xs font-medium text-white bg-[#49293e] hover:bg-[#5c3550] transition whitespace-nowrap disabled:opacity-40 shrink-0"
        >
          <Type size={11} /> Font
        </button>
      </div>

      {/* Position slider below input */}
      <div className="flex items-center gap-2 pl-[calc(1.5rem+3.5rem+0.5rem)]">
        <span className="text-[10px] text-gray-400 shrink-0">Position</span>
        <PositionSlider
          value={item.offsetX}
          onChange={onOffsetChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default SortableRow;
