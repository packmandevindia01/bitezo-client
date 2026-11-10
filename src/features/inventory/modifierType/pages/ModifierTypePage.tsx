import { useState, useEffect } from "react";
import { RotateCcw, Save, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Modal } from "../../../../components/common";
import MasterListPage, { type MasterColumn } from "../../../../components/common/MasterListPage";
import ModifierTypeForm from "../components/ModifierTypeForm";
import { 
  useModifierTypes, 
  useModifierTypeDetail, 
  useCreateModifierType, 
  useUpdateModifierType, 
  useDeleteModifierType 
} from "../hooks/useModifierTypeQueries";
import { modifierTypeFormSchema, type ModifierTypeForm as ModifierTypeFormType, type ModifierTypeRecord } from "../schemas";
import { useToast } from "../../../../app/providers/useToast";

const COLUMNS: MasterColumn<ModifierTypeRecord>[] = [
  { header: "S.No", accessor: "sNo" },
  { header: "Name", accessor: "name" },
  { header: "Arabic", accessor: "arabicName" },
];

const ModifierTypePage = () => {
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<ModifierTypeRecord | null>(null);

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

  const handleSave = form.handleSubmit(
    (data) => {
      onSubmit(data);
    },
    (invalidErrors) => {
      const firstError = Object.values(invalidErrors)[0] as any;
      if (firstError?.message) {
        showToast(String(firstError.message), "error");
      }
    }
  );

  return (
    <MasterListPage<ModifierTypeRecord>
      moduleName="Modifier Type"
      title="Modifier Type"
      tableTitle="Saved Modifier Type List"
      searchPlaceholder="Search modifier type..."
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
      deleteDialog={{ message: (row) => `Are you sure you want to delete "${row.name}"?` }}
      renderForm={(_, canDelete) => (
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
                  id="modtype-save"
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
              <ModifierTypeForm form={form} onSave={handleSave} />
            </form>
          </Modal>
      )}
    />
  );
};

export default ModifierTypePage;
