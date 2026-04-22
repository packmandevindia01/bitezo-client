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
      });
    } catch (err: any) {
      showToast(err.message || "Failed to fetch table details", "error");
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
    } catch (err: any) {
      showToast(err.message || "Failed to delete table", "error");
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
      const payload: TablePayload = {
        tableName: trimmedTableName,
        chairs: Number(form.chairs || 0),
        isActive: form.isActive,
        sectionId: Number(form.sectionId),
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
    } catch (err: any) {
       showToast(err.message || "Failed to save table", "error");
    } finally {
      setLoading(false);
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
    visibleTables: tables,
    setSearch,
    setField,
    resetForm,
    handleSave,
    handleEdit,
    handleDelete,
    handleSectionChange,
    setCreateMode,
  };
};
