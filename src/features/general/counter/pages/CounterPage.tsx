import MasterListPage, { type MasterColumn } from "../../../../components/common/MasterListPage";
import CounterModal from "../components/CounterModal";
import { useCounterManager } from "../hooks/useCounterManager";
import type { CounterRecord } from "../types";

const COLUMNS: MasterColumn<CounterRecord>[] = [
  { header: "S No", accessor: "sNo" },
  { header: "Name", accessor: "counterName" },
  { header: "Branch", accessor: "branch" },
];

const CounterPage = () => {
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
  } = useCounterManager();

  return (
    <MasterListPage<CounterRecord>
      moduleName="Counter Master"
      title="Counter Master"
      tableTitle="Saved Counter List"
      searchPlaceholder="Search counters..."
      rowKey="counterId"
      getName={(row) => row.counterName}
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
      deleteDialog={{ message: (row) => `Are you sure you want to delete counter "${row.counterName}"?`, loading: saving }}
      renderForm={(deleteEditing) => (
        <CounterModal
          isOpen={open}
          editingId={editingId}
          form={form}
          errors={errors}
          branches={branches}
          loading={loading}
          saving={saving}
          onChange={setField}
          onClose={closeModal}
          onClear={resetForm}
          onSave={handleSave}
          onDelete={deleteEditing}
        />
      )}
    />
  );
};

export default CounterPage;
