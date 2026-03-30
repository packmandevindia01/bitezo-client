import { useState } from "react";
import type { DragEndEvent, DragOverEvent } from "@dnd-kit/core";
import type { LineItem } from "../types";

interface Props {
  allLines: LineItem[];
  moveLine: (fromId: string, toSection: "header" | "footer") => void;
  reorderLines: (activeId: string, overId: string) => void;
}

export const useDragAndDrop = ({
  allLines,
  moveLine,
  reorderLines,
}: Props) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const normalizeId = (id: string) => id.replace("preview-", "");

  const handleDragStart = (id: string) => {
    setActiveId(normalizeId(id));
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;

    const activeLineId = normalizeId(String(active.id));
    const overIdRaw = String(over.id);
    const overId = normalizeId(overIdRaw);

    const activeLine = allLines.find((l) => l.id === activeLineId);
    if (!activeLine) return;

    // 🚫 Prevent self-trigger (IMPORTANT)
    if (activeLineId === overId) return;

    // ✅ Handle drop zones
    if (overIdRaw === "zone-header" || overIdRaw === "preview-zone-header") {
      if (activeLine.section !== "header") {
        moveLine(activeLineId, "header");
      }
      return;
    }

    if (overIdRaw === "zone-footer" || overIdRaw === "preview-zone-footer") {
      if (activeLine.section !== "footer") {
        moveLine(activeLineId, "footer");
      }
      return;
    }

    // ✅ Handle line-to-line
    const overLine = allLines.find((l) => l.id === overId);
    if (!overLine) return;

    // 🚫 Prevent unnecessary updates (CRITICAL FIX)
    if (overLine.section !== activeLine.section) {
      moveLine(activeLineId, overLine.section);
    }
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);

    if (!over) return;

    const activeLineId = normalizeId(String(active.id));
    const overLineId = normalizeId(String(over.id));

    // 🚫 Prevent same item reorder
    if (activeLineId === overLineId) return;

    reorderLines(activeLineId, overLineId);
  };

  const activeItem = activeId
    ? allLines.find((l) => l.id === activeId)
    : null;

  return {
    activeId,
    activeItem,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
};
