import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog, PageShell, RecordTableCard } from "../../../../components/common";
import CounterModal from "../components/CounterModal";
import { useCounterManager } from "../hooks/useCounterManager";
import type { CounterRecord } from "../types";

const CounterPage = () => {
  const {
    form,
    branches,
    open,
    search,
    editingId,
    loading,
    saving,
    filteredRecords,
    setSearch,
    setField,
    resetForm,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    handleDelete,
  } = useCounterManager();
  const [deleteRecord, setDeleteRecord] = React.useState<CounterRecord | null>(null);

  return (
    <PageShell title="Counter Master">
      <RecordTableCard
        title="Saved Counter List"
        search={search}
        onSearchChange={setSearch}
        rowKey="counterId"
        data={filteredRecords}
        actionLabel="+ Add Counter"
        onAction={openCreateModal}
        autoFocusSearch
        loading={loading}
        columns={[
          { header: "S No", accessor: "sNo" },
          { header: "Name", accessor: "counterName" },
          { header: "Branch", accessor: "branch" },
          {
            header: "Actions",
            accessor: "counterId",
            render: (row) => (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleEdit(row)}
                  className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10"
                  aria-label={`Edit ${row.counterName}`}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteRecord(row)}
                  className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50"
                  aria-label={`Delete ${row.counterName}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          },
        ]}
      />

      <CounterModal
        isOpen={open}
        editingId={editingId}
        form={form}
        branches={branches}
        loading={loading}
        saving={saving}
        onChange={setField}
        onClose={closeModal}
        onClear={resetForm}
        onSave={handleSave}
        onDelete={() => {
          if (editingId) {
            const record = filteredRecords.find(r => r.counterId === editingId);
            if (record) {
              setDeleteRecord(record);
              closeModal();
            }
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
        message={`Are you sure you want to delete counter "${deleteRecord?.counterName}"?`}
        loading={saving}
      />
    </PageShell>
  );
};

export default CounterPage;

