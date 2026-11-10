import MasterListPage, { type MasterColumn } from "../../../../components/common/MasterListPage";
import UserRoleModal from "../components/UserRoleModal";
import { useUserRoleManager } from "../hooks/useUserRoleManager";
import type { UserRoleRecord } from "../types";

const COLUMNS: MasterColumn<UserRoleRecord>[] = [
  { header: "S No", accessor: "sNo" },
  { header: "Role Name", accessor: "roleName" },
];

const UserRolePage = () => {
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
    roleNameError,
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

  return (
    <MasterListPage<UserRoleRecord>
      moduleName="User Master"
      title="User Role Master"
      tableTitle="Saved User Role List"
      searchPlaceholder="Search roles..."
      rowKey="roleId"
      getName={(row) => row.roleName}
      columns={COLUMNS}
      records={filteredRecords}
      loading={loading}
      search={search}
      onSearchChange={setSearch}
      onAdd={openCreateModal}
      onEdit={handleEdit}
      onDelete={(row) => handleDelete(row.roleId)}
      editingId={editingId}
      closeForm={closeModal}
      deleteDialog={{
        title: "Delete User Role",
        message: (row) => `Are you sure you want to delete role "${row.roleName}"?`,
        lockCancel: deleting,
      }}
      renderForm={(deleteEditing) => (
        <UserRoleModal
          isOpen={open}
          editingId={editingId}
          form={form}
          permissions={permissions}
          detailLoading={detailLoading}
          saving={saving}
          deleting={deleting}
          roleNameError={roleNameError}
          onClose={closeModal}
          onChange={setField}
          onTogglePermission={togglePermission}
          onToggleModule={setModulePermissions}
          onClear={resetForm}
          onSave={handleSave}
          onDelete={deleteEditing}
          setActionPermissions={setActionPermissions}
        />
      )}
    />
  );
};

export default UserRolePage;
