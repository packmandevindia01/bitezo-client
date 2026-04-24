import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Loader } from "../../../../components/common";
import { useToast } from "../../../../app/providers/useToast";
import BranchForm from "../components/BranchForm";
import { fetchBranchById, createBranch, updateBranch, deleteBranch } from "../services/branchApi";
import type { BranchPayload, BranchRecord } from "../types";

const BranchFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
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
      if (id) {
        await updateBranch(Number(id), payload);
        showToast("Branch Master updated successfully", "success");
      } else {
        await createBranch(payload);
        showToast("Branch Master created successfully", "success");
      }
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
       navigate("/dashboard/branches");
     } catch {
       showToast("Failed to delete branch", "error");
     }
  };

  if (loading) {
    return <Loader fullScreen text="Loading Branch Master details..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 px-2 py-4 xl:px-8">
      <div className="mx-auto w-full max-w-7xl rounded-[24px] bg-white p-4 xl:p-6 shadow-premium border border-slate-100">
        <div className="mb-4">
          <Button 
            variant="secondary" 
            onClick={() => navigate("/dashboard/branches")}
            className="flex items-center gap-2 shadow-sm border-slate-200 !py-1.5 w-fit"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back
          </Button>
        </div>

        <BranchForm 
          initialData={initialData}
          onSubmit={handleSubmit}
          onDelete={id ? handleDelete : undefined}
        />
      </div>
    </div>
  );
};

export default BranchFormPage;
