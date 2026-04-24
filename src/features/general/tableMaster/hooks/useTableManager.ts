import { tableService } from "../services/tableService";
import type { TableRecord, TablePayload } from "../types";
import { useTableSections } from "./useTableSections";
import { useTableList } from "./useTableList";
import { useTableForm } from "./useTableForm";
import { useToast } from "../../../../app/providers/useToast";

export const useTableManager = () => {
  const { showToast } = useToast();
  
  // Compose specialized hooks
  const { sections, selectedSectionId, setSelectedSectionId, sectionError } = useTableSections();
  const { tables, setTables, loading, setLoading, error, search, setSearch, filteredTables, fetchTables } = useTableList(selectedSectionId);
  const { form, setForm, open, setOpen, mode, setMode, selectedId, setSelectedId, setField, resetForm } = useTableForm(selectedSectionId);

  const syncFormFromRecord = async (tableId: number) => {
    setLoading(true);
    try {
      const record = await tableService.getById(tableId);
      setForm({
        sectionId: String(selectedSectionId),
        tableName: record.tableName,
        chairs: String(record.chairs),
        isActive: record.isActive,
        position: record.position || 0,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch table details";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record: TableRecord) => {
    setMode("edit");
    setSelectedId(record.tableId);
    syncFormFromRecord(record.tableId);
    setOpen(true);
  };

  const handleDelete = async (record: TableRecord) => {
    setLoading(true);
    try {
      await tableService.remove(record.tableId);
      setTables((current) => current.filter((item) => item.tableId !== record.tableId));
      showToast("Table deleted successfully", "success");
      if (selectedId === record.tableId) {
        resetForm();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete table";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSectionChange = (value: string) => {
    const sectionId = Number(value);
    setSelectedSectionId(sectionId);
    setField("sectionId", value);
    setOpen(false);
    setMode("create");
    setSelectedId(null);
  };

  const setCreateMode = () => {
    setMode("create");
    resetForm(String(selectedSectionId));
    setOpen(true);
  };

  const handleSave = async () => {
    const trimmedTableName = form.tableName.trim();
    if (!trimmedTableName || !form.sectionId) {
      showToast("Please provide a table name and section", "warning");
      return;
    }

    setLoading(true);
    try {
      const maxPos = tables.reduce((max, t) => Math.max(max, t.position || 0), 0);
      
      const payload: TablePayload = {
        tableName: trimmedTableName,
        chairs: Number(form.chairs || 0),
        isActive: form.isActive,
        sectionId: Number(form.sectionId),
        position: mode === "edit" ? (form.position ?? 0) : (maxPos + 1),
      };

      if (mode === "edit" && selectedId !== null) {
        await tableService.update(selectedId, payload);
        showToast("Table updated successfully", "success");
      } else {
        await tableService.create(payload);
        showToast("Table created successfully", "success");
      }
      
      if (selectedSectionId !== null) {
        fetchTables(selectedSectionId);
      }
      setOpen(false);
    } catch (err: unknown) {
       const msg = err instanceof Error ? err.message : "Failed to save table";
       showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = async (newTables: TableRecord[]) => {
    // 1. Update local state immediately for visual responsiveness
    const reorderedWithPositions = newTables.map((table, index) => ({
      ...table,
      position: index + 1
    }));
    setTables(reorderedWithPositions);

    // 2. Persist to backend (Parallel updates for speed)
    try {
      const updatePromises = reorderedWithPositions.map((table) => {
        const payload: TablePayload = {
          tableName: table.tableName,
          chairs: table.chairs,
          isActive: table.isActive,
          sectionId: Number(selectedSectionId),
          position: table.position,
        };
        return tableService.update(table.tableId, payload);
      });

      await Promise.all(updatePromises);
      showToast("Order saved successfully", "success");
    } catch (err: unknown) {
      console.error("[Reorder] Persistence failed:", err);
      showToast("Failed to persist new order", "error");
      if (selectedSectionId) fetchTables(selectedSectionId);
    }
  };

  return {
    form,
    sections,
    loading,
    error: error || sectionError,
    open,
    search,
    mode,
    selectedId,
    selectedSectionId,
    filteredTables,
    visibleTables: filteredTables,
    setSearch,
    setField,
    resetForm,
    handleSave,
    handleEdit,
    handleDelete,
    handleSectionChange,
    setCreateMode,
    handleReorder,
  };
};
