import { 
  DndContext, 
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { Loader2 } from "lucide-react";
import type { TableRecord } from "../types";
import SortableTableCard from "./SortableTableCard";

interface TableCardGridProps {
  tables: TableRecord[];
  selectedId: number | null;
  loading: boolean;
  onEdit: (record: TableRecord) => void;
  onDeleteRequest: (record: TableRecord) => void;
  onReorder?: (newTables: TableRecord[]) => void;
}

const TableCardGrid = ({
  tables,
  selectedId,
  loading,
  onEdit,
  onDeleteRequest,
  onReorder
}: TableCardGridProps) => {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tables.findIndex((t) => t.tableId === active.id);
      const newIndex = tables.findIndex((t) => t.tableId === over.id);
      
      console.log(`[Move] From index ${oldIndex} to ${newIndex}`, {
        activeId: active.id,
        overId: over.id
      });

      const reordered = arrayMove(tables, oldIndex, newIndex);
      if (onReorder) {
        onReorder(reordered);
      }
    }
  };

  if (loading && tables.length === 0) {
    return (
      <div className="py-12 flex justify-center w-full">
        <Loader2 className="animate-spin text-[#49293e]" size={32} />
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center text-gray-400 w-full animate-in fade-in zoom-in duration-300">
        No tables found for this section.
      </div>
    );
  }

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext 
        items={tables.map(t => t.tableId)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {tables.map((table) => (
            <SortableTableCard
              key={table.tableId}
              table={table}
              selectedId={selectedId}
              loading={loading}
              onEdit={onEdit}
              onDeleteRequest={onDeleteRequest}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default TableCardGrid;
