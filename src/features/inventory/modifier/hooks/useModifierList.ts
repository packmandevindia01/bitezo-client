import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../../../../app/providers/useToast";
import { modifierService } from "../services/modifierService";
import { modifierTypeService } from "../../modifierType/services/modifierTypeService";
import { getCategories } from "../../category/services/categoryService";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import { fetchGlobalMasterData } from "../../shared/store/masterDataSlice";
import type { ModifierRecord } from "../types";
import type { ModifierTypeRecord } from "../../modifierType/types";
import type { CategoryListItem } from "../../category/types";

export const useModifierList = () => {
  const { showToast } = useToast();
  const dispatch = useAppDispatch();
  const [records, setRecords] = useState<ModifierRecord[]>([]);
  const [modifierTypes, setModifierTypes] = useState<ModifierTypeRecord[]>([]);
  const [categories, setCategories] = useState<CategoryListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const { branches } = useAppSelector((state) => state.masterData);

  const fetchModifiers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await modifierService.list();
      setRecords(data);
    } catch (err: any) {
      showToast(err.message || "Failed to load modifiers", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchTypesAndCats = useCallback(async () => {
    try {
      const [types, cats] = await Promise.all([
        modifierTypeService.list(true),
        getCategories()
      ]);
      setModifierTypes(types);
      setCategories(cats);
    } catch (err) {
      console.error("Failed to load types or categories", err);
    }
  }, []);

  useEffect(() => {
    fetchModifiers();
    if (branches.length === 0) {
      dispatch(fetchGlobalMasterData());
    }
  }, [fetchModifiers, dispatch, branches.length]);

  const filteredModifiers = useMemo(() => {
    const query = (search || "").trim().toLowerCase();
    if (!query) return records;

    return records.filter((item) =>
      [(item.name || ""), (item.arabic || ""), (item.color || "")].some((value) => 
        (value || "").toLowerCase().includes(query)
      )
    );
  }, [records, search]);

  return {
    records,
    setRecords,
    modifierTypes,
    categories,
    loading,
    setLoading,
    search,
    setSearch,
    filteredModifiers,
    fetchModifiers,
    fetchTypesAndCats,
    branches,
  };
};
