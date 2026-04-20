import { AlertCircle, Pencil, Trash2, X } from "lucide-react";
import { ConfirmDialog, Modal, PageShell, RecordTableCard } from "../../../../components/common";
import TaxForm from "../components/TaxForm";
import { useTaxManager } from "../hooks/useTaxManager";

const TaxPage = () => {
  const {
    filteredTaxes,
    listLoading,
    listError,
    fetchTaxes,

    search,
    setSearch,

    isOpen,
    isEditMode,
    editDetail,
    detailLoading,

    saving,
    deleting,
    mutationError,
    clearMutationError,

    openCreateModal,
    openEditModal,
    closeModal,
    handleSave,

    deleteCandidate,
    requestDelete,
    confirmDelete,
    cancelDelete,
  } = useTaxManager();

  return (
    <PageShell title="Tax Master">
      {/* Error banner */}
      {(listError || mutationError) && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{mutationError || listError}</span>
          <button
            type="button"
            onClick={mutationError ? clearMutationError : fetchTaxes}
            className="shrink-0 rounded p-0.5 hover:bg-red-100"
          >
            {mutationError ? <X size={14} /> : <span className="underline">Retry</span>}
          </button>
        </div>
      )}

      <RecordTableCard
        title="Saved Tax List"
        search={search}
        onSearchChange={setSearch}
        rowKey="id"
        data={filteredTaxes}
        loading={listLoading}
        actionLabel="+ Add Tax"
        onAction={openCreateModal}
        autoFocusSearch
        columns={[
          { header: "#", accessor: "sNo" },
          { header: "Name", accessor: "name" },
          { 
            header: "Value (%)", 
            accessor: "value",
            render: (row) => `${row.value}%`
          },
          {
            header: "Actions",
            accessor: "id",
            render: (row) => (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(row)}
                  className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10"
                  title={`Edit ${row.name}`}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => requestDelete(row)}
                  disabled={deleting === row.id}
                  className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  title={`Delete ${row.name}`}
                >
                  {deleting === row.id ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            ),
          },
        ]}
      />

      <Modal 
        isOpen={isOpen} 
        onClose={closeModal} 
        title={isEditMode ? "Edit Tax" : "Add New Tax"}
      >
        <TaxForm
          key={isEditMode ? `edit-${editDetail?.id}` : "new-tax"}
          initialData={editDetail}
          saving={saving || detailLoading}
          error={mutationError}
          onSubmit={handleSave}
          onCancel={closeModal}
          onDelete={() => {
            if (editDetail) {
              requestDelete({ id: editDetail.id, name: editDetail.name } as any);
              closeModal();
            }
          }}
        />
      </Modal>

      {/* Delete confirmation dialog */}
      {deleteCandidate && (
        <ConfirmDialog
          isOpen
          title="Delete Tax"
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

export default TaxPage;
