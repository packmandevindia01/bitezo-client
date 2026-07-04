import { useMemo, useState } from "react";
import { KeyRound, Pencil, Trash2 } from "lucide-react";
import ChangePasswordForm from "../components/ChangePasswordForm";
import UserForm from "../components/UserForm";
import {
  ConfirmDialog,
  Loader,
  Modal,
  PageShell,
  RecordTableCard,
  StatusBadge,
} from "../../../../components/common";
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
    } catch (error) {
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
    <PageShell title="User Management">
      {loading ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-10 shadow-sm">
          <Loader text="Loading users..." />
        </div>
      ) : (
        <RecordTableCard
          title="Saved User List"
          search={search}
          onSearchChange={setSearch}
          rowKey="id"
          data={filteredUsers}
          actionLabel={canAdd ? "+ Add User" : undefined}
          onAction={canAdd ? openCreateModal : undefined}
          columns={[
            { header: "#", accessor: "id", align: "center" },
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
            {
              header: "Actions",
              accessor: "id",
              align: "center",
              render: (row) => (
                <div className="flex justify-center gap-2">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => void handleEdit(row.id)}
                      className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10 transition-colors"
                      aria-label={`Edit ${row.name}`}
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => void handleOpenPasswordModal(row.id)}
                      className="inline-flex rounded-lg p-2 text-blue-600 hover:bg-blue-50 transition-colors"
                      aria-label={`Change password for ${row.name}`}
                    >
                      <KeyRound size={16} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setDeleteCandidate(row)}
                      className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors"
                      aria-label={`Delete ${row.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}

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

      <ConfirmDialog
        isOpen={deleteCandidate !== null}
        title="Delete User"
        message={`Are you sure you want to delete ${deleteCandidate?.name ?? "this user"}?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          if (!deleting) {
            setDeleteCandidate(null);
          }
        }}
      />
    </PageShell>
  );
};

export default UserList;