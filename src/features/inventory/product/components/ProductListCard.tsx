import { Pencil, Trash2 } from "lucide-react";
import { RecordTableCard } from "../../../../components/common";
import type { ProductListItem } from "../types";

interface ProductListCardProps {
  records: ProductListItem[];
  search: string;
  loading?: boolean;
  onSearchChange: (value: string) => void;
  onAdd: () => void;
  onEdit: (record: ProductListItem) => void;
  onDelete: (record: ProductListItem) => void;
}

const ProductListCard = ({
  records,
  search,
  loading = false,
  onSearchChange,
  onAdd,
  onEdit,
  onDelete,
}: ProductListCardProps) => {
  return (
    <RecordTableCard
      title="Saved Product List"
      search={search}
      onSearchChange={onSearchChange}
      data={records}
      loading={loading}
      rowKey="productId"
      actionLabel="+ Add Product"
      onAction={onAdd}
      columns={[
        { header: "S No", accessor: "sNo" },
        { header: "Product Name", accessor: "name" },
        { header: "Code", accessor: "code" },
        { header: "Category", accessor: "category" },
        { header: "Group", accessor: "group" },
        { header: "Unit", accessor: "unit" },
        { header: "Cost", accessor: "cost" },
        {
          header: "Actions",
          accessor: "productId",
          render: (row) => (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onEdit(row)}
                className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10"
                aria-label={`Edit ${row.name}`}
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={() => onDelete(row)}
                className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50"
                aria-label={`Delete ${row.name}`}
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

export default ProductListCard;
