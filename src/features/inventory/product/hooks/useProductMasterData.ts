import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import { fetchGlobalBranches, fetchGlobalMasterData } from "../../shared/store/masterDataSlice";
import { subCategoryApi } from "../../subcategory/api";
import { useToast } from "../../../../app/providers/useToast";
import type { MasterItem } from "../types";
import { subscribeToBranchUpdates } from "../../branches/utils/branchSync";

export const useProductMasterData = (categoryId: string) => {
  const { showToast } = useToast();
  const dispatch = useAppDispatch();
  const { data: masterData, branches } = useAppSelector((state) => state.masterData);
  const [subCategories, setSubCategories] = useState<MasterItem[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  // Always re-fetch branches on mount so newly created branches appear immediately
  // without requiring a manual page refresh.
  useEffect(() => {
    void dispatch(fetchGlobalBranches());
    if (!masterData) {
      void dispatch(fetchGlobalMasterData());
    }
  }, [dispatch, masterData]);

  // Subscribe to real-time branch updates (same-tab CustomEvent + cross-tab BroadcastChannel/storage).
  // Covers the timing gap: branch created → user navigates to Product form →
  // on-mount dispatch above already handles it, but this also catches live edits/deletions.
  useEffect(() => {
    const unsubscribe = subscribeToBranchUpdates(() => {
      void dispatch(fetchGlobalBranches());
    });
    return () => unsubscribe();
  }, [dispatch]);

  useEffect(() => {
    const catId = parseInt(categoryId);
    if (!catId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSubCategories([]);
      return;
    }

    setLoadingSubs(true);
    subCategoryApi
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
