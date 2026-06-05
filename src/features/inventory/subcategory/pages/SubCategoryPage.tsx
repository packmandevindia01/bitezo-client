import { AlertCircle, X } from "lucide-react";
import { ConfirmDialog, PageShell } from "../../../../components/common";
import SubCategoryModal from "../components/SubCategoryModal";
import SubCategoryTable from "../components/SubCategoryTable";
import { useSubCategoryManager } from "../hooks/useSubCategoryManager";
import { usePermissions } from "../../../../hooks/usePermissions";

const SubCategoryPage = () => {
  const { hasPermission } = usePermissions();
  const {
    form,
    handleFormChange,
    errors,
    categoryOptions,
    editingId,
    search,
    setSearch,
    open,
    loading,
    saving,
    error,
    setError,
    deleteCandidate,
    resetForm,
    closeModal,
    openCreateModal,
    handleImageSelect,
    handleSave,
    handleEdit,
    requestDelete,
    confirmDelete,
    cancelDelete,
    filteredSubCategories,
  } = useSubCategoryManager();

  const canAdd = hasPermission("Sub Category Master", "Add");
  const canEdit = hasPermission("Sub Category Master", "Edit");
  const canDelete = hasPermission("Sub Category Master", "Delete");

  return (
    <PageShell title="Sub Category Master">
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

      <SubCategoryTable
        subCategories={filteredSubCategories}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        onAdd={canAdd ? openCreateModal : undefined}
        onEdit={canEdit ? handleEdit : undefined}
        onDelete={canDelete ? requestDelete : undefined}
      />

      <SubCategoryModal
        isOpen={open}
        editingId={editingId}
        form={form}
        errors={errors}
        categoryOptions={categoryOptions}
        saving={saving}
        onClose={closeModal}
        onImageSelect={handleImageSelect}
        onChange={handleFormChange}
        onClear={resetForm}
        onSave={handleSave}
        onDelete={canDelete ? () => {
          const record = filteredSubCategories.find((s) => s.id === editingId);
          if (record) {
            requestDelete(record);
            closeModal();
          }
        } : undefined}
      />

      {/* Delete confirmation dialog */}
      {deleteCandidate && (
        <ConfirmDialog
          isOpen
          title="Delete Sub Category"
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

export default SubCategoryPage;
