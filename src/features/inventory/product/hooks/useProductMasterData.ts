import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import { fetchGlobalMasterData } from "../../shared/store/masterDataSlice";
import { subCategoryService } from "../../subcategory/services/subCategoryService";
import { useToast } from "../../../../app/providers/useToast";
import type { MasterItem } from "../types";

export const useProductMasterData = (categoryId: string) => {
  const { showToast } = useToast();
  const dispatch = useAppDispatch();
  const { data: masterData, branches } = useAppSelector((state) => state.masterData);
  const [subCategories, setSubCategories] = useState<MasterItem[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  useEffect(() => {
    if (!masterData || branches.length === 0) {
      dispatch(fetchGlobalMasterData());
    }
  }, [dispatch, masterData, branches.length]);

  useEffect(() => {
    const catId = parseInt(categoryId);
    if (!catId) {
      setSubCategories([]);
      return;
    }

    setLoadingSubs(true);
    subCategoryService
      .getSubCategories(undefined, undefined, catId)
      .then((subs) => setSubCategories(subs.map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => showToast("Failed to load sub categories.", "error"))
      .finally(() => setLoadingSubs(false));
  }, [categoryId, showToast]);

  return {
    masterData,
    branches,
    subCategories,
    loadingSubs,
  };
};
