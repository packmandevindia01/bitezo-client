import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, GripVertical } from "lucide-react";
import type { TableRecord } from "../types";

interface SortableTableCardProps {
  table: TableRecord;
  selectedId: number | null;
  loading: boolean;
  onEdit?: (record: TableRecord) => void;
  onDeleteRequest?: (record: TableRecord) => void;
}

const SortableTableCard = ({
  table,
  selectedId,
  loading,
  onEdit,
  onDeleteRequest
}: SortableTableCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: table.tableId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
    touchAction: "none",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative animate-in fade-in slide-in-from-bottom-2 duration-300 ${
        isDragging ? "cursor-grabbing" : "cursor-default"
      }`}
    >
      <button
        type="button"
        onClick={() => onEdit?.(table)}
        className={`h-22 w-full rounded-2xl border-2 transition-all duration-200 flex flex-col items-center justify-center shadow-sm active:scale-95 ${
          selectedId === table.tableId
            ? "border-[#49293e] bg-[#49293e] text-white shadow-lg"
            : "border-gray-100 bg-white text-[#49293e] hover:border-[#49293e]/30"
        }`}
        disabled={loading}
      >
        <span className="text-xl font-black">{table.tableName}</span>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${
            selectedId === table.tableId ? "text-white/70" : "text-gray-400"
          }`}>
            {table.chairs} Chairs
          </span>
          <div className={`h-2 w-2 rounded-full shadow-sm ${
            table.isActive ? "bg-green-400 ring-2 ring-green-100" : "bg-red-400 ring-2 ring-red-100"
          }`} />
        </div>
      </button>

      {/* Drag Handle - Modern Floating Style */}
      <div
        {...attributes}
        {...listeners}
        className={`absolute left-2 top-2 p-1 rounded-md transition-all duration-200 cursor-grab active:cursor-grabbing ${
          selectedId === table.tableId 
            ? "text-white/40 hover:text-white/80 hover:bg-white/10" 
            : "text-gray-300 hover:text-gray-600 hover:bg-gray-100"
        }`}
      >
        <GripVertical size={14} />
      </div>
      
      {/* Delete Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDeleteRequest?.(table);
        }}
        className="absolute -right-1.5 -top-1.5 flex h-7 w-7 scale-0 items-center justify-center rounded-full bg-red-100 text-red-600 shadow-md border border-white transition-transform duration-200 group-hover:scale-100 hover:bg-red-200"
        disabled={loading}
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
};

export default SortableTableCard;
