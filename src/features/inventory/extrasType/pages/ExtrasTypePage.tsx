import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  ConfirmDialog,
  Modal,
  PageShell,
  RecordTableCard,
} from "../../../../components/common";
import ExtrasTypeForm from "../components/ExtrasTypeForm";
import { useExtrasTypeManager } from "../hooks/useExtrasTypeManager";
import type { ExtrasTypeRecord } from "../types";
import { usePermissions } from "../../../../hooks/usePermissions";

const ExtrasTypePage = () => {
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
  } = useExtrasTypeManager();
  const [deleteRecord, setDeleteRecord] = React.useState<ExtrasTypeRecord | null>(null);

  const canAdd = hasPermission("Extras Type", "Add");
  const canEdit = hasPermission("Extras Type", "Edit");
  const canDelete = hasPermission("Extras Type", "Delete");

  return (
    <PageShell
      title="Extras Type" >
      <RecordTableCard
        title="Saved Extras Type List"
        search={search}
        onSearchChange={setSearch}
        rowKey="typeId"
        data={filteredRecords}
        actionLabel={canAdd ? "+ Add Extras Type" : undefined}
        onAction={canAdd ? openCreateModal : undefined}
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
        title={editingId ? "Edit Extras Type" : "Add Extras Type"}
      >
        <ExtrasTypeForm
          form={form}
          isEditing={Boolean(editingId)}
          saving={saving}
          onChange={setField}
          onClear={resetForm}
          onSave={handleSave}
          onDelete={editingId && canDelete ? () => {
            const record = filteredRecords.find(r => r.typeId === editingId);
            if (record) {
              setDeleteRecord(record);
              closeModal();
            }
          } : undefined}
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
        message="Are you sure you want to delete this extras type?"
      />
    </PageShell>
  );
};

export default ExtrasTypePage;

