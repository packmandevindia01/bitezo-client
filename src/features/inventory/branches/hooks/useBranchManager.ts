import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../../../app/providers/useToast";
import { createBranch, deleteBranch, fetchBranches, fetchBranchNames, updateBranch } from "../services/branchApi";
import type { BranchPayload, BranchRecord } from "../types";
import { useAppDispatch } from "../../../../app/hooks";
import { fetchGlobalMasterData, fetchGlobalBranches, addMasterBranch } from "../../shared/store/masterDataSlice";
import { notifyBranchesUpdated } from "../utils/branchSync";

export const useBranchManager = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchRecord | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<BranchRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;

    const loadBranches = async () => {
      setLoading(true);
      try {
        const records = await fetchBranches();
        if (!active) return;

        setBranches((prev) => {
          const detailedRecords = new Map(
            prev.filter((item) => item.detailsLoaded).map((item) => [item.id, item])
          );
          return records.map((record) => {
            const detailed = detailedRecords.get(record.id);
            return detailed ? { ...detailed, branchName: record.branchName } : record;
          });
        });
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : "Failed to load branches";
        showToast(message, "error");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadBranches();
    return () => { active = false; };
  }, [showToast]);

  const handleSave = async (payload: BranchPayload) => {
    if (editingBranch) {
      const updatedRecord = await updateBranch(editingBranch.id, payload);
      setBranches((prev) =>
        prev.map((item) => (item.id === editingBranch.id ? updatedRecord : item))
      );
      showToast("Branch updated successfully", "success");
    } else {
      const createdRecord = await createBranch(payload);
      setBranches((prev) => [...prev, createdRecord]);
      let branchId = createdRecord?.id;
      const branchNameToUse = createdRecord?.branchName || payload.branchName;
      if (!branchId || branchId === 0) {
        try {
          const [namesRes, listRes] = await Promise.allSettled([
            fetchBranchNames(true),
            fetchBranches(),
          ]);
          if (namesRes.status === "fulfilled" && Array.isArray(namesRes.value)) {
            const found = namesRes.value.find((b: any) => (b.branchName || b.name || "").trim().toLowerCase() === branchNameToUse.trim().toLowerCase());
            if (found && (found.id || (found as any).branchId)) {
              branchId = found.id || (found as any).branchId;
            }
          }
          if ((!branchId || branchId === 0) && listRes.status === "fulfilled" && Array.isArray(listRes.value)) {
            const found = listRes.value.find((b: any) => (b.branchName || b.name || "").trim().toLowerCase() === branchNameToUse.trim().toLowerCase());
            if (found && (found.id || (found as any).branchId)) {
              branchId = found.id || (found as any).branchId;
            }
          }
        } catch {
          // continue
        }
      }
      if (branchId && branchId !== 0 && branchNameToUse) {
        dispatch(addMasterBranch({ id: Number(branchId), name: branchNameToUse }));
      }
      showToast("Branch created successfully", "success");
    }

    // Invalidate and refetch all branch caches (both active and inactive)
    queryClient.invalidateQueries({ queryKey: ["allBranchesList"], refetchType: "all" });
    queryClient.invalidateQueries({ queryKey: ["branchNames"], refetchType: "all" });
    queryClient.invalidateQueries({ queryKey: ["branches"], refetchType: "all" });
    queryClient.invalidateQueries({ queryKey: ["stockAdjustmentBranches"], refetchType: "all" });
    queryClient.invalidateQueries({ queryKey: ["physicalEntryBranches"], refetchType: "all" });
    queryClient.invalidateQueries({ queryKey: ["internalStockTransferBranches"], refetchType: "all" });
    queryClient.invalidateQueries({ queryKey: ["internalStockTransferMaster"], refetchType: "all" });
    queryClient.invalidateQueries({ queryKey: ["internalStockTransferBranchSpecific"], refetchType: "all" });
    queryClient.invalidateQueries({ queryKey: ["bomBranches"], refetchType: "all" });
    queryClient.invalidateQueries({ queryKey: ["branchList"], refetchType: "all" });
    queryClient.invalidateQueries({ queryKey: ["categoryBranches"], refetchType: "all" });
    queryClient.invalidateQueries({ queryKey: ["customerBranches"], refetchType: "all" });
    queryClient.invalidateQueries({ queryKey: ["receiptMaster"], refetchType: "all" });
    queryClient.invalidateQueries({ queryKey: ["paymentMaster"], refetchType: "all" });
    queryClient.invalidateQueries({ queryKey: ["recipeBranches"], refetchType: "all" });

    void queryClient.refetchQueries({ queryKey: ["allBranchesList"], type: "all" });
    void queryClient.refetchQueries({ queryKey: ["branches"], type: "all" });
    void queryClient.refetchQueries({ queryKey: ["stockAdjustmentBranches"], type: "all" });
    void queryClient.refetchQueries({ queryKey: ["physicalEntryBranches"], type: "all" });
    void queryClient.refetchQueries({ queryKey: ["internalStockTransferBranches"], type: "all" });
    void queryClient.refetchQueries({ queryKey: ["internalStockTransferMaster"], type: "all" });
    void queryClient.refetchQueries({ queryKey: ["internalStockTransferBranchSpecific"], type: "all" });
    void queryClient.refetchQueries({ queryKey: ["bomBranches"], type: "all" });
    void queryClient.refetchQueries({ queryKey: ["recipeBranches"], type: "all" });
    void queryClient.refetchQueries({ queryKey: ["branchNames"], type: "all" });
    void queryClient.refetchQueries({ queryKey: ["categoryBranches"], type: "all" });
    void queryClient.refetchQueries({ queryKey: ["customerBranches"], type: "all" });
    void queryClient.refetchQueries({ queryKey: ["branchList"], type: "all" });

    void dispatch(fetchGlobalBranches());
    void dispatch(fetchGlobalMasterData());
    notifyBranchesUpdated();
    setOpen(false);
    setEditingBranch(null);
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      setDeleting(true);
      await deleteBranch(deleteCandidate.id);
      setBranches((prev) => prev.filter((item) => item.id !== deleteCandidate.id));
      showToast("Branch deleted successfully", "success");

      queryClient.invalidateQueries({ queryKey: ["allBranchesList"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["branchNames"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["branches"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["stockAdjustmentBranches"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["physicalEntryBranches"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["internalStockTransferBranches"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["internalStockTransferMaster"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["internalStockTransferBranchSpecific"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["bomBranches"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["recipeBranches"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["branchList"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["categoryBranches"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["customerBranches"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["receiptMaster"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["paymentMaster"], refetchType: "all" });

      void queryClient.refetchQueries({ queryKey: ["allBranchesList"], type: "all" });
      void queryClient.refetchQueries({ queryKey: ["branches"], type: "all" });
      void queryClient.refetchQueries({ queryKey: ["stockAdjustmentBranches"], type: "all" });
      void queryClient.refetchQueries({ queryKey: ["physicalEntryBranches"], type: "all" });
      void queryClient.refetchQueries({ queryKey: ["internalStockTransferBranches"], type: "all" });
      void queryClient.refetchQueries({ queryKey: ["internalStockTransferMaster"], type: "all" });
      void queryClient.refetchQueries({ queryKey: ["internalStockTransferBranchSpecific"], type: "all" });
      void queryClient.refetchQueries({ queryKey: ["bomBranches"], type: "all" });
      void queryClient.refetchQueries({ queryKey: ["recipeBranches"], type: "all" });
      void queryClient.refetchQueries({ queryKey: ["branchNames"], type: "all" });
      void queryClient.refetchQueries({ queryKey: ["categoryBranches"], type: "all" });
      void queryClient.refetchQueries({ queryKey: ["customerBranches"], type: "all" });
      void queryClient.refetchQueries({ queryKey: ["branchList"], type: "all" });

      void dispatch(fetchGlobalBranches());
      void dispatch(fetchGlobalMasterData());
      notifyBranchesUpdated();
      setDeleteCandidate(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete branch";
      showToast(message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = (record: BranchRecord) => {
    setEditingBranch(record);
    setOpen(true);
  };

  const openCreateModal = () => {
    setEditingBranch(null);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditingBranch(null);
  };

  const filteredBranches = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query 
      ? branches.filter((item) => item.branchName.toLowerCase().includes(query))
      : [...branches];
    
    return filtered.sort((a, b) => {
      return (b.id || 0) - (a.id || 0);
    });
  }, [branches, search]);

  return {
    search,
    setSearch,
    open,
    editingBranch,
    deleteCandidate,
    setDeleteCandidate,
    deleting,
    handleSave,
    handleEdit,
    handleDelete,
    openCreateModal,
    closeModal,
    filteredBranches,
    loading,
  };
};