import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog, PageShell, RecordTableCard } from "../../../../components/common";
import UserRoleModal from "../components/UserRoleModal";
import { useUserRoleManager } from "../hooks/useUserRoleManager";
import type { UserRoleRecord } from "../types";
import { usePermissions } from "../../../../hooks/usePermissions";

const UserRolePage = () => {
  const { hasPermission } = usePermissions();
  const {
    form,
    open,
    search,
    editingId,
    filteredRecords,
    permissions,
    loading,
    detailLoading,
    saving,
    deleting,
    setSearch,
    setField,
    togglePermission,
    setModulePermissions,
    resetForm,
    closeModal,
    openCreateModal,
    handleEdit,
    handleSave,
    handleDelete,
    setActionPermissions,
  } = useUserRoleManager();
  const [deleteRecord, setDeleteRecord] = useState<UserRoleRecord | null>(null);

  const canAdd = hasPermission("User Master", "Add");
  const canEdit = hasPermission("User Master", "Edit");
  const canDelete = hasPermission("User Master", "Delete");

  return (
    <PageShell title="User Role Master">
      <RecordTableCard
        title="Saved User Role List"
        search={search}
        onSearchChange={setSearch}
        rowKey="roleId"
        data={filteredRecords}
        actionLabel={canAdd ? "+ Add Role" : undefined}
        onAction={canAdd ? openCreateModal : undefined}
        autoFocusSearch
        loading={loading}
        columns={[
          { header: "S No", accessor: "sNo" },
          { header: "Role Name", accessor: "roleName" },
          {
            header: "Actions",
            accessor: "roleId",
            render: (row) => (
              <div className="flex gap-2">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => void handleEdit(row)}
                    className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10"
                    aria-label={`Edit ${row.roleName}`}
                  >
                    <Pencil size={16} />
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setDeleteRecord(row)}
                    className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50"
                    aria-label={`Delete ${row.roleName}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />

      <UserRoleModal
        isOpen={open}
        editingId={editingId}
        form={form}
        permissions={permissions}
        detailLoading={detailLoading}
        saving={saving}
        deleting={deleting}
        onClose={closeModal}
        onChange={setField}
        onTogglePermission={togglePermission}
        onToggleModule={setModulePermissions}
        onClear={resetForm}
        onSave={handleSave}
        onDelete={() => {
          if (!canDelete) return;
          const record = filteredRecords.find((item) => item.roleId === editingId);
          if (record) {
            setDeleteRecord(record);
            closeModal();
          }
        }}
        setActionPermissions={setActionPermissions}
      />

      <ConfirmDialog
        isOpen={deleteRecord !== null}
        title="Delete User Role"
        message={`Are you sure you want to delete role "${deleteRecord?.roleName ?? ""}"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onCancel={() => {
          if (!deleting) {
            setDeleteRecord(null);
          }
        }}
        onConfirm={() => {
          if (deleteRecord) {
            void handleDelete(deleteRecord.roleId);
            setDeleteRecord(null);
          }
        }}
      />
    </PageShell>
  );
};

export default UserRolePage;
