import { AlertCircle, Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog, Modal, PageShell, RecordTableCard, ListHeader } from "../../../../components/common";
import UnitForm from "../components/UnitForm";
import { useUnitManager } from "../hooks/useUnitManager";
import { usePermissions } from "../../../../hooks/usePermissions";

const UnitPage = () => {
  const { hasPermission } = usePermissions();
  const {
    filteredUnits,
    listLoading,
    listError,
    fetchUnits,

    search,
    setSearch,

    isOpen,
    isEditMode,
    editDetail,
    detailLoading,

    saving,
    deleting,
    mutationError,

    openCreateModal,
    openEditModal,
    closeModal,
    handleSave,

    deleteCandidate,
    requestDelete,
    confirmDelete,
    cancelDelete,
  } = useUnitManager();

  const canAdd = hasPermission("Unit Master", "Add");
  const canEdit = hasPermission("Unit Master", "Edit");
  const canDelete = hasPermission("Unit Master", "Delete");

  return (
    <PageShell title="Unit Master">
      <ListHeader
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search units..."
        autoFocusSearch
        canAdd={canAdd}
        onAdd={openCreateModal}
      />

      {/* Error banner */}
      {listError && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{listError}</span>
          <button
            type="button"
            onClick={fetchUnits}
            className="shrink-0 rounded p-0.5 hover:bg-amber-100"
          >
            <span className="underline">Retry</span>
          </button>
        </div>
      )}

      <RecordTableCard
        title="Saved Unit List"
        rowKey="unitId"
        data={filteredUnits}
        loading={listLoading}
        columns={[
          { header: "#", accessor: "sNo" },
          { header: "Name", accessor: "name" },
          { header: "Category", accessor: "category" },
          { 
            header: "Value", 
            accessor: "currentValue",
            render: (row) => row.currentValue?.toString() || "0"
          },
          {
            header: "Actions",
            accessor: "unitId",
            render: (row) => {
              const isRestricted = row.unitId <= 4;
              return (
                <div className="flex gap-2">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => openEditModal(row)}
                      disabled={isRestricted}
                      className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10 disabled:opacity-30 disabled:cursor-not-allowed"
                      title={isRestricted ? "Core system unit cannot be edited" : `Edit ${row.name}`}
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => requestDelete(row)}
                      disabled={isRestricted || deleting === row.unitId}
                      className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                      title={isRestricted ? "Core system unit cannot be deleted" : `Delete ${row.name}`}
                    >
                      {deleting === row.unitId ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  )}
                </div>
              );
            },
          },
        ]}
      />

      <Modal 
        isOpen={isOpen} 
        onClose={closeModal} 
        title={isEditMode ? "Edit Unit" : "Add New Unit"}
      >
        <UnitForm
          key={isEditMode ? `edit-${editDetail?.unitId}` : "new-unit"}
          initialData={editDetail}
          saving={saving || detailLoading}
          error={mutationError}
          onSubmit={handleSave}
          onCancel={closeModal}
          onDelete={editDetail && canDelete ? () => {
            if (editDetail) {
              requestDelete({ unitId: editDetail.unitId, name: editDetail.name } as any);
              closeModal();
            }
          } : undefined}
          onClear={openCreateModal}
        />
      </Modal>

      {/* Delete confirmation dialog */}
      {deleteCandidate && (
        <ConfirmDialog
          isOpen
          title="Delete Unit"
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

export default UnitPage;
