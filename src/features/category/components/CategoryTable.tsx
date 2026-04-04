import { Pencil, Trash2 } from "lucide-react";
import { RecordTableCard } from "../../../components/common";
import type { CategoryRecord } from "../types";

interface Props {
  categories: CategoryRecord[];
  search: string;
  onSearchChange: (value: string) => void;
  onAdd: () => void;
  onEdit: (record: CategoryRecord) => void;
  onDelete: (id: number) => void;
}

const CategoryTable = ({ categories, search, onSearchChange, onAdd, onEdit, onDelete }: Props) => {
  return (
    <RecordTableCard
      title="Saved Category List"
      search={search}
      onSearchChange={onSearchChange}
      rowKey="id"
      data={categories}
      actionLabel="+ Add Category"
      onAction={onAdd}
      columns={[
        { header: "Code", accessor: "code" },
        { header: "Category Name", accessor: "name" },
        {
          header: "Branches",
          accessor: "branches",
          render: (row) => row.branches.join(", ") || "Not allocated",
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

export default CategoryTable;
