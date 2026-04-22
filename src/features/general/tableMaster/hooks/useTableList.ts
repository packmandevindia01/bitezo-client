import { useCallback, useEffect, useMemo, useState } from "react";
import { tableService } from "../services/tableService";
import type { TableRecord } from "../types";

export const useTableList = (selectedSectionId: number | null) => {
  const [tables, setTables] = useState<TableRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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

  return {
    tables,
    setTables,
    loading,
    setLoading,
    error,
    setError,
    search,
    setSearch,
    filteredTables,
    fetchTables,
  };
};
