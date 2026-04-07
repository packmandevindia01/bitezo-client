import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  ConfirmDialog,
  Modal,
  PageShell,
  RecordTableCard,
} from "../../../../components/common";
import ExtrasMasterForm from "../components/ExtrasMasterForm";
import { useExtrasMasterManager } from "../hooks/useExtrasMasterManager";
import type { ExtrasMasterRecord } from "../types";

const ExtrasMasterPage = () => {
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
  } = useExtrasMasterManager();
  const [deleteRecord, setDeleteRecord] = React.useState<ExtrasMasterRecord | null>(null);

  return (
    <PageShell
      title="Extras Master" >
      <RecordTableCard
        title="Saved Extras List"
        search={search}
        onSearchChange={setSearch}
        rowKey="id"
        data={filteredRecords}
        actionLabel="+ Add Extras"
        onAction={openCreateModal}
        columns={[
          { header: "Category", accessor: "category" },
          { header: "Name", accessor: "name" },
          { header: "Arabic", accessor: "arabic" },
          { header: "Price", accessor: "price" },
          { header: "Type", accessor: "type" },
          {
            header: "Color",
            accessor: "color",
            render: (row) => (
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-4 w-4 rounded-full border border-gray-300"
                  style={{ backgroundColor: row.color }}
                />
                <span>{row.color}</span>
              </div>
            ),
          },
          { header: "Branch", accessor: "branch" },
          {
            header: "Multi Cat",
            accessor: "isMultiCategory",
            render: (row) => <span>{row.isMultiCategory ? "Yes" : "No"}</span>,
          },
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

      <Modal isOpen={open} onClose={closeModal} title="Extras Master" size="lg">
        <ExtrasMasterForm
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
        message="Are you sure you want to delete this extras record?"
      />
    </PageShell>
  );
};

export default ExtrasMasterPage;

