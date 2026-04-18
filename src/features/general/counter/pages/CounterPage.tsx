import { Pencil, Trash2 } from "lucide-react";
import { PageShell, RecordTableCard } from "../../../../components/common";
import CounterModal from "../components/CounterModal";
import { useCounterManager } from "../hooks/useCounterManager";

const CounterPage = () => {
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
  } = useCounterManager();

  return (
    <PageShell title="Counter Master">
      <RecordTableCard
        title="Saved Counter List"
        search={search}
        onSearchChange={setSearch}
        rowKey="id"
        data={filteredRecords}
        actionLabel="+ Add Counter"
        onAction={openCreateModal}
        autoFocusSearch
        columns={[
          { header: "S No", accessor: "id" },
          { header: "Name", accessor: "name" },
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

      <CounterModal
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

export default CounterPage;

