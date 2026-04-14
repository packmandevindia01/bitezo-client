import { Pencil, Trash2 } from "lucide-react";
import { RecordTableCard } from "../../../../components/common";
import type { CategoryListItem } from "../types";

interface Props {
  categories: CategoryListItem[];
  search: string;
  onSearchChange: (value: string) => void;
  onAdd: () => void;
  onEdit: (record: CategoryListItem) => void;
  onDelete: (record: CategoryListItem) => void;
  loading?: boolean;
}

const CategoryTable = ({
  categories,
  search,
  onSearchChange,
  onAdd,
  onEdit,
  onDelete,
  loading = false,
}: Props) => {
  return (
    <RecordTableCard
      title="Saved Category List"
      search={search}
      onSearchChange={onSearchChange}
      rowKey="id"
      data={categories}
      actionLabel="+ Add Category"
      onAction={onAdd}
      loading={loading}
      columns={[
        { header: "Code", accessor: "code" },
        { header: "Category Name", accessor: "name" },
        {
          header: "Arabic",
          accessor: "arabic",
          render: (row) => row.arabic || "-",
        },
        {
          header: "Status",
          accessor: "isActive",
          render: (row) => (row.isActive ? "Active" : "Inactive"),
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

export default CategoryTable;