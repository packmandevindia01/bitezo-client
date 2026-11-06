import type { ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import { ArrowLeftRight, Plus } from "lucide-react";

interface TableSlotProps {
  slotIndex: number;
  occupied: boolean;
  isDragActive: boolean;
  isDragSource: boolean;
  onAdd?: () => void;
  children?: ReactNode;
}

/** One spot on the floor: holds a table, or offers "add" and accepts a dropped table. */
const TableSlot = ({ slotIndex, occupied, isDragActive, isDragSource, onAdd, children }: TableSlotProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${slotIndex}`, data: { slotIndex } });
  const isTarget = isOver && !isDragSource;

  if (occupied) {
    return (
      <div ref={setNodeRef} className={`relative rounded-2xl ${isTarget ? "ring-2 ring-[#49293e] ring-offset-2" : ""}`}>
        {children}
        {isTarget && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-[#49293e]/70 text-white">
            <ArrowLeftRight size={16} aria-hidden="true" />
          </span>
        )}
      </div>
    );
  }

  const base = "flex h-24 w-full items-center justify-center rounded-2xl border-2 border-dashed text-xs font-bold transition-colors";

  if (isDragActive) {
    return (
      <div
        ref={setNodeRef}
        className={`${base} ${isTarget ? "border-[#49293e] bg-[#49293e]/15" : "border-gray-300 bg-gray-50"}`}
      />
    );
  }

  if (!onAdd) {
    return <div ref={setNodeRef} className={`${base} border-gray-100 bg-gray-50/40`} />;
  }

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onAdd}
      aria-label={`Add table at position ${slotIndex + 1}`}
      className={`${base} group border-gray-200 bg-gray-50/40 text-gray-300 outline-none hover:border-[#49293e]/40 hover:bg-[#49293e]/5 hover:text-[#49293e] focus-visible:border-[#49293e] focus-visible:text-[#49293e]`}
    >
      <Plus size={18} aria-hidden="true" />
      <span className="ml-1 hidden group-hover:inline group-focus-visible:inline">Add table</span>
    </button>
  );
};

export default TableSlot;
