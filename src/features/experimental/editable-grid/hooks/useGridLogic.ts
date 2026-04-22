import { useState, useRef, useEffect } from "react";
import type { GridRow } from "../types";

const INITIAL_DATA: GridRow[] = [
  { id: "1", barcode: "123456789", unit: "Small", cost: 1.0 },
  { id: "2", barcode: "123456789", unit: "Medium", cost: "" },
  { id: "3", barcode: "987654321", unit: "Small", cost: 2.5 },
];

export const TOTAL_COLS = 3;

export const useGridLogic = () => {
  const [rows, setRows] = useState<GridRow[]>(INITIAL_DATA);
  const [focusPos, setFocusPos] = useState({ r: 0, c: 0 });
  const cellRefs = useRef<Map<string, HTMLInputElement | HTMLSelectElement>>(new Map());

  // Handle focus changes (auto-selection for inputs)
  useEffect(() => {
    const key = `${focusPos.r}-${focusPos.c}`;
    const el = cellRefs.current.get(key);
    if (el) {
      el.focus();
      if (el instanceof HTMLInputElement) {
        el.select();
      }
    }
  }, [focusPos]);

  const addRow = () => {
    const newRow: GridRow = {
      id: crypto.randomUUID(),
      barcode: "",
      unit: "Small",
      cost: "",
    };
    setRows((prev) => [...prev, newRow]);
  };

  const removeRow = (idx: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== idx));
    if (focusPos.r >= rows.length - 1) {
      setFocusPos((p) => ({ ...p, r: Math.max(0, rows.length - 2) }));
    }
  };

  const handleRowChange = <K extends keyof GridRow>(idx: number, key: K, value: GridRow[K]) => {
    if (key === "cost" && value !== "" && !/^\d*\.?\d*$/.test(String(value))) return;

    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value };
      return next;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, r: number, c: number) => {
    const isLastRow = r === rows.length - 1;
    const isLastCol = c === TOTAL_COLS - 1;

    switch (e.key) {
      case "ArrowUp":
        if (e.currentTarget instanceof HTMLSelectElement) return;
        e.preventDefault();
        setFocusPos((prev) => ({ ...prev, r: Math.max(0, r - 1) }));
        break;
      case "ArrowDown":
        if (e.currentTarget instanceof HTMLSelectElement) return;
        e.preventDefault();
        if (isLastRow) addRow();
        setFocusPos((prev) => ({ ...prev, r: Math.min(rows.length, r + 1) }));
        break;
      case "ArrowLeft":
        if (e.currentTarget instanceof HTMLInputElement && e.currentTarget.selectionStart !== 0) return;
        setFocusPos((prev) => ({ ...prev, c: Math.max(0, c - 1) }));
        break;
      case "ArrowRight":
        if (e.currentTarget instanceof HTMLInputElement && e.currentTarget.selectionStart !== e.currentTarget.value.length) return;
        setFocusPos((prev) => ({ ...prev, c: Math.min(TOTAL_COLS - 1, c + 1) }));
        break;
      case "Enter":
        e.preventDefault();
        if (isLastRow) addRow();
        setFocusPos({ r: r + 1, c: 0 });
        break;
      case "Tab":
        if (isLastCol && isLastRow && !e.shiftKey) {
          e.preventDefault();
          addRow();
          setFocusPos({ r: r + 1, c: 0 });
        }
        break;
    }
  };

  return {
    rows,
    focusPos,
    cellRefs,
    setFocusPos,
    addRow,
    removeRow,
    handleRowChange,
    handleKeyDown,
  };
};
