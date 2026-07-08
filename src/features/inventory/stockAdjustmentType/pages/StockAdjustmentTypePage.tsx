import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { PageShell, RecordTableCard, Modal, ListHeader } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import { useStockAdjustmentType } from "../hooks/useStockAdjustmentType";
import { StockAdjustmentTypeForm } from "../components/StockAdjustmentTypeForm";
import type { StockAdjustmentType } from "../types";

const StockAdjustmentTypePage = () => {
  const {
    types,
    loading,
    form,
    setForm,
    isModalOpen,
    isSaving,
    handleOpenModal,
    handleCloseModal,
    handleSave,
    handleDelete,
  } = useStockAdjustmentType();

  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const filteredTypes = types.filter((t) =>
    t.typeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageShell title="Stock Adjustment Type" description="Manage reasons and effects for stock adjustments.">
      <ListHeader
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search adjustment types..."
        autoFocusSearch
        canAdd={true}
        onAdd={() => handleOpenModal()}
      />

      <div className="overflow-x-auto">
        <RecordTableCard<StockAdjustmentType>
          title="Stock Adjustment Types"
          rowKey="typeId"
          loading={loading}
          data={filteredTypes}
          columns={[
            { 
              header: "S.No", 
              accessor: "sNo",
              render: (row) => row.sNo || row.typeId
            },
            { header: "Type Name", accessor: "typeName" },
            { 
              header: "Effect", 
              accessor: "effect",
              render: (row) => (
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                  row.effect === "+" ? "bg-green-100 text-green-700" :
                  row.effect === "-" ? "bg-red-100 text-red-700" :
                  "bg-slate-100 text-slate-700"
                }`}>
                  {row.effect}
                </span>
              ) 
            },
            {
              header: "Actions",
              accessor: "typeId",
              render: (row) => (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenModal(row)}
                    className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteId(row.typeId)}
                    className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={form.typeName ? "Edit Stock Adjustment Type" : "Add Stock Adjustment Type"}
        size="md"
      >
        <StockAdjustmentTypeForm
          form={form}
          setForm={setForm}
          onSave={handleSave}
          isSaving={isSaving}
        />
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) handleDelete(deleteId);
          setDeleteId(null);
        }}
        title="Delete Stock Adjustment Type"
        message="Are you sure you want to delete this type? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </PageShell>
  );
};

export default StockAdjustmentTypePage;
