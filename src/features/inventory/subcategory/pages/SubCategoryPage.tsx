import { AlertCircle, X } from "lucide-react";
import { ConfirmDialog, PageShell } from "../../../../components/common";
import SubCategoryModal from "../components/SubCategoryModal";
import SubCategoryTable from "../components/SubCategoryTable";
import { useSubCategoryManager } from "../hooks/useSubCategoryManager";

const SubCategoryPage = () => {
  const {
    form,
    setForm,
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

  return (
    <PageShell title="Sub Category Master">
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

      <SubCategoryTable
        subCategories={filteredSubCategories}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        onAdd={openCreateModal}
        onEdit={handleEdit}
        onDelete={requestDelete}
      />

      <SubCategoryModal
        isOpen={open}
        editingId={editingId}
        form={form}
        categoryOptions={categoryOptions}
        saving={saving}
        onClose={closeModal}
        onImageSelect={handleImageSelect}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onClear={resetForm}
        onSave={handleSave}
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
