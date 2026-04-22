import { useCallback, useEffect, useMemo, useState } from "react";
import { unitService } from "../services/unitService";
import type { UnitListItem } from "../types";

export const useUnitList = () => {
  const [units, setUnits] = useState<UnitListItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchUnits = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const data = await unitService.list();
      setUnits(data);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load units.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  const filteredUnits = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return units;

    return units.filter((u) =>
      [u.name, u.category].some((v) => v.toLowerCase().includes(query))
    );
  }, [units, search]);

  return {
    units,
    setUnits,
    listLoading,
    listError,
    search,
    setSearch,
    filteredUnits,
    fetchUnits,
  };
};
