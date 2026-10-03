import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Loader } from "../../../../components/common";
import { useToast } from "../../../../app/providers/useToast";
import { useAppDispatch } from "../../../../app/hooks";
import { fetchGlobalMasterData, fetchGlobalBranches, addMasterBranch } from "../../shared/store/masterDataSlice";
import BranchForm from "../components/BranchForm";
import { fetchBranchById, createBranch, updateBranch, deleteBranch, fetchBranchNames, fetchBranches } from "../services/branchApi";
import { notifyBranchesUpdated } from "../utils/branchSync";
import type { BranchPayload, BranchRecord } from "../types";

const BranchFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(!!id);
  const [initialData, setInitialData] = useState<BranchRecord | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadBranch = async () => {
      try {
        const data = await fetchBranchById(Number(id));
        setInitialData(data);
      } catch {
        showToast("Failed to load branch details", "error");
        navigate("/dashboard/branches");
      } finally {
        setLoading(false);
      }
    };

    loadBranch();
  }, [id, navigate, showToast]);

  const handleSubmit = async (payload: BranchPayload) => {
    try {
      let savedBranch: BranchRecord | null = null;
      if (id) {
        savedBranch = await updateBranch(Number(id), payload);
        showToast("Branch Master updated successfully", "success");
      } else {
        savedBranch = await createBranch(payload);
        showToast("Branch Master created successfully", "success");
      }

      const branchNameToUse = savedBranch?.branchName || payload.branchName;
      if (branchNameToUse) {
        let branchId = savedBranch?.id;
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
        if (branchId && branchId !== 0) {
          dispatch(addMasterBranch({ id: Number(branchId), name: branchNameToUse }));
        }
      }

      queryClient.invalidateQueries({ queryKey: ["allBranchesList"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["branchNames"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["branches"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["stockAdjustmentBranches"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["internalStockTransferBranches"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["internalStockTransferMaster"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["internalStockTransferBranchSpecific"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["bomBranches"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["recipeBranches"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["physicalEntryBranches"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["branchList"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["categoryBranches"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["customerBranches"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["receiptMaster"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["paymentMaster"], refetchType: "all" });

      void queryClient.refetchQueries({ queryKey: ["allBranchesList"], type: "all" });
      void queryClient.refetchQueries({ queryKey: ["branches"], type: "all" });
      void queryClient.refetchQueries({ queryKey: ["stockAdjustmentBranches"], type: "all" });
      void queryClient.refetchQueries({ queryKey: ["internalStockTransferBranches"], type: "all" });
      void queryClient.refetchQueries({ queryKey: ["internalStockTransferMaster"], type: "all" });
      void queryClient.refetchQueries({ queryKey: ["internalStockTransferBranchSpecific"], type: "all" });
      void queryClient.refetchQueries({ queryKey: ["bomBranches"], type: "all" });
      void queryClient.refetchQueries({ queryKey: ["recipeBranches"], type: "all" });
      void queryClient.refetchQueries({ queryKey: ["physicalEntryBranches"], type: "all" });
      void queryClient.refetchQueries({ queryKey: ["branchNames"], type: "all" });
      void queryClient.refetchQueries({ queryKey: ["categoryBranches"], type: "all" });
      void queryClient.refetchQueries({ queryKey: ["customerBranches"], type: "all" });
      void queryClient.refetchQueries({ queryKey: ["branchList"], type: "all" });

      void dispatch(fetchGlobalBranches());
      void dispatch(fetchGlobalMasterData());
      notifyBranchesUpdated();
      navigate("/dashboard/branches");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save branch";
      showToast(message, "error");
    }
  };

  const handleDelete = async () => {
     if (!id) return;
     try {
       await deleteBranch(Number(id));
       showToast("Branch deleted successfully", "success");

       queryClient.invalidateQueries({ queryKey: ["allBranchesList"], refetchType: "all" });
       queryClient.invalidateQueries({ queryKey: ["branchNames"], refetchType: "all" });
       queryClient.invalidateQueries({ queryKey: ["branches"], refetchType: "all" });
       queryClient.invalidateQueries({ queryKey: ["stockAdjustmentBranches"], refetchType: "all" });
       queryClient.invalidateQueries({ queryKey: ["internalStockTransferBranches"], refetchType: "all" });
       queryClient.invalidateQueries({ queryKey: ["internalStockTransferMaster"], refetchType: "all" });
       queryClient.invalidateQueries({ queryKey: ["internalStockTransferBranchSpecific"], refetchType: "all" });
       queryClient.invalidateQueries({ queryKey: ["bomBranches"], refetchType: "all" });
       queryClient.invalidateQueries({ queryKey: ["recipeBranches"], refetchType: "all" });
       queryClient.invalidateQueries({ queryKey: ["physicalEntryBranches"], refetchType: "all" });
       queryClient.invalidateQueries({ queryKey: ["branchList"], refetchType: "all" });
       queryClient.invalidateQueries({ queryKey: ["categoryBranches"], refetchType: "all" });
       queryClient.invalidateQueries({ queryKey: ["customerBranches"], refetchType: "all" });
       queryClient.invalidateQueries({ queryKey: ["receiptMaster"], refetchType: "all" });
       queryClient.invalidateQueries({ queryKey: ["paymentMaster"], refetchType: "all" });

       void queryClient.refetchQueries({ queryKey: ["allBranchesList"], type: "all" });
       void queryClient.refetchQueries({ queryKey: ["branches"], type: "all" });
       void queryClient.refetchQueries({ queryKey: ["stockAdjustmentBranches"], type: "all" });
       void queryClient.refetchQueries({ queryKey: ["internalStockTransferBranches"], type: "all" });
       void queryClient.refetchQueries({ queryKey: ["internalStockTransferMaster"], type: "all" });
       void queryClient.refetchQueries({ queryKey: ["internalStockTransferBranchSpecific"], type: "all" });
       void queryClient.refetchQueries({ queryKey: ["bomBranches"], type: "all" });
       void queryClient.refetchQueries({ queryKey: ["recipeBranches"], type: "all" });
       void queryClient.refetchQueries({ queryKey: ["physicalEntryBranches"], type: "all" });
       void queryClient.refetchQueries({ queryKey: ["branchNames"], type: "all" });
       void queryClient.refetchQueries({ queryKey: ["categoryBranches"], type: "all" });
       void queryClient.refetchQueries({ queryKey: ["customerBranches"], type: "all" });
       void queryClient.refetchQueries({ queryKey: ["branchList"], type: "all" });

       void dispatch(fetchGlobalBranches());
       void dispatch(fetchGlobalMasterData());
       notifyBranchesUpdated();
       navigate("/dashboard/branches");
     } catch {
       showToast("Failed to delete branch", "error");
     }
  };

  if (loading) {
    return <Loader fullScreen text="Loading Branch Master details..." />;
  }

  return (
    <div className="h-[calc(100vh-64px)] bg-gray-50 p-2 xl:p-4 flex flex-col">
      <div className="mx-auto w-full max-w-7xl rounded-[24px] bg-white shadow-premium border border-slate-100 flex flex-col flex-1 overflow-hidden relative">
        <button 
          type="button"
          onClick={() => navigate("/dashboard/branches")}
          className="absolute top-4 right-4 xl:top-6 xl:right-6 z-20 p-2 text-slate-400 hover:text-[#49293e] hover:bg-slate-100 rounded-full transition-colors"
          title="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>

        <div className="flex-1 overflow-y-auto p-4 xl:p-6 relative pt-12 xl:pt-14">
          <BranchForm 
            initialData={initialData}
            onSubmit={handleSubmit}
            onDelete={id ? handleDelete : undefined}
            onClear={() => {
              if (id) navigate("/dashboard/branches/add");
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default BranchFormPage;
