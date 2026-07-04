import { Pencil, Trash2 } from "lucide-react";
import { RecordTableCard, StatusBadge } from "../../../../components/common";
import type { EmployeeRecord } from "../types";

interface Props {
  employees: EmployeeRecord[];
  onEdit?: (record: EmployeeRecord) => void;
  onDelete?: (record: EmployeeRecord) => void;
  loading?: boolean;
}

const EmployeeTable = ({
  employees,
  onEdit,
  onDelete,
  loading = false,
}: Props) => {
  return (
    <RecordTableCard
      title="Saved Employee List"
      rowKey="id"
      data={employees}
      loading={loading}
      columns={[
        { header: "Name", accessor: "name", align: "center" },
        { header: "Code", accessor: "code", align: "center" },
        { header: "Branch", accessor: "branch", align: "center" },
        {
          header: "Status",
          accessor: "active",
          align: "center",
          render: (row) => (
            <StatusBadge
              status={row.active ? "active" : "inactive"}
              label={row.active ? "Active" : "Inactive"}
            />
          ),
        },
        {
          header: "Actions",
          accessor: "id",
          align: "center",
          render: (row) => (
            <div className="flex justify-center gap-2">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(row)}
                  className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10 transition-colors"
                >
                  <Pencil size={16} />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(row)}
                  className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ),
        },
      ]}
    />
  );
};

export default EmployeeTable;

