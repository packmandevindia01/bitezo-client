import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import UserForm from "../components/UserForm";
import {
  ConfirmDialog,
  Modal,
  PageShell,
  RecordTableCard,
  StatusBadge,
} from "../../../../components/common";
import type { User } from "../types";

const UserList = () => {
  const [users, setUsers] = useState<User[]>([
    {
      id: 1,
      name: "John",
      email: "john@mail.com",
      branch: "Calicut",
      active: true,
      isMaster: false,
    },
  ]);
  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const handleSave = (data: Omit<User, "id">) => {
    if (editUser) {
      setUsers((prev) => prev.map((user) => (user.id === editUser.id ? { ...data, id: user.id } : user)));
    } else {
      setUsers((prev) => [...prev, { ...data, id: Date.now() }]);
    }

    setOpen(false);
    setEditUser(null);
  };

  const confirmDelete = () => {
    if (deleteId !== null) {
      setUsers((prev) => prev.filter((user) => user.id !== deleteId));
      setDeleteId(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;

    return [user.name, user.email, user.branch].some((value) => value.toLowerCase().includes(query));
  });

  return (
    <PageShell
      title="User Management">
      <RecordTableCard
        title="Saved User List"
        search={search}
        onSearchChange={setSearch}
        rowKey="id"
        data={filteredUsers}
        actionLabel="+ Add User"
        onAction={() => {
          setEditUser(null);
          setOpen(true);
        }}
        columns={[
          { header: "#", accessor: "id" },
          { header: "User Name", accessor: "name" },
          { header: "Email", accessor: "email" },
          { header: "Branch", accessor: "branch" },
          {
            header: "Status",
            accessor: "active",
            render: (row) => <StatusBadge status={row.active ? "active" : "inactive"} />,
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
                  onClick={() => {
                    setEditUser(row);
                    setOpen(true);
                  }}
                  className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10"
                  aria-label={`Edit ${row.name}`}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteId(row.id)}
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

      <Modal isOpen={open} onClose={() => setOpen(false)} title="User">
        <UserForm
          key={editUser?.id ?? "new-user"}
          initialData={editUser}
          onSubmit={handleSave}
          onCancel={() => setOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onCancel={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        message="Are you sure you want to delete this user?"
      />
    </PageShell>
  );
};

export default UserList;

