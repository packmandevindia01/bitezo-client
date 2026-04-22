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
    loading,
    saving,
    counterOptions,
    counterAllocOpen,
    setCounterAllocOpen,
    setSearch,
    setField,
    toggleCounterSelection,
    resetForm,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    handleDelete,
  } = usePaymodeManager();
  const [deleteRecord, setDeleteRecord] = React.useState<PaymodeRecord | null>(null);

  return (
    <PageShell title="Paymode Master">
      <RecordTableCard
        title="Saved Paymode List"
        search={search}
        onSearchChange={setSearch}
        rowKey="paymodeId"
        data={filteredRecords}
        actionLabel="+ Add Paymode"
        onAction={openCreateModal}
        autoFocusSearch
        loading={loading}
        columns={[
          { header: "S No", accessor: "sNo" },
          { header: "Code", accessor: "code" },
          { header: "Paymode", accessor: "paymodeName" },
          { 
            header: "Status", 
            accessor: "isActive",
            render: (row) => (
              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                row.isActive === "Active" || row.isActive === true
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}>
                {row.isActive === "Active" || row.isActive === true ? "Active" : "Inactive"}
              </span>
            )
          },
          {
            header: "Actions",
            accessor: "paymodeId",
            render: (row) => (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleEdit(row)}
                  className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10"
                  aria-label={`Edit ${row.paymodeName}`}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteRecord(row)}
                  className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50"
                  aria-label={`Delete ${row.paymodeName}`}
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
        saving={saving}
        counterAllocOpen={counterAllocOpen}
        selectedCounterIds={form.counterIds}
        counterOptions={counterOptions}
        onClose={closeModal}
        onChange={setField}
        onToggleCounterAlloc={() => setCounterAllocOpen(!counterAllocOpen)}
        onToggleCounter={toggleCounterSelection}
        onClear={resetForm}
        onSave={handleSave}
        onDelete={() => {
          const record = filteredRecords.find(r => r.paymodeId === editingId);
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
            handleDelete(deleteRecord.paymodeId);
            setDeleteRecord(null);
          }
        }}
        message={`Are you sure you want to delete paymode "${deleteRecord?.paymodeName}"?`}
      />
    </PageShell>
  );
};

export default PaymodePage;


