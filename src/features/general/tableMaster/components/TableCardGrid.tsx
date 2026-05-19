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
  onEdit?: (record: TableRecord) => void;
  onDeleteRequest?: (record: TableRecord) => void;
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
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white py-16 px-6 text-center w-full flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in duration-300">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">No tables found for this section</p>
          <p className="text-xs text-slate-400 mt-1 max-w-[280px] mx-auto">Get started by clicking the "Add Table" button above to allocate a new table in this section.</p>
        </div>
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
