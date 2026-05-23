import { Pencil, Trash2 } from "lucide-react";
import { RecordTableCard } from "../../../../components/common";
import type { BranchRecord } from "../types";

interface Props {
  branches: BranchRecord[];
  search: string;
  onSearchChange: (value: string) => void;
  onAdd?: () => void;
  onEdit?: (record: BranchRecord) => void;
  onDelete?: (record: BranchRecord) => void;
}

const BranchTable = ({ branches, search, onSearchChange, onAdd, onEdit, onDelete }: Props) => {
  return (
    <RecordTableCard
      title=""
      search={search}
      onSearchChange={onSearchChange}
      rowKey="id"
      data={branches}
      actionLabel={onAdd ? "+ Add Branch" : undefined}
      onAction={onAdd}
      columns={[
        { header: "#", accessor: "id", render: (_, index) => index + 1 },
        { header: "Branch Name", accessor: "branchName" },
        {
          header: "Actions",
          accessor: "id",
          render: (row) => (
            <div className="flex gap-2">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(row)}
                  className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10"
                  aria-label={`Edit ${row.branchName}`}
                >
                  <Pencil size={16} />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(row)}
                  className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50"
                  aria-label={`Delete ${row.branchName}`}
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

export default BranchTable;