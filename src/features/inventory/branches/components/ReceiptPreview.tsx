import { useState, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DragHandle, SectionDropZone, PositionSlider } from "../../../../components/common";
import { getPreviewLineStyle } from "../utils/lineHelpers";
import type { LineItem } from "../types";

// ── Draggable Preview Line ────────────────────────────────────────────────────
const PreviewLine = ({
  item, onOffsetChange, selectedId, onSelect, containerRef,
}: {
  item: LineItem;
  onOffsetChange: (id: string, offset: number) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}) => {
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

    // Snap to 0, 50, 100
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
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 }}
      className={`group relative rounded py-0.5 ${isSelected ? "bg-[#49293e]/5 ring-1 ring-[#49293e]/20" : "hover:bg-gray-50"}`}
      onClick={(e) => { e.stopPropagation(); onSelect(isSelected ? null : item.id); }}
    >
      {/* Receipt line — full width container for accurate positioning */}
      <div className="relative w-full overflow-hidden">

        {/* Vertical sort handle */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition">
          <DragHandle
            size={9}
            listeners={listeners}
            attributes={attributes}
          />
        </div>

        {/* Draggable text area */}
        <div
          className="w-full cursor-ew-resize select-none pl-3"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          title="Drag left ↔ right to reposition"
        >
          {/* Position indicator line */}
          <div className="relative w-full">
            <p style={getPreviewLineStyle(item)}>{item.value}</p>
          </div>
        </div>

        {/* Drag hint */}
        {!isSelected && (
          <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-gray-200 group-hover:text-gray-400 transition pointer-events-none">
            ↔
          </span>
        )}
      </div>

      {/* Mini slider on select */}
      {isSelected && (
        <div
          className="flex items-center gap-2 px-2 pt-1 pb-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[9px] text-gray-400 shrink-0">Pos</span>
          <PositionSlider
            value={item.offsetX}
            onChange={(val) => onOffsetChange(item.id, val)}
          />
        </div>
      )}
    </div>
  );
};

// ── Receipt Preview ───────────────────────────────────────────────────────────
interface Props {
  branchName: string;
  allLines: LineItem[];
  onOffsetChange: (id: string, offset: number) => void;
}

const ReceiptPreview = ({ branchName, allLines, onOffsetChange }: Props) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null!);

  const headers = allLines.filter((l) => l.section === "header" && l.value);
  const footers = allLines.filter((l) => l.section === "footer" && l.value);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm sticky top-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Live Preview
        </p>
        <p className="text-[10px] text-gray-300">drag ↔ to position</p>
      </div>

      <div
        ref={containerRef}
        className="bg-white border border-dashed border-gray-300 rounded-lg p-4 font-mono text-xs"
        onClick={() => setSelectedId(null)}
      >
        {/* Branch name */}
        {branchName
          ? <p className="font-bold text-center text-sm mb-2">{branchName}</p>
          : <p className="text-gray-300 text-center text-[10px] mb-2">Branch name here</p>
        }

        {/* Header zone */}
        <SectionDropZone
          id="preview-zone-header"
          isEmpty={headers.length === 0}
          emptyMessage="Header lines appear here"
          className="mb-1"
        >
          <SortableContext
            items={headers.map((l) => `preview-${l.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {headers.map((line) => (
              <PreviewLine
                key={line.id}
                item={line}
                onOffsetChange={onOffsetChange}
                selectedId={selectedId}
                onSelect={setSelectedId}
                containerRef={containerRef}
              />
            ))}
          </SortableContext>
        </SectionDropZone>

        <div className="border-t border-dashed border-gray-400 my-2" />

        {/* Sample items */}
        <div className="flex justify-between text-[10px] font-semibold mb-1">
          <span>SNo</span><span>Name</span><span>Qty</span><span>Price</span>
        </div>
        <div className="flex justify-between text-[10px]">
          <span>1</span><span>ITEM 123</span><span>1</span><span>1.000</span>
        </div>

        <div className="border-t border-dashed border-gray-400 my-2" />

        {/* Totals */}
        <div className="text-[10px] space-y-0.5">
          <div className="flex justify-between"><span>Sub Total</span><span>1.000</span></div>
          <div className="flex justify-between"><span>VAT</span><span>0.000</span></div>
          <div className="flex justify-between font-bold"><span>Net Amount</span><span>1.000</span></div>
        </div>

        <div className="border-t border-dashed border-gray-400 my-2" />

        {/* Footer zone */}
        <SectionDropZone
          id="preview-zone-footer"
          isEmpty={footers.length === 0}
          emptyMessage="Footer lines appear here"
        >
          <SortableContext
            items={footers.map((l) => `preview-${l.id}`)}
            strategy={verticalListSortingStrategy}
          >
            {footers.map((line) => (
              <PreviewLine
                key={line.id}
                item={line}
                onOffsetChange={onOffsetChange}
                selectedId={selectedId}
                onSelect={setSelectedId}
                containerRef={containerRef}
              />
            ))}
          </SortableContext>
        </SectionDropZone>
      </div>
    </div>
  );
};

export default ReceiptPreview;
