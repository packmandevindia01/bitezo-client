import { Trash2 } from "lucide-react";
import { Table } from "../../../../components/common";
import type { HappyHourEntry } from "../types";

interface Props {
  entries: HappyHourEntry[];
  onRemove: (productId: number, unitId: number) => void;
  onUpdatePrice?: (productId: number, unitId: number, newPrice: number) => void;
}

const HappyHourGrid = ({ entries, onRemove, onUpdatePrice }: Props) => (
  <div className="flex-1 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm max-h-[400px] overflow-y-auto">
    <Table<HappyHourEntry>
      data={entries}
      rowKey={(row) => `${row.productId}-${row.unitId}`}
      columns={[
        {
          header: "Product",
          accessor: "productName",
          render: (row) => (
            <div>
              <span className="font-bold text-gray-800">{row.productName}</span>
              <span className="block text-[10px] text-gray-400 font-normal uppercase tracking-tighter">
                {row.altName}
              </span>
            </div>
          ),
        },
        {
          header: "Barcode",
          accessor: "barcode",
          render: (row) => (
            <span className="text-xs font-bold text-gray-400 uppercase">
              {row.barcode}
            </span>
          ),
        },
        {
          header: "Price",
          accessor: "price",
          align: "right",
          render: (row) => (
            <input
                type="number"
                value={row.price}
                onChange={(e) => onUpdatePrice?.(row.productId, row.unitId, Number(e.target.value))}
                className="w-20 text-right font-bold text-gray-900 bg-transparent border-b border-dashed border-gray-300 focus:border-pos-primary outline-none"
            />
          ),
        },
        {
          header: "Disc(%)",
          accessor: "discountPercentage",
          align: "right",
          render: (row) => (
            <span className="text-gray-600">{row.discountPercentage}%</span>
          ),
        },
        {
          header: "Disc",
          accessor: "discountValue",
          align: "right",
          render: (row) => (
            <span className="text-gray-600">{row.discountValue.toFixed(3)}</span>
          ),
        },
        {
          header: "Promo Price",
          accessor: "promoPrice",
          align: "right",
          render: (row) => (
            <span className="font-bold text-pos-primary">{row.promoPrice.toFixed(3)}</span>
          ),
        },
        {
          header: "Action",
          accessor: "productId",
          align: "center",
          render: (row) => (
            <button
              onClick={() => onRemove(row.productId, row.unitId)}
              className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
            >
              <Trash2 size={14} />
            </button>
          ),
        },
      ]}
    />
  </div>
);

export default HappyHourGrid;
