import { useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DragHandle, PositionSlider } from "../../../../../components/common";
import { getPreviewLineStyle } from "../../utils/lineHelpers";
import type { LineItem } from "../../types";

interface PreviewLineProps {
  item: LineItem;
  onOffsetChange: (id: string, offset: number) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

const PreviewLine = ({
  item,
  onOffsetChange,
  selectedId,
  onSelect,
  containerRef,
}: PreviewLineProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `preview-${item.id}` });

  const dragStartX = useRef<number | null>(null);
  const dragStartOffset = useRef<number>(0);
  const isSelected = selectedId === item.id;

  if (!item.value) return null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartX.current = e.clientX;
    dragStartOffset.current = item.offsetX;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null || !containerRef.current) return;
    const containerWidth = containerRef.current.getBoundingClientRect().width;
    const diff = e.clientX - dragStartX.current;
    const diffPercent = (diff / containerWidth) * 100;
    
    let newOffset = Math.round(dragStartOffset.current + diffPercent);
    newOffset = Math.max(0, Math.min(100, newOffset));

    // Snapping logic: zero, center, end
    if (newOffset <= 5) newOffset = 0;
    else if (newOffset >= 45 && newOffset <= 55) newOffset = 50;
    else if (newOffset >= 95) newOffset = 100;

    onOffsetChange(item.id, newOffset);
  };

  const handlePointerUp = () => {
    dragStartX.current = null;
  };

  return (
    <div
      ref={setNodeRef}
      style={{ 
        transform: CSS.Transform.toString(transform), 
        transition, 
        opacity: isDragging ? 0.3 : 1 
      }}
      className={`group relative rounded py-0.5 ${
        isSelected ? "bg-[#49293e]/5 ring-1 ring-[#49293e]/20" : "hover:bg-gray-50"
      }`}
      onClick={(e) => { 
        e.stopPropagation(); 
        onSelect(isSelected ? null : item.id); 
      }}
    >
      <div className="relative w-full overflow-hidden">
        {/* Sort Handle (Visible on hover) */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition">
          <DragHandle
            size={9}
            listeners={listeners}
            attributes={attributes}
          />
        </div>

        {/* Repositioning Area (Horizontal dragging) */}
        <div
          className="w-full cursor-ew-resize select-none pl-3"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          title="Drag left ↔ right to reposition"
        >
          <div className="relative w-full">
            <p style={getPreviewLineStyle(item)}>{item.value}</p>
          </div>
        </div>

        {/* Drag visual cue */}
        {!isSelected && (
          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-gray-200 group-hover:text-gray-400 transition pointer-events-none text-red-500">
            ↔
          </span>
        )}
      </div>

      {/* Position precision control */}
      {isSelected && (
        <div
          className="flex items-center gap-2 px-2 pt-1 pb-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[9px] text-gray-400 shrink-0">Pos</span>
          <PositionSlider
            value={item.offsetX}
            onChange={(val: number) => onOffsetChange(item.id, val)}
          />
        </div>
      )}
    </div>
  );
};

export default PreviewLine;
