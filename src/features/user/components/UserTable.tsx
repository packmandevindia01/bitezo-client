import { useNavigate } from "react-router-dom";
import { Table, Button, StatusBadge } from "../../../components/common";
import type { Column } from "../../../components/common/Table";

interface User {
  id: number;
  name: string;
  email: string;
  branch: string;
  active: boolean;
  isMaster: boolean;
}

interface Props {
  users: User[];
}

const UserTable = ({ users }: Props) => {
  const navigate = useNavigate();

  const columns: Column<User>[] = [
    { header: "#", accessor: "id" },

    { header: "User Name", accessor: "name" },

    { header: "Email", accessor: "email" },

    { header: "Branch", accessor: "branch" },

    {
      header: "Status",
      accessor: "active",
      render: (row: User) => (
        <StatusBadge status={row.active ? "active" : "inactive"} />
      ),
    },

    {
      header: "Master",
      accessor: "isMaster",
      render: (row: User) => (
        <span className="text-xs sm:text-sm">
          {row.isMaster ? "Yes" : "No"}
        </span>
      ),
    },

    {
      header: "Actions",
      accessor: "id",
      render: () => (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button size="sm" variant="secondary" fullWidth>
            Edit
          </Button>
          <Button size="sm" variant="danger" fullWidth>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white p-4 sm:p-5 rounded-xl shadow-md">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">

        <h2 className="text-base sm:text-lg font-semibold">
          Users List
        </h2>

        <Button
          onClick={() => navigate("/dashboard/user/create")}
          className="w-full sm:w-auto"
        >
          + Create User
        </Button>

      </div>

      {/* TABLE */}
      <Table columns={columns} data={users} />

    </div>
  );
};

export default UserTable;