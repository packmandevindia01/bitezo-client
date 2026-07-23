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
import ModifierTypeForm from "../components/ModifierTypeForm";
import { 
  useModifierTypes, 
  useModifierTypeDetail, 
  useCreateModifierType, 
  useUpdateModifierType, 
  useDeleteModifierType 
} from "../hooks/useModifierTypeQueries";
import { modifierTypeFormSchema, type ModifierTypeForm as ModifierTypeFormType, type ModifierTypeRecord } from "../schemas";
import { usePermissions } from "../../../../hooks/usePermissions";

const ModifierTypePage = () => {
  const { hasPermission } = usePermissions();

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<ModifierTypeRecord | null>(null);

  const canAdd = hasPermission("Modifier Type", "Add");
  const canEdit = hasPermission("Modifier Type", "Edit");
  const canDelete = hasPermission("Modifier Type", "Delete");

  const { data: records = [], isLoading } = useModifierTypes(search || undefined);
  const { data: detailRecord, isLoading: isDetailLoading } = useModifierTypeDetail(editingId || undefined);

  const createMutation = useCreateModifierType();
  const updateMutation = useUpdateModifierType();
  const deleteMutation = useDeleteModifierType();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const form = useForm<ModifierTypeFormType>({
    resolver: zodResolver(modifierTypeFormSchema) as any,
    defaultValues: {
      name: "",
      arabicName: "",
      price: 0,
    },
  });

  useEffect(() => {
    if (editingId && detailRecord) {
      form.reset({
        name: detailRecord.name || "",
        arabicName: detailRecord.arabicName || "",
        price: detailRecord.price || 0,
      });
    }
  }, [editingId, detailRecord, form]);

  const closeModal = () => {
    setOpen(false);
    setEditingId(null);
    form.reset({ name: "", arabicName: "", price: 0 });
  };

  const openCreateModal = () => {
    setEditingId(null);
    form.reset({ name: "", arabicName: "", price: 0 });
    setOpen(true);
  };

  const handleEdit = (record: ModifierTypeRecord) => {
    setEditingId(record.typeId);
    setOpen(true);
  };

  const handleDelete = () => {
    if (deleteRecord) {
      deleteMutation.mutate(deleteRecord.typeId, {
        onSuccess: () => setDeleteRecord(null),
      });
    }
  };

  const onSubmit = (data: ModifierTypeFormType) => {
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
    <PageShell title="Modifier Type">
      <ListHeader
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search modifier type..."
        autoFocusSearch
        canAdd={canAdd}
        onAdd={openCreateModal}
      />
      <RecordTableCard
        title="Saved Modifier Type List"
        rowKey="typeId"
        data={records}
        loading={isLoading}
        columns={[
          { header: "#", accessor: "sNo" },
          { header: "Name", accessor: "name" },
          { header: "Arabic", accessor: "arabicName" },
          {
            header: "Actions",
            accessor: "typeId",
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
        title={editingId ? "Edit Modifier Type" : "Add Modifier Type"}
        size="lg"
        footer={
          <div className="flex w-full flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
            <Button 
              variant="secondary" 
              onClick={() => form.reset({ name: "", arabicName: "", price: 0 })} 
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
                  const record = records.find(r => r.typeId === editingId);
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
        <ModifierTypeForm form={form} />
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

export default ModifierTypePage;
