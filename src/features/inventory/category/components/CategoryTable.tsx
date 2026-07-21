import { Pencil, Trash2 } from "lucide-react";
import { RecordTableCard, ListHeader, StatusBadge } from "../../../../components/common";
import type { CategoryListItem } from "../types";

interface Props {
  categories: CategoryListItem[];
  search: string;
  onSearchChange: (value: string) => void;
  onAdd?: () => void;
  onEdit?: (record: CategoryListItem) => void;
  onDelete?: (record: CategoryListItem) => void;
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
    <>
      <ListHeader
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search categories..."
        autoFocusSearch
        canAdd={!!onAdd}
        onAdd={onAdd}
      />
      <RecordTableCard
        title="Saved Category List"
        rowKey="id"
        data={categories}
        loading={loading}
        columns={[
        { header: "Code", accessor: "code" },
        { header: "Category Name", accessor: "name" },
        {
          header: "Status",
          accessor: "isActive",
          render: (row) => (
            <StatusBadge 
              status={row.isActive ? "active" : "inactive"} 
              label={row.isActive ? "Active" : "Inactive"} 
            />
          ),
        },
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
                >
                  <Pencil size={16} />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(row)}
                  className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ),
        },
      ]}
      />
    </>
  );
};

export default CategoryTable;