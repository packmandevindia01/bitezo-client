import { Pencil, Trash2 } from "lucide-react";
import { RecordTableCard, ListHeader } from "../../../../components/common";
import type { SubCategoryListItem } from "../types";

interface Props {
  subCategories: SubCategoryListItem[];
  search: string;
  onSearchChange: (value: string) => void;
  onAdd?: () => void;
  onEdit?: (record: SubCategoryListItem) => void;
  onDelete?: (record: SubCategoryListItem) => void;
  loading?: boolean;
}

const SubCategoryTable = ({
  subCategories,
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
        searchPlaceholder="Search sub categories..."
        autoFocusSearch
        canAdd={!!onAdd}
        onAdd={onAdd}
      />
      <RecordTableCard
        title="Saved Sub Category List"
        rowKey="id"
        data={subCategories}
        loading={loading}
        columns={[
        { header: "Code", accessor: "code" },
        { header: "Sub Category", accessor: "name" },
        {
          header: "Arabic",
          accessor: "arabicName",
          render: (row) => row.arabicName || "-",
        },
        { header: "Category", accessor: "categoryName" },
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

export default SubCategoryTable;
