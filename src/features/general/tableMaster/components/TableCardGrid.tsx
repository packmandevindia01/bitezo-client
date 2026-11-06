import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { AlertTriangle, Check, Loader2, Move } from "lucide-react";
import { Button } from "../../../../components/common";
import type { TableRecord } from "../schemas";
import { buildTableSlots, getLayoutChanges, hasLayoutProblem, moveTableToSlot } from "../utils/tableLayout";
import DraggableTableCard from "./DraggableTableCard";
import TableCardFace from "./TableCardFace";
import TableSlot from "./TableSlot";

export type LayoutSaveStatus = "idle" | "saving" | "saved";

interface TableCardGridProps {
  tables: TableRecord[];
  selectedId: number | null;
  loading: boolean;
  saveStatus: LayoutSaveStatus;
  onEdit?: (record: TableRecord) => void;
  onDeleteRequest?: (record: TableRecord) => void;
  onLayoutChange?: (changedTables: TableRecord[]) => void;
  onEmptySlotClick?: (position: number) => void;
}

const GRID_GAP = 12;

/** Pointer: the spot under the pointer, nothing if dropped off the floor. Keyboard: the nearest spot. */
const detectSlot: CollisionDetection = (args) => {
  if (!args.pointerCoordinates) return closestCenter(args);
  const under = pointerWithin(args);
  return under.length > 0 ? under : rectIntersection(args);
};

/** Arrow keys move one spot at a time. */
const moveOneSlot: KeyboardCoordinateGetter = (event, { currentCoordinates, context: { collisionRect } }) => {
  if (!collisionRect) return undefined;
  const stepX = collisionRect.width + GRID_GAP;
  const stepY = collisionRect.height + GRID_GAP;
  const { x, y } = currentCoordinates;
  const next: Record<string, { x: number; y: number }> = {
    ArrowRight: { x: x + stepX, y },
    ArrowLeft: { x: x - stepX, y },
    ArrowDown: { x, y: y + stepY },
    ArrowUp: { x, y: y - stepY },
  };
  if (!next[event.code]) return undefined;
  event.preventDefault();
  return next[event.code];
};

const TableCardGrid = ({
  tables,
  selectedId,
  loading,
  saveStatus,
  onEdit,
  onDeleteRequest,
  onLayoutChange,
  onEmptySlotClick,
}: TableCardGridProps) => {
  const [activeTable, setActiveTable] = useState<TableRecord | null>(null);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [overSlot, setOverSlot] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Press and hold starts a drag, so a swipe still scrolls the page.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    // Enter stays "open to edit" on a focused card, so M starts a keyboard move.
    useSensor(KeyboardSensor, {
      coordinateGetter: moveOneSlot,
      keyboardCodes: { start: ["KeyM"], cancel: ["Escape"], end: ["Enter"] },
    }),
  );

  const slots = useMemo(() => buildTableSlots(tables), [tables]);
  const needsRepair = useMemo(() => hasLayoutProblem(tables), [tables]);

  if (loading && tables.length === 0) {
    return (
      <div className="flex w-full justify-center py-12">
        <Loader2 className="animate-spin text-[#49293e]" size={32} />
      </div>
    );
  }

  const isSaving = saveStatus === "saving";
  const canDrag = !!onLayoutChange && !isSaving && !loading;
  const totalChairs = tables.reduce((sum, table) => sum + (Number(table.chairs) || 0), 0);
  const inactiveCount = tables.filter((table) => !table.isActive).length;

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveTable((active.data.current?.table as TableRecord) ?? null);
    setActiveSlot((active.data.current?.slotIndex as number) ?? null);
  };

  const handleDragOver = ({ over }: DragOverEvent) => {
    setOverSlot((over?.data.current?.slotIndex as number) ?? null);
  };

  const clearDrag = () => {
    setActiveTable(null);
    setActiveSlot(null);
    setOverSlot(null);
  };

  // The dragged card covers its target, so it says what a drop will do.
  const swapTarget = overSlot !== null ? slots[overSlot] : null;
  const dropHint = overSlot === null || overSlot === activeSlot
    ? null
    : swapTarget
      ? `Swap with ${swapTarget.tableName}`
      : "Move here";

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    clearDrag();
    if (!over) return;
    const from = active.data.current?.slotIndex as number;
    const to = over.data.current?.slotIndex as number;
    if (from === to) return;
    onLayoutChange?.(getLayoutChanges(moveTableToSlot(slots, from, to)));
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-gray-500">
        {onLayoutChange ? (
          <p className="flex items-center gap-1.5" title="Keyboard: focus a table, press M, use the arrow keys, then Enter to drop or Escape to cancel.">
            <Move size={13} aria-hidden="true" className="shrink-0 text-gray-400" />
            Drag a table to an empty spot to move it, or onto another table to swap them. Click a table to edit it.
          </p>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-600">
            {tables.length} {tables.length === 1 ? "table" : "tables"} · {totalChairs} {totalChairs === 1 ? "chair" : "chairs"}
            {inactiveCount > 0 ? ` · ${inactiveCount} inactive` : ""}
          </span>
          <span role="status" className="flex min-w-[70px] items-center gap-1 font-semibold">
            {isSaving && (
              <>
                <Loader2 size={13} className="animate-spin text-gray-400" aria-hidden="true" />
                Saving...
              </>
            )}
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1 text-green-700">
                <Check size={13} aria-hidden="true" />
                Saved
              </span>
            )}
          </span>
        </div>
      </div>

      {needsRepair && onLayoutChange && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p className="flex items-center gap-2">
            <AlertTriangle size={15} aria-hidden="true" className="shrink-0" />
            Some tables in this section have a duplicate or missing position, so POS may not show this arrangement.
          </p>
          <Button
            size="sm"
            variant="secondary"
            disabled={isSaving}
            onClick={() => onLayoutChange(getLayoutChanges(slots))}
          >
            Save this arrangement
          </Button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={detectSlot}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={clearDrag}
        accessibility={{
          screenReaderInstructions: {
            draggable: "Press Enter to edit this table. Press M to move it, the arrow keys to choose a spot, Enter to drop, or Escape to cancel.",
          },
        }}
      >
        {/* Same columns as the POS floor plan, so the arrangement here matches the POS at the same window width. */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
          {slots.map((table, slotIndex) => (
            <TableSlot
              key={slotIndex}
              slotIndex={slotIndex}
              occupied={!!table}
              isDragActive={activeTable !== null}
              isDragSource={activeSlot === slotIndex}
              onAdd={onEmptySlotClick ? () => onEmptySlotClick(slotIndex + 1) : undefined}
            >
              {table && (
                <DraggableTableCard
                  table={table}
                  slotIndex={slotIndex}
                  selected={selectedId === table.tableId}
                  canDrag={canDrag}
                  disabled={loading}
                  onEdit={onEdit}
                  onDeleteRequest={activeTable ? undefined : onDeleteRequest}
                />
              )}
            </TableSlot>
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTable ? (
            <div className="relative">
              <TableCardFace table={activeTable} draggable lifted />
              {dropHint && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#49293e] px-2.5 py-1 text-[11px] font-bold text-white shadow-lg">
                  {dropHint}
                </span>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default TableCardGrid;
