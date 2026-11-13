import { useMemo, useState } from "react";
import { KeyRound } from "lucide-react";
import ChangePasswordForm from "../components/ChangePasswordForm";
import UserForm from "../components/UserForm";
import { Loader, Modal, StatusBadge } from "../../../../components/common";
import MasterListPage from "../../../../components/common/MasterListPage";
import { useToast } from "../../../../app/providers/useToast";
import { fetchUserById } from "../services";
import type { ChangePasswordFormData } from "../schema/userSchema";
import type { User } from "../types";
import { usePermissions } from "../../../../hooks/usePermissions";
import { useUserList } from "../hooks/useUserList";

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Something went wrong.";
};

export const UserList = () => {
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();

  const {
    users,
    loading,
    deleteUser,
    deleting,
    changePassword,
    passwordChanging,
  } = useUserList();

  const [detailLoading, setDetailLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<User | null>(null);
  const [search, setSearch] = useState("");

  const canAdd = hasPermission("User Master", "Add");
  const canEdit = hasPermission("User Master", "Edit");
  const canDelete = hasPermission("User Master", "Delete");

  const closeModal = () => {
    setOpen(false);
    setEditUser(null);
    setDetailLoading(false);
  };

  const closePasswordModal = () => {
    setPasswordModalOpen(false);
    setPasswordUser(null);
    setDetailLoading(false);
  };

  const openCreateModal = () => {
    if (!canAdd) return;
    setEditUser(null);
    setOpen(true);
  };

  const handleEdit = async (userId: number) => {
    if (!canEdit) return;
    try {
      setOpen(true);
      setDetailLoading(true);
      const details = await fetchUserById(userId);
      const preview = users.find((item) => item.id === userId);
      setEditUser({
        ...details,
        branchName: preview?.branchName ?? details.branchName,
        statusLabel: preview?.statusLabel ?? details.statusLabel,
      });
    } catch (error) {
      closeModal();
      showToast(getErrorMessage(error), "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenPasswordModal = async (userId: number) => {
    if (!canEdit) return;
    try {
      setPasswordModalOpen(true);
      setDetailLoading(true);
      const details = await fetchUserById(userId);
      const preview = users.find((item) => item.id === userId);
      setPasswordUser({
        ...details,
        branchName: preview?.branchName ?? details.branchName,
        statusLabel: preview?.statusLabel ?? details.statusLabel,
      });
    } catch (error) {
      closePasswordModal();
      showToast(getErrorMessage(error), "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate || !canDelete) return;

    try {
      await deleteUser(deleteCandidate.id);
      setDeleteCandidate(null);

      if (editUser?.id === deleteCandidate.id) {
        closeModal();
      }
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  };

  const handlePasswordChange = async (payload: ChangePasswordFormData) => {
    if (!passwordUser || !canEdit) return;

    try {
      await changePassword({ userId: passwordUser.id, payload });
      closePasswordModal();
    } catch {
      // Error handles in custom hook toast
    }
  };

  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;

        return [
          user.name,
          user.branchName ?? "",
          user.roleName ?? "",
          String(user.branchId),
          user.statusLabel ?? "",
        ].some((value) => value.toLowerCase().includes(query));
      }),
    [users, search]
  );

  return (
    <MasterListPage<User>
      moduleName="User Master"
      title="User Management"
      tableTitle="Saved User List"
      searchPlaceholder="Search users..."
      rowKey="id"
      getName={(row) => row.name}
      centered
      loadingText="Loading users..."
      columns={[
        { header: "S.No", accessor: "id", align: "center", render: (_, index) => index + 1 },
        { header: "User Name", accessor: "name", align: "center" },
        {
          header: "Branch",
          accessor: "branchName",
          align: "center",
          render: (row) => <span>{row.branchName || row.branchId || "-"}</span>,
        },
        {
          header: "Status",
          accessor: "isActive",
          align: "center",
          render: (row) => <StatusBadge status={row.isActive ? "active" : "inactive"} label={row.isActive ? "Active" : "Inactive"} />,
        },
      ]}
      extraActions={(row) =>
        canEdit && (
          <button
            type="button"
            onClick={() => void handleOpenPasswordModal(row.id)}
            className="inline-flex rounded-lg p-2 text-blue-600 hover:bg-blue-50 transition-colors"
            aria-label={`Change password for ${row.name}`}
          >
            <KeyRound size={16} />
          </button>
        )
      }
      records={filteredUsers}
      loading={loading}
      search={search}
      onSearchChange={setSearch}
      onAdd={openCreateModal}
      onEdit={(row) => handleEdit(row.id)}
      editingId={editUser?.id ?? null}
      closeForm={closeModal}
      deleteFlow={{
        candidate: deleteCandidate,
        request: setDeleteCandidate,
        confirm: () => void handleDelete(),
        cancel: () => {
          if (!deleting) {
            setDeleteCandidate(null);
          }
        },
      }}
      deleteDialog={{
        title: "Delete User",
        message: (row) => `Are you sure you want to delete ${row.name ?? "this user"}?`,
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
      }}
      renderForm={(_, canDelete) => (
        <>
          <Modal isOpen={open} onClose={closeModal} title={editUser ? "Edit User" : "User Creation"} size="lg">
            {detailLoading ? (
              <div className="py-8">
                <Loader text="Loading user details..." />
              </div>
            ) : (
              <UserForm
                key={editUser?.id ?? "new-user"}
                initialData={editUser}
                onSuccess={closeModal}
                onDelete={editUser && canDelete ? () => setDeleteCandidate(editUser) : undefined}
                deleting={deleting}
                onClear={() => setEditUser(null)}
              />
            )}
          </Modal>

          <Modal isOpen={passwordModalOpen} onClose={closePasswordModal} title="Change Password">
            {detailLoading ? (
              <div className="py-8">
                <Loader text="Loading user details..." />
              </div>
            ) : (
              <ChangePasswordForm
                user={passwordUser}
                onSubmit={handlePasswordChange}
                onCancel={closePasswordModal}
                submitting={passwordChanging}
              />
            )}
          </Modal>
        </>
      )}
    />
  );
};

export default UserList;