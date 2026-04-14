import { Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog, Modal, PageShell, RecordTableCard } from "../../../../components/common";
import GroupForm from "../components/GroupForm";
import { useGroupManager } from "../hooks/useGroupManager";
import type { GroupRecord } from "../types";

// ─── Component ────────────────────────────────────────────────────────────────

const GroupPage = () => {
  const {
    filteredGroups,
    listLoading,
    listError,
    fetchGroups,

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
  } = useGroupManager();

  return (
    <PageShell title="Group Master">
      {/* List-level error (fetch failure) */}
      {listError && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{listError}</span>
          <button
            type="button"
            onClick={fetchGroups}
            className="ml-4 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Inline delete error (FK constraint etc.) shown above the table */}
      {mutationError && !isOpen && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {mutationError}
        </div>
      )}

      <RecordTableCard
        title="Saved Group List"
        search={search}
        onSearchChange={setSearch}
        rowKey="grpId"
        data={filteredGroups}
        loading={listLoading}
        actionLabel="+ Add Group"
        onAction={openCreateModal}
        columns={[
          { header: "#", accessor: "sNo" },
          { header: "Code", accessor: "code" },
          { header: "Name", accessor: "name" },
          { header: "Status", accessor: "isActive" },
          {
            header: "Actions",
            accessor: "grpId",
            render: (row: GroupRecord) => (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(row)}
                  className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10"
                  aria-label={`Edit ${row.name}`}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => requestDelete(row)}
                  disabled={deleting === row.grpId}
                  className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-40"
                  aria-label={`Delete ${row.name}`}
                >
                  {deleting === row.grpId ? (
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

      <Modal isOpen={isOpen} onClose={closeModal} title="Group">
        <GroupForm
          key={isEditMode ? `edit-${editDetail?.grpId}` : "new-group"}
          initialData={editDetail}
          detailLoading={detailLoading}
          saving={saving}
          error={mutationError}
          onSubmit={handleSave}
          onCancel={closeModal}
        />
      </Modal>

      {/* Delete confirmation dialog */}
      {deleteCandidate && (
        <ConfirmDialog
          isOpen
          title="Delete Group"
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

export default GroupPage;