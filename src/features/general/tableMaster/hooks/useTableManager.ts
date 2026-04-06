import { useMemo, useState } from "react";
import { emptyTableForm, initialTables } from "../constants";
import type { TableForm, TableRecord } from "../types";

export const useTableManager = () => {
  const [tables, setTables] = useState<TableRecord[]>(initialTables);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState("Dining Hall");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<TableForm>(emptyTableForm);

  const filteredTables = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return tables;
    }

    return tables.filter((table) =>
      [table.section, table.tableNo, table.status, String(table.chairs)].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [search, tables]);

  const visibleTables = useMemo(
    () => tables.filter((table) => table.section === selectedSection),
    [selectedSection, tables],
  );

  const syncFormFromRecord = (record: TableRecord) => {
    setForm({
      section: record.section,
      tableNo: record.tableNo,
      chairs: String(record.chairs),
      status: record.status,
    });
  };

  const resetForm = (section = selectedSection) => {
    setForm({ ...emptyTableForm, section });
    setSelectedId(null);
  };

  const closeModal = () => {
    setOpen(false);
    setMode("create");
    resetForm();
  };

  const openCreateModal = () => {
    setMode("create");
    resetForm(selectedSection);
    setOpen(true);
  };

  const handleEdit = (record: TableRecord) => {
    setMode("edit");
    setSelectedSection(record.section);
    setSelectedId(record.id);
    syncFormFromRecord(record);
    setOpen(true);
  };

  const handleDelete = (record: TableRecord) => {
    setTables((current) => current.filter((item) => item.id !== record.id));
    if (selectedId === record.id) {
      setMode("create");
      resetForm();
    }
  };

  const handleSelectTable = (record: TableRecord) => {
    setMode("edit");
    setSelectedId(record.id);
    syncFormFromRecord(record);
  };

  const handleSectionChange = (value: string) => {
    setSelectedSection(value);
    setForm((current) => ({ ...current, section: value }));

    if (mode === "create") {
      setSelectedId(null);
      return;
    }

    const firstMatch = tables.find((table) => table.section === value) ?? null;
    setSelectedId(firstMatch?.id ?? null);
    if (firstMatch) {
      syncFormFromRecord(firstMatch);
      return;
    }

    resetForm(value);
    setMode("create");
  };

  const setField = <K extends keyof TableForm>(key: K, value: TableForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setCreateMode = () => {
    setMode("create");
    resetForm(selectedSection);
  };

  const handleSave = () => {
    const trimmedTableNo = form.tableNo.trim();
    if (!trimmedTableNo) {
      return;
    }

    const nextTable: TableRecord = {
      id:
        selectedId ??
        (tables.length === 0 ? 1 : Math.max(...tables.map((table) => table.id)) + 1),
      section: form.section,
      tableNo: trimmedTableNo,
      chairs: Number(form.chairs || 0),
      status: form.status,
    };

    if (mode === "edit" && selectedId !== null) {
      setTables((current) =>
        current.map((table) => (table.id === selectedId ? nextTable : table)),
      );
    } else {
      setTables((current) => [...current, nextTable]);
    }

    closeModal();
  };

  return {
    form,
    open,
    search,
    mode,
    selectedId,
    selectedSection,
    filteredTables,
    visibleTables,
    setSearch,
    setField,
    resetForm,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    handleDelete,
    handleSelectTable,
    handleSectionChange,
    setCreateMode,
  };
};
