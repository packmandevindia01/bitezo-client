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
  } = useVoucherSeriesManager();
  const [deleteRecord, setDeleteRecord] = React.useState<VoucherSeriesRecord | null>(null);

  return (
    <PageShell
      title="Voucher Series" >
      <RecordTableCard
        title="Saved Voucher Series"
        search={search}
        onSearchChange={setSearch}
        rowKey="id"
        data={filteredRecords}
        actionLabel="+ Add Voucher Series"
        onAction={openCreateModal}
        columns={[
          { header: "Voucher Type", accessor: "voucherType" },
          { header: "Name", accessor: "name" },
          { header: "Prefix", accessor: "prefix" },
          { header: "Start No", accessor: "startNo" },
          { header: "Branch", accessor: "branch" },
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

      <Modal isOpen={open} onClose={closeModal} title="Voucher Series">
        <VoucherSeriesForm
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
        message="Are you sure you want to delete this voucher series?"
      />
    </PageShell>
  );
};

export default VoucherSeriesPage;

