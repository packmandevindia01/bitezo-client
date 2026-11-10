import { Modal, StatusBadge } from "../../../../components/common";
import MasterListPage, { MasterLoadError, type MasterColumn } from "../../../../components/common/MasterListPage";
import GroupForm from "../components/GroupForm";
import { useGroupManager } from "../hooks/useGroupManager";
import type { GroupListItem } from "../types";

const isActive = (row: GroupListItem) => ["active", "true"].includes(String(row.isActive).toLowerCase());

const COLUMNS: MasterColumn<GroupListItem>[] = [
  { header: "S.No", accessor: "sNo" },
  { header: "Code", accessor: "code" },
  { header: "Name", accessor: "name" },
  {
    header: "Status",
    accessor: "isActive",
    render: (row) => <StatusBadge status={isActive(row) ? "active" : "inactive"} label={isActive(row) ? "Active" : "Inactive"} />,
  },
];

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
    <MasterListPage<GroupListItem>
      moduleName="Group Master"
      title="Group Master"
      tableTitle="Saved Group List"
      searchPlaceholder="Search groups..."
      rowKey="grpId"
      getName={(row) => row.name}
      columns={COLUMNS}
      records={filteredGroups}
      loading={listLoading}
      search={search}
      onSearchChange={setSearch}
      onAdd={openCreateModal}
      onEdit={openEditModal}
      editingId={editDetail?.grpId ?? null}
      closeForm={closeModal}
      notices={
        <>
          {listError && <MasterLoadError message={listError} onRetry={fetchGroups} />}
          {mutationError && !isOpen && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{mutationError}</div>
          )}
        </>
      }
      deletingKey={deleting}
      deleteFlow={{ candidate: deleteCandidate as GroupListItem | null, request: requestDelete, confirm: confirmDelete, cancel: cancelDelete }}
      deleteDialog={{
        title: "Delete Group",
        message: (row) => `Are you sure you want to delete "${row.name}"? This action cannot be undone.`,
      }}
      renderForm={(_, canDelete) => (
        <Modal isOpen={isOpen} onClose={closeModal} title={isEditMode ? "Edit Group" : "Add Group"}>
          <GroupForm
            key={isEditMode ? `edit-${editDetail?.grpId}` : "new-group"}
            initialData={editDetail}
            detailLoading={detailLoading}
            saving={saving}
            onSubmit={handleSave}
            onDelete={
              editDetail && canDelete
                ? () => {
                    requestDelete(editDetail);
                    closeModal();
                  }
                : undefined
            }
          />
        </Modal>
      )}
    />
  );
};

export default GroupPage;
