import { Pencil, Trash2 } from "lucide-react";
import { RecordTableCard } from "../../../../components/common";
import type { ProductListItem } from "../types";
import { formatCurrency } from "../../../../utils/formatters";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import { resolveImageUrl } from "../../../../utils/imageUtils";

interface ProductListCardProps {
  records: ProductListItem[];
  loading?: boolean;
  onEdit?: (record: ProductListItem) => void;
  onDelete?: (record: ProductListItem) => void;
}

const ProductListCard = ({
  records,
  loading = false,
  onEdit,
  onDelete,
}: ProductListCardProps) => {
  const decimalPart = useAppSelector(selectDecimalPart);

  return (
    <RecordTableCard
      title="Saved Product List"
      data={records}
      loading={loading}
      rowKey="productId"
      columns={[
        { header: "S No", accessor: "sNo" },
        { 
          header: "Product Name", 
          accessor: "name",
          align: "left",
          render: (row: ProductListItem) => {
            const imageSrc = resolveImageUrl(row.imageUrl || row.imagePath || row.fileUrl || row.filePath);
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
          }
        },
        { header: "Code", accessor: "code" },
        { header: "Barcode", accessor: "barcode" },
        { header: "Category", accessor: "category" },
        { header: "Group", accessor: "group" },
        { header: "Unit", accessor: "unit" },
        { 
          header: "Cost", 
          accessor: "cost",
          align: "right",
          render: (row: ProductListItem) => formatCurrency(row.cost, decimalPart)
        },
        { 
          header: "Price", 
          accessor: "price",
          align: "right",
          render: (row: ProductListItem) => formatCurrency(row.price, decimalPart)
        },
        {
          header: "Actions",
          accessor: "productId",
          render: (row) => (
            <div className="flex gap-2 justify-center">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(row)}
                  className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10"
                  aria-label={`Edit ${row.name}`}
                >
                  <Pencil size={16} />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(row)}
                  className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50"
                  aria-label={`Delete ${row.name}`}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ),
        },
      ]}
    />
  );
};

export default ProductListCard;
