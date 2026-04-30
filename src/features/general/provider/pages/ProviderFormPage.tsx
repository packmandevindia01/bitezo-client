import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageShell, Loader, ConfirmDialog } from "../../../../components/common";
import ProviderForm from "../components/ProviderForm";
import { useToast } from "../../../../app/providers/useToast";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import { fetchGlobalMasterData } from "../../../inventory/shared/store/masterDataSlice";
import { paymodeService } from "../../paymode/services/paymodeService";
import {
  fetchProviderById,
  createProvider,
  updateProvider,
  deleteProvider,
} from "../services/providerService";
import type { ProviderPayload } from "../types";

const ProviderFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const dispatch = useAppDispatch();
  
  const { branches, loading: masterLoading } = useAppSelector((state) => state.masterData);
  const [paymodes, setPaymodes] = useState<{ id: number; name: string }[]>([]);
  const [provider, setProvider] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const isEdit = !!id;

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch master data if not loaded
      if (branches.length === 0) {
        void dispatch(fetchGlobalMasterData());
      }
      
      // Fetch paymodes
      const pmList = await paymodeService.list();
      setPaymodes(pmList.map(pm => ({ id: pm.paymodeId, name: pm.paymodeName })));

      // Fetch provider if editing
      if (isEdit) {
        const detail = await fetchProviderById(Number(id));
        
        // Map branchIds correctly from the array of branch objects
        const branchIds = Array.isArray(detail.branch) 
          ? detail.branch.map((b: any) => b.branchId) 
          : [];

        setProvider({
          ...detail.provider,
          // Ensure name is correctly mapped
          providerName: detail.provider.providerName,
          // Map string status "Enable" to boolean true
          deliveryStatus: detail.provider.deliveryStatus === "Enable",
          branchIds: branchIds
        });
      }

    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to load data", "error");
      navigate("/dashboard/providers");
    } finally {
      setLoading(false);
    }
  }, [id, isEdit, branches.length, dispatch, navigate, showToast]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  const handleSubmit = async (payload: ProviderPayload) => {
    try {
      setSubmitting(true);
      if (isEdit) {
        await updateProvider(Number(id), payload);
        showToast("Provider updated successfully", "success");
      } else {
        await createProvider(payload);
        showToast("Provider created successfully", "success");
      }
      navigate("/dashboard/providers");
    } catch (error: any) {
      showToast(error.message || "Failed to save provider", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteProvider(Number(id));
      showToast("Provider deleted successfully", "success");
      navigate("/dashboard/providers");
    } catch (error: any) {
      showToast(error.message || "Failed to delete provider", "error");
    } finally {
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <PageShell title={isEdit ? "Edit Provider" : "New Provider"}>
      {loading || masterLoading ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-12 shadow-sm">
          <Loader text="Loading form..." />
        </div>
      ) : (
        <div className="rounded-[2.5rem] border border-gray-200 bg-white p-6 md:p-10 shadow-sm">
          <ProviderForm
            initialData={provider}
            onSubmit={handleSubmit}
            onCancel={() => navigate("/dashboard/providers")}
            onDelete={isEdit ? () => setDeleteConfirmOpen(true) : undefined}
            submitting={submitting}
            deleting={deleting}
            branchOptions={branches}
            paymodeOptions={paymodes}
          />
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Delete Provider"
        message={`Are you sure you want to delete "${provider?.providerName || 'this provider'}"?`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
        loading={deleting}
      />
    </PageShell>
  );
};

export default ProviderFormPage;
