import { Pencil, Trash2 } from "lucide-react";
import { RecordTableCard } from "../../../../components/common";
import type { BranchRecord } from "../types";

interface Props {
  branches: BranchRecord[];
  search: string;
  onSearchChange: (value: string) => void;
  onAdd: () => void;
  onEdit: (record: BranchRecord) => void;
  onDelete: (id: number) => void;
}

const BranchTable = ({ branches, search, onSearchChange, onAdd, onEdit, onDelete }: Props) => {
  return (
    <RecordTableCard
      title="Saved Branch List"
      search={search}
      onSearchChange={onSearchChange}
      rowKey="id"
      data={branches}
      actionLabel="+ Add Branch"
      onAction={onAdd}
      columns={[
        { header: "#", accessor: "id" },
        { header: "Branch Name", accessor: "branchName" },
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
                onClick={() => onDelete(row.id)}
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

export default BranchTable;

