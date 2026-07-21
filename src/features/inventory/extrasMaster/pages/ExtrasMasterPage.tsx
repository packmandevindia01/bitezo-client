import { Pencil, RotateCcw, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";

import {
  Button,
  ConfirmDialog,
  Modal,
  PageShell,
  RecordTableCard, ListHeader,
} from "../../../../components/common";
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
import { usePermissions } from "../../../../hooks/usePermissions";
import { categoryApi } from "../../category";


const ExtrasMasterPage = () => {

  const { hasPermission } = usePermissions();
  
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<ExtrasMasterRecord | null>(null);

  const canAdd = hasPermission("Extras Master", "Add");
  const canEdit = hasPermission("Extras Master", "Edit");
  const canDelete = hasPermission("Extras Master", "Delete");

  const dispatch = useAppDispatch();
  const { branches } = useAppSelector((state) => state.masterData);

  useEffect(() => {
    if (branches.length === 0) {
      dispatch(fetchGlobalMasterData());
    }
  }, [dispatch, branches.length]);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-list"],
    queryFn: () => categoryApi.getCategories(),
  });

  const { data: records = [], isLoading } = useExtrasMaster(search || undefined);
  const { data: detailRecord, isLoading: isDetailLoading } = useExtrasMasterDetail(editingId || undefined);


  const createMutation = useCreateExtrasMaster();
  const updateMutation = useUpdateExtrasMaster();
  const deleteMutation = useDeleteExtrasMaster();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const form = useForm<ExtrasMasterFormType>({
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
      const branchIds = (detailRecord.branchIds || []).map((b) => b.id);
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
  }, [editingId, detailRecord, form]);

  const closeModal = () => {
    setOpen(false);
    setEditingId(null);
    form.reset({
      name: "",
      arabic: "",
      typeId: 0,
      price: 0,
      color: "#cccccc",
      branchIds: [],
      categoryIds: [],
    });
  };

  const openCreateModal = () => {
    setEditingId(null);
    form.reset({
      name: "",
      arabic: "",
      typeId: 0,
      price: 0,
      color: "#cccccc",
      branchIds: [],
      categoryIds: [],
    });
    setOpen(true);
  };

  const handleEdit = (record: ExtrasMasterRecord) => {
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

  return (
    <PageShell title="Extras Master">
      <ListHeader
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search extras..."
        autoFocusSearch
        canAdd={canAdd}
        onAdd={openCreateModal}
      />
      <RecordTableCard
        title="Saved Extras List"
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
        title={editingId ? "Edit Extras" : "Add Extras"}
        size="lg"
        footer={
          <div className="flex w-full flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
            <Button 
              variant="secondary" 
              onClick={() => form.reset({
                name: "", arabic: "", typeId: 0, price: 0, color: "#cccccc", branchIds: [], categoryIds: []
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
        <ExtrasMasterForm
          form={form}
          saving={isSaving}
          loading={isDetailLoading}
          branches={branches}
          categories={categories}
        />
      </Modal>

      <ConfirmDialog
        isOpen={deleteRecord !== null}
        onCancel={() => setDeleteRecord(null)}
        onConfirm={handleDelete}
        message={`Are you sure you want to delete "${deleteRecord?.name}"?`}
      />
    </PageShell>
  );
};

export default ExtrasMasterPage;
