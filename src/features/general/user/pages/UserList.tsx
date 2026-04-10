import { useEffect, useMemo, useState } from "react";
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
import {
  changeUserPassword,
  createUser,
  deleteUser,
  fetchUserById,
  fetchUsers,
  updateUser,
} from "../services";
import type { ChangePasswordPayload, User, UserPayload } from "../types";

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Something went wrong while saving the user.";
};

const UserList = () => {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [open, setOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [passwordUser, setPasswordUser] = useState<User | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<User | null>(null);
  const [search, setSearch] = useState("");

  const loadUsers = async () => {
    try {
      setLoading(true);
      const records = await fetchUsers();
      setUsers(records);
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

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
    setEditUser(null);
    setOpen(true);
  };

  const handleEdit = async (userId: number) => {
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

  const handleSave = async (data: UserPayload) => {
    try {
      setSaving(true);

      if (editUser) {
        await updateUser(editUser.id, data);
        await loadUsers();
        showToast("User updated successfully", "success");
      } else {
        await createUser(data);
        await loadUsers();
        showToast("User created successfully", "success");
      }

      closeModal();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;

    try {
      setDeleting(true);
      await deleteUser(deleteCandidate.id);
      await loadUsers();
      setDeleteCandidate(null);

      if (editUser?.id === deleteCandidate.id) {
        closeModal();
      }

      showToast("User deleted successfully", "success");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setDeleting(false);
    }
  };

  const handlePasswordChange = async (payload: ChangePasswordPayload) => {
    if (!passwordUser) return;

    try {
      setPasswordChanging(true);
      await changeUserPassword(passwordUser.id, payload);
      showToast("Password changed successfully", "success");
      closePasswordModal();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
      throw error;
    } finally {
      setPasswordChanging(false);
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
          String(user.branchId),
          user.statusLabel ?? "",
          user.isMaster ? "yes" : "no",
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
          actionLabel="+ Add User"
          onAction={openCreateModal}
          columns={[
            { header: "#", accessor: "id" },
            { header: "User Name", accessor: "name" },
            {
              header: "Branch",
              accessor: "branchName",
              render: (row) => <span>{row.branchName || row.branchId || "-"}</span>,
            },
            {
              header: "Status",
              accessor: "isActive",
              render: (row) => <StatusBadge status={row.isActive ? "active" : "inactive"} />,
            },
            {
              header: "Master",
              accessor: "isMaster",
              render: (row) => <span>{row.isMaster ? "Yes" : "No"}</span>,
            },
            {
              header: "Actions",
              accessor: "id",
              render: (row) => (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleEdit(row.id)}
                    className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10"
                    aria-label={`Edit ${row.name}`}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleOpenPasswordModal(row.id)}
                    className="inline-flex rounded-lg p-2 text-blue-600 hover:bg-blue-50"
                    aria-label={`Change password for ${row.name}`}
                  >
                    <KeyRound size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteCandidate(row)}
                    className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50"
                    aria-label={`Delete ${row.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      <Modal isOpen={open} onClose={closeModal} title="User">
        {detailLoading ? (
          <div className="py-8">
            <Loader text="Loading user details..." />
          </div>
        ) : (
          <UserForm
            key={editUser?.id ?? "new-user"}
            initialData={editUser}
            onSubmit={handleSave}
            onCancel={closeModal}
            submitting={saving}
            onDelete={editUser ? () => setDeleteCandidate(editUser) : undefined}
            deleting={deleting}
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
