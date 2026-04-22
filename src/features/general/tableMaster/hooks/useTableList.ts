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
      console.log("[TableList] Raw data from server:", data); // DEBUG LOG
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
    // 1. Sort by position
    const sorted = [...tables].sort((a, b) => {
      const posA = Number(a.position) ?? 0;
      const posB = Number(b.position) ?? 0;
      
      // If positions are the same, fallback to ID or Name to keep it stable
      if (posA === posB) return a.tableId - b.tableId;
      return posA - posB;
    });

    console.log("[TableList] Final Sorted Tables:", sorted.map(t => `${t.tableName}(pos:${t.position})`));

    // 2. Filter by search
    const query = search.trim().toLowerCase();
    if (!query) return sorted;

    return sorted.filter((table) =>
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
