import MasterListPage, { type MasterColumn } from "../../../../components/common/MasterListPage";
import SectionModal from "../components/SectionModal";
import { useSectionManager } from "../hooks/useSectionManager";
import type { SectionRecord } from "../types";

const COLUMNS: MasterColumn<SectionRecord>[] = [
  { header: "S No", accessor: "sNo" },
  { header: "Name", accessor: "name" },
  { header: "Counter", accessor: "counter" },
];

const SectionPage = () => {
  const {
    form,
    errors,
    counters,
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
  } = useSectionManager();

  return (
    <MasterListPage<SectionRecord>
      moduleName="Section Master"
      title="Section Master"
      tableTitle="Saved Section List"
      searchPlaceholder="Search sections..."
      rowKey="sectionId"
      getName={(row) => row.name}
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
      deleteDialog={{ message: (row) => `Are you sure you want to delete section "${row.name}"?`, loading: saving }}
      renderForm={(deleteEditing) => (
        <SectionModal
          isOpen={open}
          editingId={editingId}
          form={form}
          errors={errors}
          counters={counters}
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

export default SectionPage;
