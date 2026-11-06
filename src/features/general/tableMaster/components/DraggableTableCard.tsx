import { useDraggable } from "@dnd-kit/core";
import { Trash2 } from "lucide-react";
import type { TableRecord } from "../schemas";
import TableCardFace from "./TableCardFace";

interface DraggableTableCardProps {
  table: TableRecord;
  slotIndex: number;
  selected: boolean;
  canDrag: boolean;
  disabled: boolean;
  onEdit?: (record: TableRecord) => void;
  onDeleteRequest?: (record: TableRecord) => void;
}

/** The whole card is the drag area. A click opens it for editing; a drag moves it. */
const DraggableTableCard = ({
  table,
  slotIndex,
  selected,
  canDrag,
  disabled,
  onEdit,
  onDeleteRequest,
}: DraggableTableCardProps) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `table-${table.tableId}`,
    data: { slotIndex, table },
    disabled: !canDrag,
  });

  return (
    <div ref={setNodeRef} className={`group relative ${isDragging ? "opacity-30" : ""}`}>
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={() => onEdit?.(table)}
        disabled={disabled || (!onEdit && !canDrag)}
        aria-label={`Table ${table.tableName}, ${table.chairs} chairs${table.isActive ? "" : ", inactive"}`}
        className={`block w-full touch-manipulation select-none rounded-2xl outline-none transition-transform focus-visible:ring-2 focus-visible:ring-[#49293e] focus-visible:ring-offset-2 [-webkit-touch-callout:none] ${
          canDrag ? "cursor-grab active:cursor-grabbing" : onEdit ? "cursor-pointer" : "cursor-default"
        } ${isDragging ? "" : "hover:-translate-y-0.5"}`}
      >
        <TableCardFace table={table} selected={selected} draggable={canDrag} />
      </button>

      {onDeleteRequest && (
        <button
          type="button"
          onClick={() => onDeleteRequest(table)}
          disabled={disabled}
          title={`Delete table ${table.tableName}`}
          aria-label={`Delete table ${table.tableName}`}
          className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600 opacity-0 transition-opacity hover:bg-red-100 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
};

export default DraggableTableCard;
