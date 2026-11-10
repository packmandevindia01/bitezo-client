import { RotateCcw, Save, Trash2 } from "lucide-react";
import { Button, Modal } from "../../../../components/common";
import MasterListPage, { type MasterColumn } from "../../../../components/common/MasterListPage";
import VoucherSeriesForm from "../components/VoucherSeriesForm";
import { useVoucherSeriesManager } from "../hooks/useVoucherSeriesManager";
import type { VoucherSeriesRecord } from "../types";

const COLUMNS: MasterColumn<VoucherSeriesRecord>[] = [
  { header: "S No", accessor: "sNo" },
  { header: "Voucher Type", accessor: "voucherType" },
  { header: "Name", accessor: "voucherName" },
  { header: "Branch", accessor: "branch" },
];

const VoucherSeriesPage = () => {
  const {
    form,
    errors,
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

  return (
    <MasterListPage<VoucherSeriesRecord>
      moduleName="Voucher Series Master"
      title="Voucher Series"
      tableTitle="Saved Voucher Series list"
      searchPlaceholder="Search voucher series..."
      rowKey="voucherId"
      getName={(row) => row.voucherName}
      columns={COLUMNS}
      records={filteredRecords}
      loading={loading}
      search={search}
      onSearchChange={setSearch}
      onAdd={openCreateModal}
      onEdit={handleEdit}
      onDelete={handleDelete}
      editingId={editingId}
      closeForm={closeModal}
      deleteDialog={{ message: (row) => `Are you sure you want to delete voucher series "${row.voucherName}"?`, loading: saving }}
      renderForm={(deleteEditing, canDelete) => (
        <Modal
          isOpen={open}
          onClose={closeModal}
          title={editingId ? "Edit Voucher Series" : "Add Voucher Series"}
          size="lg"
          footer={
            <div className="flex gap-3">
              <Button variant="secondary" onClick={resetForm} disabled={saving} tabIndex={-1} isAction icon={<RotateCcw size={18} />}>
                Clear
              </Button>
              <Button id="vs-save-btn" onClick={handleSave} loading={saving} isAction icon={<Save size={18} />}>
                Save
              </Button>
              {editingId && canDelete && (
                <Button variant="danger" onClick={deleteEditing} disabled={saving} isAction icon={<Trash2 size={18} />}>
                  Delete
                </Button>
              )}
            </div>
          }
        >
          <VoucherSeriesForm form={form} errors={errors} branches={branches} saving={saving} onChange={setField} />
        </Modal>
      )}
    />
  );
};

export default VoucherSeriesPage;
