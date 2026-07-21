import { useState, useEffect } from "react";
import { Pencil, RotateCcw, Save, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  ConfirmDialog,
  Modal,
  PageShell,
  RecordTableCard, 
  ListHeader,
} from "../../../../components/common";
import ModifierMasterForm from "../components/ModifierMasterForm";
import { usePermissions } from "../../../../hooks/usePermissions";
import { useAppSelector, useAppDispatch } from "../../../../app/hooks";
import type { RootState } from "../../../../app/store";
import { fetchGlobalMasterData } from "../../shared/store/masterDataSlice";
import { useQuery } from "@tanstack/react-query";
import { categoryApi } from "../../category";

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
  
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<ModifierRecord | null>(null);

  const canAdd = hasPermission("Modifier Master", "Add");
  const canEdit = hasPermission("Modifier Master", "Edit");
  const canDelete = hasPermission("Modifier Master", "Delete");

  const dispatch = useAppDispatch();
  const { branches } = useAppSelector((state: RootState) => state.masterData);

  useEffect(() => {
    if (branches.length === 0) {
      dispatch(fetchGlobalMasterData());
    }
  }, [dispatch, branches.length]);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryApi.getCategories(),
  });

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
      const branchIds = (detailRecord.branchIds || []).map((b) => b.id);
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
  }, [editingId, detailRecord, form]);

  const closeModal = () => {
    setOpen(false);
    setEditingId(null);
    form.reset({
      name: "", arabic: "", typeId: 0, color: "#cccccc", branchIds: [], categoryIds: []
    });
  };

  const openCreateModal = () => {
    setEditingId(null);
    form.reset({
      name: "", arabic: "", typeId: 0, color: "#cccccc", branchIds: [], categoryIds: []
    });
    setOpen(true);
  };

  const handleEdit = (record: ModifierRecord) => {
    setEditingId(record.id);
    setOpen(true);
  };

  const handleDelete = () => {
    if (deleteRecord) {
      deleteMutation.mutate(deleteRecord.id, {
        onSuccess: () => setDeleteRecord(null),
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

  return (
    <PageShell title="Modifier Master">
      <ListHeader
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search modifiers..."
        autoFocusSearch
        canAdd={canAdd}
        onAdd={openCreateModal}
      />
      <RecordTableCard
        title="Saved Modifier List"
        rowKey="id"
        data={records}
        loading={isLoading}
        columns={[
          { header: "#", accessor: "sNo" },
          { header: "Name", accessor: "name" },
          {
            header: "Actions",
            accessor: "id",
            render: (row) => (
              <div className="flex gap-2">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleEdit(row)}
                    className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10"
                    aria-label={`Edit ${row.name}`}
                  >
                    <Pencil size={16} />
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setDeleteRecord(row)}
                    className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50"
                    aria-label={`Delete ${row.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />

      <Modal 
        isOpen={open} 
        onClose={closeModal} 
        title={editingId ? "Edit Modifier" : "Add Modifier"} 
        size="lg"
        footer={
          <div className="flex w-full flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
            <Button 
              variant="secondary" 
              onClick={() => form.reset({
                name: "", arabic: "", typeId: 0, color: "#cccccc", branchIds: [], categoryIds: []
              })} 
              disabled={isSaving || isDetailLoading} 
              tabIndex={-1}
              isAction
              icon={<RotateCcw size={18} />}
            >
              Clear
            </Button>
            <Button 
              onClick={form.handleSubmit(onSubmit as any)} 
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
        />
      </Modal>

      <ConfirmDialog
        isOpen={deleteRecord !== null}
        onCancel={() => setDeleteRecord(null)}
        onConfirm={handleDelete}
        message="Are you sure you want to delete this modifier? This action cannot be undone."
      />
    </PageShell>
  );
};

export default ModifierPage;
