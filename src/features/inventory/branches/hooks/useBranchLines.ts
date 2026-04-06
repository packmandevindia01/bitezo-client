import { useState, useMemo } from "react";
import { makeLines } from "../utils/lineHelpers";
import type { LineItem } from "../types";
import { arrayMove } from "@dnd-kit/sortable";

const buildInitialLines = (initialLines?: LineItem[]) =>
  initialLines && initialLines.length > 0
    ? initialLines.map((line) => ({ ...line }))
    : [...makeLines("header"), ...makeLines("footer")];

export const useBranchLines = (initialLines?: LineItem[]) => {
  const [allLines, setAllLines] = useState<LineItem[]>(() => buildInitialLines(initialLines));

  // ✅ Memoized (prevents unnecessary recalculation)
  const headerLines = useMemo(
    () => allLines.filter((l) => l.section === "header"),
    [allLines]
  );

  const footerLines = useMemo(
    () => allLines.filter((l) => l.section === "footer"),
    [allLines]
  );

  // ✅ Safe update (no unnecessary state updates)
  const updateLine = (id: string, patch: Partial<LineItem>) =>
    setAllLines((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, ...patch } : l
      )
    );

  // ✅ CRITICAL FIX (prevent re-render loop)
  const moveLine = (fromId: string, toSection: "header" | "footer") =>
    setAllLines((prev) =>
      prev.map((l) =>
        l.id === fromId && l.section !== toSection
          ? { ...l, section: toSection }
          : l
      )
    );

  // ✅ Prevent useless reorder
  const reorderLines = (activeId: string, overId: string) => {
    if (activeId === overId) return;

    setAllLines((prev) => {
      const from = prev.findIndex((l) => l.id === activeId);
      const to = prev.findIndex((l) => l.id === overId);

      if (from === -1 || to === -1) return prev;

      return arrayMove(prev, from, to);
    });
  };

  // ✅ Reset with stable init
  const resetLines = (nextLines?: LineItem[]) => setAllLines(buildInitialLines(nextLines));

  return {
    allLines,
    headerLines,
    footerLines,
    updateLine,
    moveLine,
    reorderLines,
    resetLines,
  };
};
