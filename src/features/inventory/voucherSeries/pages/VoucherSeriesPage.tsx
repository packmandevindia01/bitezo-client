import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import {
  ConfirmDialog,
  Modal,
  PageShell,
  RecordTableCard,
} from "../../../../components/common";
import VoucherSeriesForm from "../components/VoucherSeriesForm";
import { useVoucherSeriesManager } from "../hooks/useVoucherSeriesManager";
import type { VoucherSeriesRecord } from "../types";

const VoucherSeriesPage = () => {
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
  } = useVoucherSeriesManager();
  const [deleteRecord, setDeleteRecord] = React.useState<VoucherSeriesRecord | null>(null);

  return (
    <PageShell title="Voucher Series">
      <RecordTableCard
        title="Saved Voucher Series list"
        search={search}
        onSearchChange={setSearch}
        rowKey="voucherId"
        data={filteredRecords}
        actionLabel="+ Add Voucher Series"
        onAction={openCreateModal}
        autoFocusSearch
        loading={loading}
        columns={[
          { header: "S No", accessor: "sNo" },
          { header: "Voucher Type", accessor: "voucherType" },
          { header: "Name", accessor: "voucherName" },
          { header: "Branch", accessor: "branch" },
          {
            header: "Actions",
            accessor: "voucherId",
            render: (row) => (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleEdit(row)}
                  className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10"
                  aria-label={`Edit ${row.voucherName}`}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteRecord(row)}
                  className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50"
                  aria-label={`Delete ${row.voucherName}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          },
        ]}
      />

      <Modal 
        isOpen={open} 
        onClose={closeModal} 
        title={editingId ? "Edit Voucher Series" : "Add Voucher Series"}
        size="lg"
      >
        <VoucherSeriesForm
          form={form}
          branches={branches}
          isEditing={Boolean(editingId)}
          saving={saving}
          onChange={setField}
          onClear={resetForm}
          onSave={handleSave}
          onDelete={() => {
            if (editingId) {
              const record = filteredRecords.find(r => r.voucherId === editingId);
              if (record) {
                setDeleteRecord(record);
                closeModal();
              }
            }
          }}
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
        message={`Are you sure you want to delete voucher series "${deleteRecord?.voucherName}"?`}
        loading={saving}
      />
    </PageShell>
  );
};

export default VoucherSeriesPage;

