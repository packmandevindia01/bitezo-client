import { PageShell } from "../../../components/common";
import CategoryModal from "../components/CategoryModal";
import CategoryTable from "../components/CategoryTable";
import { categoryBranchOptions } from "../constants";
import { useCategoryManager } from "../hooks/useCategoryManager";

const CategoryPage = () => {
  const {
    form,
    setForm,
    search,
    setSearch,
    editingId,
    branchAllocOpen,
    setBranchAllocOpen,
    selectedBranches,
    open,
    resetForm,
    closeModal,
    openCreateModal,
    handleImageSelect,
    handleSave,
    handleEdit,
    deleteById,
    toggleBranch,
    filteredCategories,
  } = useCategoryManager();

  return (
    <PageShell
      title="Category Master"
      description="Categories are now organized under their own feature folder and use the shared table-first workflow with a consistent add or edit modal."
    >
      <CategoryTable
        categories={filteredCategories}
        search={search}
        onSearchChange={setSearch}
        onAdd={openCreateModal}
        onEdit={handleEdit}
        onDelete={deleteById}
      />

      <CategoryModal
        isOpen={open}
        editingId={editingId}
        form={form}
        branchAllocOpen={branchAllocOpen}
        selectedBranches={selectedBranches}
        branchOptions={categoryBranchOptions}
        onClose={closeModal}
        onImageSelect={handleImageSelect}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onToggleBranchAlloc={() => setBranchAllocOpen((prev) => !prev)}
        onToggleBranch={toggleBranch}
        onClear={resetForm}
        onSave={handleSave}
      />
    </PageShell>
  );
};

export default CategoryPage;
