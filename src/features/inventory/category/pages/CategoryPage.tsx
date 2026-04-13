import { AlertCircle, X } from "lucide-react";
import { ConfirmDialog, PageShell } from "../../../../components/common";
import CategoryModal from "../components/CategoryModal";
import CategoryTable from "../components/CategoryTable";
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
    selectedBranchIds,
    open,
    branchOptions,
    loading,
    saving,
    error,
    setError,
    deleteCandidate,
    requestDelete,
    confirmDelete,
    cancelDelete,
    resetForm,
    closeModal,
    openCreateModal,
    handleImageSelect,
    handleSave,
    handleEdit,
    toggleBranch,
    filteredCategories,
  } = useCategoryManager();

  return (
    <PageShell title="Category Master">
      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0 rounded p-0.5 hover:bg-red-100"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <CategoryTable
        categories={filteredCategories}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        onAdd={openCreateModal}
        onEdit={handleEdit}
        onDelete={requestDelete}
      />

      <CategoryModal
        isOpen={open}
        editingId={editingId}
        form={form}
        saving={saving}
        branchAllocOpen={branchAllocOpen}
        selectedBranchIds={selectedBranchIds}
        branchOptions={branchOptions}
        onClose={closeModal}
        onImageSelect={handleImageSelect}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onToggleBranchAlloc={() => setBranchAllocOpen((prev) => !prev)}
        onToggleBranch={toggleBranch}
        onClear={resetForm}
        onSave={handleSave}
      />

      {/* Delete confirmation dialog */}
      {deleteCandidate && (
        <ConfirmDialog
          isOpen
          title="Delete Category"
          message={`Are you sure you want to delete "${deleteCandidate.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}
    </PageShell>
  );
};

export default CategoryPage;