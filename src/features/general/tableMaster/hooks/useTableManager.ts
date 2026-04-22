import { useCallback, useEffect, useMemo, useState } from "react";
import { emptyTableForm } from "../constants";
import type { TableForm, TableRecord, TablePayload } from "../types";
import { tableService } from "../services/tableService";
import { sectionService } from "../../section/services/sectionService";

export const useTableManager = () => {
  const [tables, setTables] = useState<TableRecord[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<TableForm>(emptyTableForm);

  // Fetch sections on mount
  useEffect(() => {
    const fetchSections = async () => {
      try {
        const data = await sectionService.list();
        setSections(data);
        if (data.length > 0 && selectedSectionId === null) {
          setSelectedSectionId(data[0].sectionId);
          setForm(prev => ({ ...prev, sectionId: String(data[0].sectionId) }));
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch sections");
      }
    };
    fetchSections();
  }, []);

  // Fetch tables when sectionId changes
  const fetchTables = useCallback(async (sectionId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await tableService.list(sectionId);
      setTables(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch tables");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSectionId !== null) {
      fetchTables(selectedSectionId);
    }
  }, [selectedSectionId, fetchTables]);

  const filteredTables = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tables;

    return tables.filter((table) =>
      [table.tableName, String(table.chairs)].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [search, tables]);

  const visibleTables = tables; // Already filtered by sectionId via API

  const syncFormFromRecord = async (tableId: number) => {
    setLoading(true);
    try {
      const record = await tableService.getById(tableId);
      setForm({
        sectionId: String(selectedSectionId), // Use selectedSectionId as backend doesn't return it
        tableName: record.tableName,
        chairs: String(record.chairs),
        isActive: record.isActive,
      });
    } catch (err: any) {
      setError(err.message || "Failed to fetch table details");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = (sectionId = String(selectedSectionId)) => {
    setForm({ ...emptyTableForm, sectionId });
    setSelectedId(null);
    setOpen(false);
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
      if (selectedId === record.tableId) {
        setMode("create");
        resetForm();
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete table");
    } finally {
      setLoading(false);
    }
  };

  const handleSectionChange = (value: string) => {
    const sectionId = Number(value);
    setSelectedSectionId(sectionId);
    setForm((current) => ({ ...current, sectionId: value }));
    setOpen(false);
    setMode("create");
    setSelectedId(null);
  };

  const setField = <K extends keyof TableForm>(key: K, value: TableForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setCreateMode = () => {
    setMode("create");
    resetForm(String(selectedSectionId));
    setOpen(true);
  };

  const handleSave = async () => {
    const trimmedTableName = form.tableName.trim();
    if (!trimmedTableName || !form.sectionId) {
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
      } else {
        await tableService.create(payload);
      }
      
      if (selectedSectionId !== null) {
        fetchTables(selectedSectionId);
      }
      setOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to save table");
    } finally {
      setLoading(false);
    }
  };

  return {
    form,
    sections,
    loading,
    error,
    open,
    search,
    mode,
    selectedId,
    selectedSectionId,
    filteredTables,
    visibleTables,
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
