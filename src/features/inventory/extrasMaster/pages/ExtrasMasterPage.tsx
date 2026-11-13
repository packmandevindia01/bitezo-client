import { RotateCcw, Save, Trash2 } from "lucide-react";
import { useContext, useEffect, useState } from "react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";

import {
  Button,
  Modal,
} from "../../../../components/common";
import MasterListPage from "../../../../components/common/MasterListPage";
import ExtrasMasterForm from "../components/ExtrasMasterForm";
import type { ExtrasMasterRecord } from "../schemas";
import { extrasMasterFormSchema, type ExtrasMasterForm as ExtrasMasterFormType } from "../schemas";
import { 
  useExtrasMaster, 
  useExtrasMasterDetail,
  useCreateExtrasMaster,
  useUpdateExtrasMaster,
  useDeleteExtrasMaster
} from "../hooks/useExtrasMasterQueries";

import { useAppSelector, useAppDispatch } from "../../../../app/hooks";
import { fetchGlobalMasterData } from "../../shared/store/masterDataSlice";
import { PosAllocationScopeContext, posBranchIds } from "../../shared/posAllocationScope";
import { usePermissions } from "../../../../hooks/usePermissions";
import { categoryApi } from "../../category";
import { useToast } from "../../../../app/providers/useToast";


const ExtrasMasterPage = () => {

  const { hasPermission } = usePermissions();
  const posScope = useContext(PosAllocationScopeContext);
  const posBranchId = posScope?.branchId;
  const { showToast } = useToast();
  
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "categories" | "branches">("general");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<ExtrasMasterRecord | null>(null);

  const canDelete = hasPermission("Extras Master", "Delete");

  const dispatch = useAppDispatch();
  const { branches } = useAppSelector((state) => state.masterData);

  useEffect(() => {
    if (branches.length === 0 && !posScope) {
      dispatch(fetchGlobalMasterData());
    }
  }, [dispatch, branches.length, posScope]);

  const { data: backOfficeCategories = [] } = useQuery({
    queryKey: ["categories-list"],
    queryFn: () => categoryApi.getCategories(),
    enabled: !posScope,
  });
  const categories = posScope?.categories ?? backOfficeCategories;

  const { data: records = [], isLoading } = useExtrasMaster(search || undefined);
  const { data: detailRecord, isLoading: isDetailLoading } = useExtrasMasterDetail(editingId || undefined);


  const createMutation = useCreateExtrasMaster();
  const updateMutation = useUpdateExtrasMaster();
  const deleteMutation = useDeleteExtrasMaster();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const form = useForm<ExtrasMasterFormType>({
    mode: "onChange",
    resolver: zodResolver(extrasMasterFormSchema) as any,
    defaultValues: {
      name: "",
      arabic: "",
      typeId: 0,
      price: 0,
      color: "#cccccc",
      branchIds: [],
      categoryIds: [],
    },
  });

  useEffect(() => {
    if (editingId && detailRecord) {
      const mod = detailRecord.modifier?.[0];
      const activeBranchId = posBranchId || Number(localStorage.getItem("activeBranchId") || localStorage.getItem("branchId")) || (branches[0]?.id ? Number(branches[0].id) : 1);
      let branchIds = (detailRecord.branchIds || []).map((b) => b.id);
      if (branchIds.length === 0) {
        branchIds = [activeBranchId];
      }
      if (posBranchId) {
        branchIds = posBranchIds(posBranchId, branchIds);
      }
      const categoryIds = (detailRecord.categoryIds || []).map((c) => c.id);
      
      if (mod) {
        form.reset({
          name: mod.name || "",
          arabic: mod.arabic || "",
          typeId: mod.typeId || 0,
          price: mod.price || 0,
          color: mod.color || "#cccccc",
          branchIds: branchIds,
          categoryIds: categoryIds,
        });
      }
    }
  }, [editingId, detailRecord, form, branches, posBranchId]);

  const closeModal = () => {
    const activeBranchId = posBranchId || Number(localStorage.getItem("activeBranchId") || localStorage.getItem("branchId")) || (branches[0]?.id ? Number(branches[0].id) : 1);
    const defaultBranchIds = [activeBranchId];
    setOpen(false);
    setEditingId(null);
    setActiveTab("general");
    form.clearErrors();
    form.reset({
      name: "",
      arabic: "",
      typeId: 0,
      price: 0,
      color: "#cccccc",
      branchIds: defaultBranchIds,
      categoryIds: [],
    });
  };

  const openCreateModal = () => {
    const activeBranchId = posBranchId || Number(localStorage.getItem("activeBranchId") || localStorage.getItem("branchId")) || (branches[0]?.id ? Number(branches[0].id) : 1);
    const defaultBranchIds = [activeBranchId];
    setEditingId(null);
    setActiveTab("general");
    form.clearErrors();
    form.reset({
      name: "",
      arabic: "",
      typeId: 0,
      price: 0,
      color: "#cccccc",
      branchIds: defaultBranchIds,
      categoryIds: [],
    });
    setOpen(true);
    setTimeout(() => {
      const el = document.getElementById("ext-name");
      el?.focus();
      if (el instanceof HTMLInputElement) el.select?.();
    }, 50);
  };

  const handleEdit = (record: ExtrasMasterRecord) => {
    setEditingId(record.id);
    setActiveTab("general");
    form.clearErrors();
    setOpen(true);
    setTimeout(() => {
      const el = document.getElementById("ext-name");
      el?.focus();
      if (el instanceof HTMLInputElement) el.select?.();
    }, 50);
  };

  const handleDelete = () => {
    if (deleteRecord) {
      deleteMutation.mutate(deleteRecord.id, {
        onSuccess: () => setDeleteRecord(null),
      });
    }
  };

  const onSubmit = (data: ExtrasMasterFormType) => {
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
    if (errors.name || errors.typeId || errors.price || errors.arabic || errors.color) {
      setActiveTab("general");
      const firstMsg = errors.name?.message || errors.typeId?.message || errors.price?.message;
      if (firstMsg) {
        showToast(String(firstMsg), "error");
      }
      setTimeout(() => {
        if (errors.name) {
          const el = document.getElementById("ext-name");
          el?.focus();
          if (el instanceof HTMLInputElement) el.select?.();
        } else if (errors.typeId) {
          document.getElementById("ext-type")?.focus();
        } else if (errors.price) {
          const el = document.getElementById("ext-price");
          el?.focus();
          if (el instanceof HTMLInputElement) el.select?.();
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
    <MasterListPage<ExtrasMasterRecord>
      moduleName="Extras Master"
      title="Extras Master"
      tableTitle="Saved Extras List"
      searchPlaceholder="Search extras..."
      addLabel="Add Extras"
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
        message: (row) => `Are you sure you want to delete "${row.name}"?`,
      }}
      renderForm={() => (
          <Modal 
            isOpen={open} 
            onClose={closeModal} 
            title={editingId ? "Edit Extras" : "Add Extras"}
            size="lg"
            footer={
              <div className="flex w-full flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    const activeBranchId = posBranchId || Number(localStorage.getItem("activeBranchId") || localStorage.getItem("branchId")) || (branches[0]?.id ? Number(branches[0].id) : 1);
                    form.reset({
                      name: "", arabic: "", typeId: 0, price: 0, color: "#cccccc", branchIds: [activeBranchId], categoryIds: []
                    });
                    form.clearErrors();
                    setActiveTab("general");
                    setTimeout(() => {
                      document.getElementById("ext-name")?.focus();
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
                  id="btn-save-extras"
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
            <ExtrasMasterForm
              form={form}
              saving={isSaving}
              loading={isDetailLoading}
              branches={branches}
              categories={categories}
              hideBranchTab={Boolean(posScope)}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onSave={handleSave}
              saveButtonId="btn-save-extras"
            />
          </Modal>
      )}
    />
  );
};

export default ExtrasMasterPage;
