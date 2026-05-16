import { Pencil, RotateCcw, Save, Trash2 } from "lucide-react";
import React from "react";
import {
  Button,
  ConfirmDialog,
  Modal,
  PageShell,
  RecordTableCard,
} from "../../../../components/common";
import VoucherSeriesForm from "../components/VoucherSeriesForm";
import { useVoucherSeriesManager } from "../hooks/useVoucherSeriesManager";
import type { VoucherSeriesRecord } from "../types";
import { usePermissions } from "../../../../hooks/usePermissions";

const VoucherSeriesPage = () => {
  const { hasPermission } = usePermissions();
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

  const canAdd = hasPermission("Voucher Series Master", "Add");
  const canEdit = hasPermission("Voucher Series Master", "Edit");
  const canDelete = hasPermission("Voucher Series Master", "Delete");

  return (
    <PageShell title="Voucher Series">
      <RecordTableCard
        title="Saved Voucher Series list"
        search={search}
        onSearchChange={setSearch}
        rowKey="voucherId"
        data={filteredRecords}
        actionLabel={canAdd ? "+ Add Voucher Series" : undefined}
        onAction={canAdd ? openCreateModal : undefined}
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
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleEdit(row)}
                    className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10"
                    aria-label={`Edit ${row.voucherName}`}
                  >
                    <Pencil size={16} />
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setDeleteRecord(row)}
                    className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50"
                    aria-label={`Delete ${row.voucherName}`}
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
        title={editingId ? "Edit Voucher Series" : "Add Voucher Series"}
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
                  const record = filteredRecords.find(r => r.voucherId === editingId);
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
        <VoucherSeriesForm
          form={form}
          branches={branches}
          saving={saving}
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
        message={`Are you sure you want to delete voucher series "${deleteRecord?.voucherName}"?`}
        loading={saving}
      />
    </PageShell>
  );
};

export default VoucherSeriesPage;

