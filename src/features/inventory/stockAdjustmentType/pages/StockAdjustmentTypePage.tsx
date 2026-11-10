import { useState } from "react";
import { Save, RotateCcw } from "lucide-react";
import { Modal, Button } from "../../../../components/common";
import MasterListPage, { type MasterColumn } from "../../../../components/common/MasterListPage";
import { useStockAdjustmentType } from "../hooks/useStockAdjustmentType";
import { StockAdjustmentTypeForm } from "../components/StockAdjustmentTypeForm";
import type { StockAdjustmentType } from "../types";

const effectClass = (effect: string) =>
  effect === "+" ? "bg-green-100 text-green-700" : effect === "-" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-700";

const COLUMNS: MasterColumn<StockAdjustmentType>[] = [
  { header: "S.No", accessor: "sNo", render: (row) => row.sNo || row.typeId },
  { header: "Type Name", accessor: "typeName" },
  {
    header: "Effect",
    accessor: "effect",
    render: (row) => <span className={`px-2 py-1 rounded-full text-xs font-bold ${effectClass(row.effect)}`}>{row.effect}</span>,
  },
];

const StockAdjustmentTypePage = () => {
  const {
    types,
    loading,
    form,
    setForm,
    errors,
    editingId,
    isModalOpen,
    isSaving,
    handleOpenModal,
    handleCloseModal,
    handleClear,
    handleSave,
    handleDelete,
  } = useStockAdjustmentType();

  const [searchQuery, setSearchQuery] = useState("");

  const filteredTypes = types.filter((t) =>
    t.typeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MasterListPage<StockAdjustmentType>
      title="Stock Adjustment Type"
      tableTitle="Stock Adjustment Types"
      searchPlaceholder="Search adjustment types..."
      rowKey="typeId"
      getName={(row) => row.typeName}
      columns={COLUMNS}
      records={filteredTypes}
      loading={loading}
      search={searchQuery}
      onSearchChange={setSearchQuery}
      onAdd={() => handleOpenModal()}
      onEdit={handleOpenModal}
      onDelete={(row) => handleDelete(row.typeId)}
      editingId={editingId}
      closeForm={handleCloseModal}
      deleteDialog={{
        title: "Delete Stock Adjustment Type",
        message: () => "Are you sure you want to delete this type? This action cannot be undone.",
      }}
      renderForm={() => (
          <Modal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            title={editingId ? "Edit Stock Adjustment Type" : "Add Stock Adjustment Type"}
            size="md"
            footer={
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={handleClear}
                  disabled={isSaving}
                  tabIndex={-1}
                  isAction
                  icon={<RotateCcw size={18} />}
                >
                  Clear
                </Button>
                <Button
                  onClick={handleSave}
                  loading={isSaving}
                  disabled={isSaving}
                  isAction
                  icon={<Save size={18} />}
                >
                  {editingId ? "Update" : "Save"}
                </Button>
              </div>
            }
          >
            <StockAdjustmentTypeForm
              form={form}
              setForm={setForm}
              isSaving={isSaving}
              errors={errors}
            />
          </Modal>
      )}
    />
  );
};

export default StockAdjustmentTypePage;
