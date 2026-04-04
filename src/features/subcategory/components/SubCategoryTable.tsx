import { Pencil, Trash2 } from "lucide-react";
import { RecordTableCard } from "../../../components/common";
import type { SubCategoryRecord } from "../types";

interface Props {
  subCategories: SubCategoryRecord[];
  search: string;
  onSearchChange: (value: string) => void;
  onAdd: () => void;
  onEdit: (record: SubCategoryRecord) => void;
  onDelete: (id: number) => void;
}

const SubCategoryTable = ({
  subCategories,
  search,
  onSearchChange,
  onAdd,
  onEdit,
  onDelete,
}: Props) => {
  return (
    <RecordTableCard
      title="Saved Sub Category List"
      search={search}
      onSearchChange={onSearchChange}
      rowKey="id"
      data={subCategories}
      actionLabel="+ Add Sub Category"
      onAction={onAdd}
      columns={[
        { header: "Code", accessor: "code" },
        { header: "Sub Category", accessor: "name" },
        { header: "Category", accessor: "categoryName" },
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

export default SubCategoryTable;
