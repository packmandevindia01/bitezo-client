import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog, PageShell, RecordTableCard } from "../../../../components/common";
import PaymodeModal from "../components/PaymodeModal";
import { usePaymodeManager } from "../hooks/usePaymodeManager";
import type { PaymodeRecord } from "../types";

const PaymodePage = () => {
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
  } = usePaymodeManager();
  const [deleteRecord, setDeleteRecord] = React.useState<PaymodeRecord | null>(null);

  return (
    <PageShell
      title="Paymode Master" >
      <RecordTableCard
        title="Saved Paymode List"
        search={search}
        onSearchChange={setSearch}
        rowKey="id"
        data={filteredRecords}
        actionLabel="+ Add Paymode"
        onAction={openCreateModal}
        autoFocusSearch
        columns={[
          { header: "S No", accessor: "id" },
          { header: "Paymode", accessor: "paymode" },
          { header: "Branch", accessor: "branch" },
          { header: "Counter", accessor: "counter" },
          {
            header: "Actions",
            accessor: "id",
            render: (row) => (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleEdit(row)}
                  className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10"
                  aria-label={`Edit ${row.paymode}`}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteRecord(row)}
                  className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50"
                  aria-label={`Delete ${row.paymode}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          },
        ]}
      />

      <PaymodeModal
        isOpen={open}
        editingId={editingId}
        form={form}
        onChange={setField}
        onClose={closeModal}
        onClear={resetForm}
        onSave={handleSave}
        onDelete={() => {
          const record = filteredRecords.find(r => r.id === editingId);
          if (record) {
            setDeleteRecord(record);
            closeModal();
          }
        }}
      />

      <ConfirmDialog
        isOpen={deleteRecord !== null}
        onCancel={() => setDeleteRecord(null)}
        onConfirm={() => {
          if (deleteRecord) {
            handleDelete(deleteRecord);
            setDeleteRecord(null);
          }
        }}
        message={`Are you sure you want to delete paymode "${deleteRecord?.paymode}"?`}
      />
    </PageShell>
  );
};

export default PaymodePage;

