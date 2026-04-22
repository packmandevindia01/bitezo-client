import { useCallback, useEffect, useMemo, useState } from "react";
import { getCategories } from "../../category/services/categoryService";
import { getSubCategories } from "../services/subCategoryService";
import type { SubCategoryListItem } from "../types";

export const useSubCategoryList = () => {
  const [subCategories, setSubCategories] = useState<SubCategoryListItem[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ label: string; value: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const fetchInitData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, subCats] = await Promise.all([
        getCategories(),
        getSubCategories(),
      ]);
      setCategoryOptions(cats.map((c) => ({ label: c.name, value: c.id })));
      setSubCategories(subCats);
    } catch (err) {
      setError("Failed to load sub categories. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitData();
  }, [fetchInitData]);

  const filteredSubCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return subCategories;

    return subCategories.filter((item) =>
      [item.code, item.name, item.categoryName].some((value) =>
        value?.toLowerCase().includes(query)
      )
    );
  }, [search, subCategories]);

  return {
    subCategories,
    setSubCategories,
    categoryOptions,
    loading,
    error,
    setError,
    search,
    setSearch,
    filteredSubCategories,
    fetchInitData,
  };
};
