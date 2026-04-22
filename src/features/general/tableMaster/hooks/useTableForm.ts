import { useState } from "react";
import { emptyTableForm } from "../constants";
import type { TableForm } from "../types";

export const useTableForm = (initialSectionId: number | null) => {
  const [form, setForm] = useState<TableForm>({
    ...emptyTableForm,
    sectionId: initialSectionId ? String(initialSectionId) : "",
  });
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const setField = <K extends keyof TableForm>(key: K, value: TableForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = (sectionId: string = String(initialSectionId || "")) => {
    setForm({ ...emptyTableForm, sectionId });
    setSelectedId(null);
    setOpen(false);
    setMode("create");
  };

  return {
    form,
    setForm,
    open,
    setOpen,
    mode,
    setMode,
    selectedId,
    setSelectedId,
    setField,
    resetForm,
  };
};
