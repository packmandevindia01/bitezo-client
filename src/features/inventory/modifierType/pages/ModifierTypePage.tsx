import React from "react";
import { Pencil, RotateCcw, Save, Trash2 } from "lucide-react";
import {
  Button,
  ConfirmDialog,
  Modal,
  PageShell,
  RecordTableCard, ListHeader,
} from "../../../../components/common";
import ModifierTypeForm from "../components/ModifierTypeForm";
import { useModifierTypeManager } from "../hooks/useModifierTypeManager";
import type { ModifierTypeRecord } from "../types";
import { usePermissions } from "../../../../hooks/usePermissions";

const ModifierTypePage = () => {
  const { hasPermission } = usePermissions();
  const {
    form,
    loading,
    saving,
    open,
    search,
    editingId,
    filteredRecords,
    setSearch,
    setField,
    resetForm,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    handleDelete,
  } = useModifierTypeManager();
  const [deleteRecord, setDeleteRecord] = React.useState<ModifierTypeRecord | null>(null);

  const canAdd = hasPermission("Modifier Type", "Add");
  const canEdit = hasPermission("Modifier Type", "Edit");
  const canDelete = hasPermission("Modifier Type", "Delete");

  return (
    <PageShell
      title="Modifier Type">
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
        data={filteredRecords}
        loading={loading}
        columns={[
          { header: "#", accessor: "typeId" },
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
          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              onClick={resetForm} 
              disabled={saving} 
              tabIndex={-1}
              isAction
              icon={<RotateCcw size={18} />}
            >
              Clear
            </Button>
            <Button 
              onClick={handleSave} 
              loading={saving}
              isAction
              icon={<Save size={18} />}
            >
              Save
            </Button>
            {editingId && canDelete && (
              <Button
                variant="danger"
                onClick={() => {
                  const record = filteredRecords.find(r => r.typeId === editingId);
                  if (record) {
                    setDeleteRecord(record);
                    closeModal();
                  }
                }}
                disabled={saving}
                isAction
                icon={<Trash2 size={18} />}
              >
                Delete
              </Button>
            )}
          </div>
        }
      >
        <ModifierTypeForm
          form={form}
          onChange={setField}
        />
      </Modal>

      <ConfirmDialog
        isOpen={deleteRecord !== null}
        onCancel={() => setDeleteRecord(null)}
        onConfirm={() => {
          if (deleteRecord) {
            handleDelete(deleteRecord);
            setDeleteRecord(null);
          }
        }}
        message="Are you sure you want to delete this modifier type?"
      />
    </PageShell>
  );
};

export default ModifierTypePage;

