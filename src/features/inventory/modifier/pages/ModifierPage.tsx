import { useContext, useState, useEffect } from "react";
import { RotateCcw, Save, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Modal,
} from "../../../../components/common";
import MasterListPage from "../../../../components/common/MasterListPage";
import ModifierMasterForm from "../components/ModifierMasterForm";
import { usePermissions } from "../../../../hooks/usePermissions";
import { useAppSelector, useAppDispatch } from "../../../../app/hooks";
import type { RootState } from "../../../../app/store";
import { fetchGlobalMasterData } from "../../shared/store/masterDataSlice";
import { PosAllocationScopeContext, posBranchIds } from "../../shared/posAllocationScope";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { categoryApi } from "../../category";
import { fetchBranchNames } from "../../branches/services/branchApi";
import { subscribeToBranchUpdates } from "../../branches/utils/branchSync";
import { subscribeToCategoryUpdates } from "../../category/utils/categorySync";
import { useToast } from "../../../../app/providers/useToast";

import { 
  useModifiers, 
  useModifierDetail, 
  useCreateModifier, 
  useUpdateModifier, 
  useDeleteModifier 
} from "../hooks/useModifierQueries";
import { modifierFormSchema, type ModifierForm as ModifierFormType, type ModifierRecord } from "../schemas";

const ModifierPage = () => {
  const { hasPermission } = usePermissions();
  const posScope = useContext(PosAllocationScopeContext);
  const posBranchId = posScope?.branchId;
  const defaultBranchIds = posBranchId ? [posBranchId] : [];
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "categories" | "branches">("general");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<ModifierRecord | null>(null);

  const canDelete = hasPermission("Modifier Master", "Delete");

  const dispatch = useAppDispatch();
  const { branches: reduxBranches } = useAppSelector((state: RootState) => state.masterData);

  // Fetch branches with React Query for instant reactivity
  const { data: branchList = [], refetch: refetchBranches } = useQuery({
    queryKey: ["branchNames"],
    queryFn: async () => {
      try {
        const data = await fetchBranchNames(true);
        return data.map((b) => ({ id: b.id, name: b.branchName }));
      } catch {
        return [];
      }
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    enabled: !posScope,
  });

  const branches = branchList.length > 0 ? branchList : reduxBranches;

  const { data: backOfficeCategories = [], refetch: refetchCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryApi.getCategories(),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    enabled: !posScope,
  });
  const categories = posScope?.categories ?? backOfficeCategories;

  const refreshBackOfficeLists = () => {
    if (posScope) return;
    void refetchBranches();
    void refetchCategories();
  };

  // Real-time synchronization for branch updates
  useEffect(() => {
    const unsubscribe = subscribeToBranchUpdates(() => {
      queryClient.invalidateQueries({ queryKey: ["branchNames"] });
      queryClient.invalidateQueries({ queryKey: ["allBranchesList"] });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      void refetchBranches();
      dispatch(fetchGlobalMasterData());
    });
    return () => unsubscribe();
  }, [queryClient, dispatch, refetchBranches]);

  // Real-time synchronization for category updates
  useEffect(() => {
    const unsubscribe = subscribeToCategoryUpdates(() => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      void refetchCategories();
    });
    return () => unsubscribe();
  }, [queryClient, refetchCategories]);

  // Refetch branches whenever modal opens
  useEffect(() => {
    if (open && !posScope) {
      void refetchBranches();
      dispatch(fetchGlobalMasterData());
    }
  }, [open, refetchBranches, dispatch, posScope]);

  const { data: records = [], isLoading } = useModifiers(search || undefined);
  const { data: detailRecord, isLoading: isDetailLoading } = useModifierDetail(editingId || undefined);

  const createMutation = useCreateModifier();
  const updateMutation = useUpdateModifier();
  const deleteMutation = useDeleteModifier();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const form = useForm<ModifierFormType>({
    resolver: zodResolver(modifierFormSchema) as any,
    defaultValues: {
      name: "",
      arabic: "",
      typeId: 0,
      color: "#cccccc",
      branchIds: [],
      categoryIds: [],
    },
  });

  useEffect(() => {
    if (editingId && detailRecord) {
      const mod = detailRecord.modifier?.[0];
      const savedBranchIds = (detailRecord.branchIds || []).map((b) => b.id);
      const branchIds = posBranchId ? posBranchIds(posBranchId, savedBranchIds) : savedBranchIds;
      const categoryIds = (detailRecord.categoryIds || []).map((c) => c.id);
      
      if (mod) {
        form.reset({
          name: mod.name || "",
          arabic: mod.arabic || "",
          typeId: mod.typeId || 0,
          color: mod.color || "#cccccc",
          branchIds: branchIds,
          categoryIds: categoryIds,
        });
      }
    }
  }, [editingId, detailRecord, form, posBranchId]);

  const closeModal = () => {
    setOpen(false);
    setEditingId(null);
    setActiveTab("general");
    form.clearErrors();
    form.reset({
      name: "", arabic: "", typeId: 0, color: "#cccccc", branchIds: defaultBranchIds, categoryIds: []
    });
  };

  const openCreateModal = () => {
    refreshBackOfficeLists();
    setEditingId(null);
    setActiveTab("general");
    form.clearErrors();
    form.reset({
      name: "", arabic: "", typeId: 0, color: "#cccccc", branchIds: defaultBranchIds, categoryIds: []
    });
    setOpen(true);
  };

  const handleEdit = (record: ModifierRecord) => {
    refreshBackOfficeLists();
    setEditingId(record.id);
    setActiveTab("general");
    form.clearErrors();
    setOpen(true);
  };

  const handleDelete = () => {
    if (deleteRecord) {
      deleteMutation.mutate(deleteRecord.id, {
        onSuccess: () => setDeleteRecord(null),
        onError: () => setDeleteRecord(null),
      });
    }
  };

  const onSubmit = (data: ModifierFormType) => {
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data },
        { onSuccess: closeModal }
      );
    } else {
      createMutation.mutate(
        data,
        { onSuccess: closeModal }
      );
    }
  };

  const onInvalid = (errors: any) => {
    if (errors.name || errors.arabic || errors.color || errors.typeId) {
      setActiveTab("general");
      const firstMsg = errors.name?.message;
      if (firstMsg) {
        showToast(String(firstMsg), "error");
      }
      setTimeout(() => {
        if (errors.name) {
          document.getElementById("mod-name")?.focus();
        }
      }, 50);
    } else if (errors.branchIds) {
      setActiveTab("branches");
      if (errors.branchIds?.message) {
        showToast(String(errors.branchIds.message), "error");
      }
    } else {
      const firstError = Object.values(errors)[0] as any;
      if (firstError?.message) {
        showToast(String(firstError.message), "error");
      }
    }
  };

  const handleSave = form.handleSubmit(onSubmit as any, onInvalid);

  return (
    <MasterListPage<ModifierRecord>
      moduleName="Modifier Master"
      title="Modifier Master"
      tableTitle="Saved Modifier List"
      searchPlaceholder="Search modifiers..."
      addLabel="Add Modifier"
      rowKey="id"
      getName={(row) => row.name}
      columns={[
        { header: "S.No", accessor: "sNo" },
        { header: "Name", accessor: "name" },
      ]}
      records={records}
      loading={isLoading}
      search={search}
      onSearchChange={setSearch}
      onAdd={openCreateModal}
      onEdit={handleEdit}
      editingId={editingId}
      closeForm={closeModal}
      deleteFlow={{
        candidate: deleteRecord,
        request: setDeleteRecord,
        confirm: handleDelete,
        cancel: () => setDeleteRecord(null),
      }}
      deleteDialog={{
        message: () => "Are you sure you want to delete this modifier? This action cannot be undone.",
      }}
      renderForm={() => (
          <Modal 
            isOpen={open} 
            onClose={closeModal} 
            title={editingId ? "Edit Modifier" : "Add Modifier"} 
            size="lg"
            footer={
              <div className="flex w-full flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    form.reset({
                      name: "", arabic: "", typeId: 0, color: "#cccccc", branchIds: defaultBranchIds, categoryIds: []
                    });
                    form.clearErrors();
                    setActiveTab("general");
                    setTimeout(() => {
                      document.getElementById("mod-name")?.focus();
                    }, 10);
                  }} 
                  disabled={isSaving || isDetailLoading} 
                  tabIndex={-1}
                  isAction
                  icon={<RotateCcw size={18} />}
                >
                  Clear
                </Button>
                <Button 
                  id="btn-save-modifier"
                  onClick={handleSave} 
                  loading={isSaving}
                  disabled={isDetailLoading}
                  isAction
                  icon={<Save size={18} />}
                >
                  Save
                </Button>
                {editingId && canDelete && (
                  <Button
                    variant="danger"
                    onClick={() => {
                      const record = records.find(r => r.id === editingId);
                      if (record) {
                        setDeleteRecord(record);
                        closeModal();
                      }
                    }}
                    disabled={isSaving || isDetailLoading}
                    isAction
                    icon={<Trash2 size={18} />}
                  >
                    Delete
                  </Button>
                )}
              </div>
            }
          >
            <ModifierMasterForm
              form={form}
              loading={isDetailLoading}
              saving={isSaving}
              branches={branches}
              categories={categories}
              hideBranchTab={Boolean(posScope)}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onSave={handleSave}
              saveButtonId="btn-save-modifier"
            />
          </Modal>
      )}
    />
  );
};

export default ModifierPage;
