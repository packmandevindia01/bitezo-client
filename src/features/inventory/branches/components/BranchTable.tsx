import { Pencil, Trash2 } from "lucide-react";
import { RecordTableCard, ListHeader } from "../../../../components/common";
import type { BranchRecord } from "../types";

interface Props {
  branches: BranchRecord[];
  search: string;
  onSearchChange: (value: string) => void;
  onAdd?: () => void;
  onEdit?: (record: BranchRecord) => void;
  onDelete?: (record: BranchRecord) => void;
  loading?: boolean;
}

const BranchTable = ({ branches, loading, search, onSearchChange, onAdd, onEdit, onDelete }: Props) => {
  return (
    <>
      <ListHeader
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search branches..."
        autoFocusSearch
        canAdd={Boolean(onAdd)}
        onAdd={onAdd}
      />
      <RecordTableCard
        title=""
        loading={loading}
        rowKey="id"
        data={branches}
        columns={[
          {
            header: "S.No",
            accessor: "id",
            align: "center",
            render: (_, index) => index + 1,
          },
          {
            header: "Branch Name",
            accessor: "branchName",
            align: "center",
          },
          {
            header: "Actions",
            accessor: "id",
            align: "center",
            render: (row) => {
              const isMainBranch = row.id === 2 || (row as any).branchId === 2 || String(row.branchName || "").trim().toLowerCase() === "main";
              return (
                <div className="flex items-center justify-center gap-2">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(row)}
                      className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10 transition-colors"
                      aria-label={`Edit ${row.branchName}`}
                      title="Edit Branch"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      disabled={isMainBranch}
                      onClick={() => !isMainBranch && onDelete(row)}
                      className={`inline-flex rounded-lg p-2 transition-colors ${
                        isMainBranch
                          ? "text-gray-300 cursor-not-allowed opacity-40"
                          : "text-red-500 hover:bg-red-50"
                      }`}
                      aria-label={isMainBranch ? "Main branch cannot be deleted" : `Delete ${row.branchName}`}
                      title={isMainBranch ? "Main branch cannot be deleted" : "Delete Branch"}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              );
            },
          },
        ]}
      />
    </>
  );
};

export default BranchTable;