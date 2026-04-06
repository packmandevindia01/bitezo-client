import { Pencil, Trash2 } from "lucide-react";
import { RecordTableCard } from "../../../../components/common";
import type { ProductRecord } from "../types";

interface ProductListCardProps {
  records: ProductRecord[];
  search: string;
  onSearchChange: (value: string) => void;
  onAdd: () => void;
  onEdit: (record: ProductRecord) => void;
  onDelete: (record: ProductRecord) => void;
}

const ProductListCard = ({
  records,
  search,
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
      rowKey="id"
      actionLabel="+ Add Product"
      onAction={onAdd}
      columns={[
        { header: "Product Name", accessor: "productName" },
        { header: "Code", accessor: "productCode" },
        { header: "Category", accessor: "category" },
        { header: "Sub Category", accessor: "subCategory" },
        { header: "Unit", accessor: "unit" },
        { header: "Cost", accessor: "cost" },
        { header: "Branch", accessor: "branch" },
        {
          header: "Status",
          accessor: "isActive",
          render: (row) => (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                row.isActive
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {row.isActive ? "Active" : "Inactive"}
            </span>
          ),
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
                aria-label={`Edit ${row.productName}`}
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={() => onDelete(row)}
                className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50"
                aria-label={`Delete ${row.productName}`}
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

