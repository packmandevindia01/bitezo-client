import { Pencil, Trash2 } from "lucide-react";
import { PageShell, RecordTableCard } from "../../../../components/common";
import SectionModal from "../components/SectionModal";
import { useSectionManager } from "../hooks/useSectionManager";

const SectionPage = () => {
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
  } = useSectionManager();

  return (
    <PageShell
      title="Section Master"
      description="Section is now organized as its own feature module and follows the same route, page, modal, and hook structure used elsewhere in your project."
    >
      <RecordTableCard
        title="Saved Section List"
        search={search}
        onSearchChange={setSearch}
        rowKey="id"
        data={filteredRecords}
        actionLabel="+ Add Section"
        onAction={openCreateModal}
        columns={[
          { header: "S No", accessor: "id" },
          { header: "Name", accessor: "name" },
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

      <SectionModal
        isOpen={open}
        editingId={editingId}
        form={form}
        onChange={setField}
        onClose={closeModal}
        onClear={resetForm}
        onSave={handleSave}
      />
    </PageShell>
  );
};

export default SectionPage;

