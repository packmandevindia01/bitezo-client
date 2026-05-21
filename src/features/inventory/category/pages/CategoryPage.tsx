import { AlertCircle, X } from "lucide-react";
import { ConfirmDialog, PageShell } from "../../../../components/common";
import CategoryModal from "../components/CategoryModal";
import CategoryTable from "../components/CategoryTable";
import { useCategoryManager } from "../hooks/useCategoryManager";
import { usePermissions } from "../../../../hooks/usePermissions";

const CategoryPage = () => {
  const { hasPermission } = usePermissions();
  const {
    form,
    setForm,
    search,
    setSearch,
    editingId,
    open,
    branchOptions,
    groups,
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
    toggleGroup,
    filteredCategories,
  } = useCategoryManager();

  const canAdd = hasPermission("Category Master", "Add");
  const canEdit = hasPermission("Category Master", "Edit");
  const canDelete = hasPermission("Category Master", "Delete");

  return (
    <PageShell title="Category Master">
      {/* Error banner */}
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="shrink-0 rounded p-0.5 hover:bg-amber-100"
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
        onAdd={canAdd ? openCreateModal : undefined}
        onEdit={canEdit ? handleEdit : undefined}
        onDelete={canDelete ? requestDelete : undefined}
      />

      <CategoryModal
        isOpen={open}
        editingId={editingId}
        form={form}
        saving={saving}
        branchOptions={branchOptions}
        groups={groups}
        onClose={closeModal}
        onImageSelect={handleImageSelect}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onToggleBranch={toggleBranch}
        onToggleGroup={toggleGroup}
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