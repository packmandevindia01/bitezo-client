import { useCallback, useEffect, useMemo, useState } from "react";
import { taxService } from "../services/taxService";
import type { TaxListItem } from "../types";

export const useTaxList = () => {
  const [taxes, setTaxes] = useState<TaxListItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchTaxes = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const data = await taxService.list();
      setTaxes(data);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load taxes.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTaxes();
  }, [fetchTaxes]);

  const filteredTaxes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return taxes;

    return taxes.filter((t) =>
      t.name.toLowerCase().includes(query)
    );
  }, [taxes, search]);

  return {
    taxes,
    setTaxes,
    listLoading,
    listError,
    search,
    setSearch,
    filteredTaxes,
    fetchTaxes,
  };
};
