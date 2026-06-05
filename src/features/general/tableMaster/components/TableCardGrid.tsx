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
import SortableEmptySlot from "./SortableEmptySlot";

interface TableCardGridProps {
  tables: TableRecord[];
  selectedId: number | null;
  loading: boolean;
  onEdit?: (record: TableRecord) => void;
  onDeleteRequest?: (record: TableRecord) => void;
  onReorder?: (newTables: TableRecord[]) => void;
  onEmptySlotClick?: (position: number) => void;
}

const TableCardGrid = ({
  tables,
  selectedId,
  loading,
  onEdit,
  onDeleteRequest,
  onReorder,
  onEmptySlotClick
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

  if (loading && tables.length === 0) {
    return (
      <div className="py-12 flex justify-center w-full">
        <Loader2 className="animate-spin text-[#49293e]" size={32} />
      </div>
    );
  }

  // Calculate grid size (minimum 25 slots)
  const maxTablePosition = tables.reduce((max, t) => Math.max(max, t.position || 0), 0);
  const totalSlots = Math.max(25, maxTablePosition);

  const placedTables = new Set<number>();
  const gridItems: Array<{ type: 'table' | 'empty'; id: string; table?: TableRecord; position?: number }> = Array.from({ length: totalSlots }, (_, index) => {
    const position = index + 1;
    const table = tables.find(t => t.position === position && !placedTables.has(t.tableId));
    
    if (table) {
      placedTables.add(table.tableId);
      return { type: 'table', id: `table-${table.tableId}`, table };
    }
    return { type: 'empty', id: `empty-${position}`, position };
  });

  // Append any unplaced tables to the end (e.g., duplicate positions or missing position)
  tables.forEach(table => {
    if (!placedTables.has(table.tableId)) {
      gridItems.push({ type: 'table', id: `table-${table.tableId}`, table });
    }
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = gridItems.findIndex((item) => item.id === active.id);
      const newIndex = gridItems.findIndex((item) => item.id === over.id);
      
      const reorderedItems = arrayMove(gridItems, oldIndex, newIndex);
      
      const newTables = reorderedItems
        .map((item, index) => {
          if (item.type === 'table' && item.table) {
            return {
              ...item.table,
              position: index + 1
            };
          }
          return null;
        })
        .filter((t): t is TableRecord => t !== null);

      if (onReorder) {
        onReorder(newTables);
      }
    }
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext 
        items={gridItems.map(item => item.id)}
        strategy={rectSortingStrategy}
      >
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
          {gridItems.map((item) => {
            if (item.type === 'table' && item.table) {
              return (
                <SortableTableCard
                  key={item.id}
                  id={item.id}
                  table={item.table}
                  selectedId={selectedId}
                  loading={loading}
                  onEdit={onEdit}
                  onDeleteRequest={onDeleteRequest}
                />
              );
            }
            return <SortableEmptySlot key={item.id} id={item.id} onClick={() => onEmptySlotClick && item.position && onEmptySlotClick(item.position)} />;
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export default TableCardGrid;
