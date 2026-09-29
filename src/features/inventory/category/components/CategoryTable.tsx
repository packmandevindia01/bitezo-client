import { Pencil, Trash2 } from "lucide-react";
import { RecordTableCard, ListHeader, StatusBadge } from "../../../../components/common";
import type { CategoryListItem } from "../types";
import { resolveImageUrl } from "../../../../utils/imageUtils";

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
        {
          header: "Category Name",
          accessor: "name",
          render: (row) => {
            const imageSrc = resolveImageUrl(row.imageUrl || row.imagePath || row.categoryImage || row.fileUrl || row.filePath);
            return (
              <div className="flex items-center gap-3">
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={row.name}
                    className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0">
                    {row.name ? row.name.substring(0, 2).toUpperCase() : "--"}
                  </div>
                )}
                <span className="font-semibold text-gray-800">{row.name}</span>
              </div>
            );
          },
        },
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