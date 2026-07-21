import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, RotateCcw, Save, Trash2 } from "lucide-react";

import {
  Button,
  ConfirmDialog,
  Modal,
  PageShell,
  RecordTableCard,
  ListHeader,
} from "../../../../components/common";
import ExtrasTypeFormComponent from "../components/ExtrasTypeForm";
import { usePermissions } from "../../../../hooks/usePermissions";

import { extrasTypeFormSchema, type ExtrasTypeForm as ExtrasTypeFormType, type ExtrasTypeRecord } from "../schemas";
import { 
  useExtrasTypes, 
  useExtrasTypeDetail,
  useCreateExtrasType,
  useUpdateExtrasType,
  useDeleteExtrasType
} from "../hooks/useExtrasTypeQueries";

const ExtrasTypePage = () => {
  const { hasPermission } = usePermissions();
  
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<ExtrasTypeRecord | null>(null);

  const canAdd = hasPermission("Extras Type", "Add");
  const canEdit = hasPermission("Extras Type", "Edit");
  const canDelete = hasPermission("Extras Type", "Delete");

  const { data: records = [], isLoading } = useExtrasTypes(search || undefined);
  const { data: detailRecord, isLoading: isDetailLoading } = useExtrasTypeDetail(editingId || undefined);

  const createMutation = useCreateExtrasType();
  const updateMutation = useUpdateExtrasType();
  const deleteMutation = useDeleteExtrasType();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const form = useForm<ExtrasTypeFormType>({
    resolver: zodResolver(extrasTypeFormSchema),
    defaultValues: {
      name: "",
      arabicName: "",
    },
  });

  // Populate form when editing and detail is loaded
  useEffect(() => {
    if (editingId && detailRecord) {
      form.reset({
        name: detailRecord.name || "",
        arabicName: detailRecord.arabicName || "",
      });
    }
  }, [editingId, detailRecord, form]);

  const closeModal = () => {
    setOpen(false);
    setEditingId(null);
    form.reset({ name: "", arabicName: "" });
  };

  const openCreateModal = () => {
    setEditingId(null);
    form.reset({ name: "", arabicName: "" });
    setOpen(true);
  };

  const handleEdit = (record: ExtrasTypeRecord) => {
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

  const onSubmit = (data: ExtrasTypeFormType) => {
    if (editingId) {
      updateMutation.mutate(
        { typeId: editingId, data },
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
    <PageShell title="Extras Type">
      <ListHeader
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search extras type..."
        autoFocusSearch
        canAdd={canAdd}
        onAdd={openCreateModal}
      />
      <RecordTableCard
        title="Saved Extras Type List"
        rowKey="typeId"
        data={records}
        loading={isLoading}
        columns={[
          { header: "#", accessor: "typeId" },
          { header: "Name", accessor: "name" },
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
        title={editingId ? "Edit Extras Type" : "Add Extras Type"}
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => form.reset({ name: "", arabicName: "" })}
              disabled={isSaving || isDetailLoading}
              tabIndex={-1}
              isAction
              icon={<RotateCcw size={18} />}
            >
              Clear
            </Button>
            <Button
              onClick={form.handleSubmit(onSubmit)}
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
        <ExtrasTypeFormComponent form={form} />
      </Modal>

      <ConfirmDialog
        isOpen={deleteRecord !== null}
        onCancel={() => setDeleteRecord(null)}
        onConfirm={handleDelete}
        message={`Are you sure you want to delete extras type "${deleteRecord?.name}"?`}
      />
    </PageShell>
  );
};

export default ExtrasTypePage;
