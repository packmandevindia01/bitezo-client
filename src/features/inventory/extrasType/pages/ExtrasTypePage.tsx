import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { RotateCcw, Save, Trash2 } from "lucide-react";

import { Button, Modal } from "../../../../components/common";
import MasterListPage, { type MasterColumn } from "../../../../components/common/MasterListPage";
import ExtrasTypeFormComponent from "../components/ExtrasTypeForm";
import { useToast } from "../../../../app/providers/useToast";

import { extrasTypeFormSchema, type ExtrasTypeForm as ExtrasTypeFormType, type ExtrasTypeRecord } from "../schemas";
import { 
  useExtrasTypes, 
  useExtrasTypeDetail,
  useCreateExtrasType,
  useUpdateExtrasType,
  useDeleteExtrasType
} from "../hooks/useExtrasTypeQueries";

const COLUMNS: MasterColumn<ExtrasTypeRecord>[] = [
  { header: "S.No", accessor: "sNo", render: (row, index) => row.sNo ?? index + 1 },
  { header: "Name", accessor: "name" },
];

const ExtrasTypePage = () => {
  const { showToast } = useToast();
  
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<ExtrasTypeRecord | null>(null);

  const { data: records = [], isLoading } = useExtrasTypes(search || undefined);
  const { data: detailRecord, isLoading: isDetailLoading } = useExtrasTypeDetail(editingId || undefined);

  const createMutation = useCreateExtrasType();
  const updateMutation = useUpdateExtrasType();
  const deleteMutation = useDeleteExtrasType();

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const form = useForm<ExtrasTypeFormType>({
    mode: "onChange",
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
    form.clearErrors();
    form.reset({ name: "", arabicName: "" });
  };

  const openCreateModal = () => {
    setEditingId(null);
    form.clearErrors();
    form.reset({ name: "", arabicName: "" });
    setOpen(true);
    setTimeout(() => {
      const el = document.getElementById("exttype-name");
      el?.focus();
      if (el instanceof HTMLInputElement) el.select?.();
    }, 50);
  };

  const handleEdit = (record: ExtrasTypeRecord) => {
    setEditingId(record.typeId);
    form.clearErrors();
    setOpen(true);
    setTimeout(() => {
      const el = document.getElementById("exttype-name");
      el?.focus();
      if (el instanceof HTMLInputElement) el.select?.();
    }, 50);
  };

  const handleDelete = () => {
    if (deleteRecord) {
      deleteMutation.mutate(deleteRecord.typeId, {
        onSuccess: () => setDeleteRecord(null),
        onError: () => setDeleteRecord(null),
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

  const onInvalid = (errors: any) => {
    if (errors.name) {
      if (errors.name?.message) {
        showToast(String(errors.name.message), "error");
      }
      setTimeout(() => {
        const el = document.getElementById("exttype-name");
        el?.focus();
        if (el instanceof HTMLInputElement) el.select?.();
      }, 50);
    } else if (errors.arabicName) {
      if (errors.arabicName?.message) {
        showToast(String(errors.arabicName.message), "error");
      }
      setTimeout(() => {
        const el = document.getElementById("exttype-arabicName");
        el?.focus();
        if (el instanceof HTMLInputElement) el.select?.();
      }, 50);
    } else {
      const firstError = Object.values(errors)[0] as any;
      if (firstError?.message) {
        showToast(String(firstError.message), "error");
      }
    }
  };

  const handleSave = form.handleSubmit(onSubmit, onInvalid);

  return (
    <MasterListPage<ExtrasTypeRecord>
      moduleName="Extras Type"
      title="Extras Type"
      tableTitle="Saved Extras Type List"
      searchPlaceholder="Search extras type..."
      rowKey="typeId"
      getName={(row) => row.name}
      columns={COLUMNS}
      records={records}
      loading={isLoading}
      search={search}
      onSearchChange={setSearch}
      onAdd={openCreateModal}
      onEdit={handleEdit}
      editingId={editingId}
      closeForm={closeModal}
      deleteFlow={{ candidate: deleteRecord, request: setDeleteRecord, confirm: handleDelete, cancel: () => setDeleteRecord(null) }}
      deleteDialog={{ message: (row) => `Are you sure you want to delete extras type "${row.name}"?` }}
      renderForm={(_, canDelete) => (
          <Modal
            isOpen={open}
            onClose={closeModal}
            title={editingId ? "Edit Extras Type" : "Add Extras Type"}
            size="lg"
            footer={
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    form.reset({ name: "", arabicName: "" });
                    form.clearErrors();
                    setTimeout(() => {
                      const el = document.getElementById("exttype-name");
                      el?.focus();
                      if (el instanceof HTMLInputElement) el.select?.();
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
                  id="exttype-save"
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
                      const record = records.find(r => r.typeId === editingId);
                      if (record) {
                        setDeleteRecord(record);
                        closeModal();
                      }
                    }}
                    disabled={isSaving || isDetailLoading}
                    isAction
                    tabIndex={-1}
                    icon={<Trash2 size={18} />}
                  >
                    Delete
                  </Button>
                )}
              </div>
            }
          >
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                handleSave();
              }}
            >
              <ExtrasTypeFormComponent form={form} onSave={handleSave} saveButtonId="exttype-save" />
            </form>
          </Modal>
      )}
    />
  );
};

export default ExtrasTypePage;
