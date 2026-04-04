import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  ConfirmDialog,
  Modal,
  PageShell,
  RecordTableCard,
} from "../../../components/common";
import ExtrasTypeForm from "../components/ExtrasTypeForm";
import { useExtrasTypeManager } from "../hooks/useExtrasTypeManager";
import type { ExtrasTypeRecord } from "../types";

const ExtrasTypePage = () => {
  const {
    form,
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

  return (
    <PageShell
      title="Extras Type"
      description="Extras type now matches the same page shell, record table, modal entry form, and confirmation pattern used by your Users screen."
    >
      <RecordTableCard
        title="Saved Extras Type List"
        search={search}
        onSearchChange={setSearch}
        rowKey="id"
        data={filteredRecords}
        actionLabel="+ Add Extras Type"
        onAction={openCreateModal}
        columns={[
          { header: "#", accessor: "id" },
          { header: "Name", accessor: "name" },
          { header: "Arabic", accessor: "arabic" },
          {
            header: "Actions",
            accessor: "id",
            render: (row) => (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleEdit(row)}
                  className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10"
                  aria-label={`Edit ${row.name}`}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteRecord(row)}
                  className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50"
                  aria-label={`Delete ${row.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          },
        ]}
      />

      <Modal isOpen={open} onClose={closeModal} title="Extras Type">
        <ExtrasTypeForm
          form={form}
          isEditing={Boolean(editingId)}
          onChange={setField}
          onClear={resetForm}
          onSave={handleSave}
          onCancel={closeModal}
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
