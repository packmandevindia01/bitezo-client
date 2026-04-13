import { Pencil, Trash2 } from "lucide-react";
import { RecordTableCard } from "../../../../components/common";
import type { EmployeeRecord } from "../types/types";

interface Props {
  employees: EmployeeRecord[];
  search: string;
  onSearchChange: (value: string) => void;
  onAdd: () => void;
  onEdit: (record: EmployeeRecord) => void;
  onDelete: (record: EmployeeRecord) => void;
  loading?: boolean;
}

const EmployeeTable = ({
  employees,
  search,
  onSearchChange,
  onAdd,
  onEdit,
  onDelete,
  loading = false,
}: Props) => {
  return (
    <RecordTableCard
      title="Saved Employee List"
      search={search}
      onSearchChange={onSearchChange}
      rowKey="id"
      data={employees}
      actionLabel="+ Add Employee"
      onAction={onAdd}
      loading={loading}
      columns={[
        { header: "Name", accessor: "name" },
        { header: "Code", accessor: "code" },
        { header: "Branch", accessor: "branch" },
        {
          header: "Status",
          accessor: "active",
          render: (row) => (row.active ? "Active" : "Inactive"),
        },
        {
          header: "Actions",
          accessor: "id",
          render: (row) => (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onEdit(row)}
                className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={() => onDelete(row)}
                className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ),
        },
      ]}
    />
  );
};

export default EmployeeTable;

