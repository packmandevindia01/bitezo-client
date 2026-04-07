import { Pencil, Trash2 } from "lucide-react";
import { Modal, PageShell, RecordTableCard } from "../../../../components/common";
import UnitForm from "../components/UnitForm";
import { useUnitManager } from "../hooks/useUnitManager";

const UnitPage = () => {
  const {
    search,
    setSearch,
    open,
    editUnit,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    handleDelete,
    filteredUnits,
  } = useUnitManager();

  return (
    <PageShell
      title="Unit Master" >
      <RecordTableCard
        title="Saved Unit List"
        search={search}
        onSearchChange={setSearch}
        rowKey="id"
        data={filteredUnits}
        actionLabel="+ Add Unit"
        onAction={openCreateModal}
        columns={[
          { header: "#", accessor: "id" },
          { header: "Category", accessor: "category" },
          { header: "Name", accessor: "name" },
          { header: "Parent Unit", accessor: "parentUnit" },
          { header: "Conversion", accessor: "conversion" },
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
                  onClick={() => handleDelete(row)}
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

      <Modal isOpen={open} onClose={closeModal} title="Unit">
        <UnitForm
          key={editUnit?.id ?? "new-unit"}
          initialData={editUnit}
          onSubmit={handleSave}
          onCancel={closeModal}
        />
      </Modal>
    </PageShell>
  );
};

export default UnitPage;

