import { Pencil } from "lucide-react";
import { RecordTableCard } from "../../../../components/common";
import type { BranchRecord } from "../types";

interface Props {
  branches: BranchRecord[];
  search: string;
  onSearchChange: (value: string) => void;
  onAdd: () => void;
  onEdit: (record: BranchRecord) => void;
}

const BranchTable = ({ branches, search, onSearchChange, onAdd, onEdit }: Props) => {
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
                title={
                  row.detailsLoaded
                    ? "Edit branch"
                    : "Branch detail endpoint is required to edit existing records"
                }
              >
                <Pencil size={16} />
              </button>
            </div>
          ),
        },
      ]}
    />
  );
};

export default BranchTable;

