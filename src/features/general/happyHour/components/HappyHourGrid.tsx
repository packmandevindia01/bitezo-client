import { useEffect } from "react";
import { Trash2 } from "lucide-react";
import { Table } from "../../../../components/common";
import { useCurrency } from "../../../../hooks/useCurrency";
import type { HappyHourEntry } from "../types";

interface Props {
  entries: HappyHourEntry[];
  onRemove: (productId: number, unitId: number) => void;
  onUpdatePrice?: (productId: number, unitId: number, newPrice: number) => void;
  onEdit?: (entry: HappyHourEntry) => void;
  focusedEntryKey?: string | null;
}

const HappyHourGrid = ({
  entries,
  onRemove,
  onUpdatePrice,
  onEdit,
  focusedEntryKey,
}: Props) => {
  const { decimalPart } = useCurrency();

  useEffect(() => {
    if (!focusedEntryKey) return;

    const focusTimer = window.setTimeout(() => {
      const focusedRow = document.querySelector<HTMLTableRowElement>(
        `tr[data-row-key="${focusedEntryKey}"]`
      );
      if (!focusedRow) return;

      focusedRow.focus();
      focusedRow.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 0);

    return () => window.clearTimeout(focusTimer);
  }, [entries.length, focusedEntryKey]);
  return (
  <div className="flex-1 min-h-[400px]">
    <Table<HappyHourEntry>
      data={entries}
      onRowDoubleClick={onEdit}
      rowKey={(row) => `${row.productId}-${row.unitId}`}
      rowClassName={(row) =>
        focusedEntryKey === `${row.productId}-${row.unitId}`
          ? "bg-[#49293e]/10 ring-2 ring-inset ring-[#49293e]/40"
          : ""
      }
      columns={[
        {
          header: "SNo",
          accessor: "productId" as any,
          align: "center",
          render: (row) => (
            <span className="text-gray-500 font-medium text-xs">
              {entries.findIndex(e => e.productId === row.productId && e.unitId === row.unitId) + 1}
            </span>
          ),
        },
        {
          header: "Product",
          accessor: "productName",
          render: (row) => (
            <div>
              <span className="font-bold text-gray-800 text-sm">{row.productName}</span>
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
          header: (
            <div className="flex justify-end items-center w-full px-1">
              <span>Price</span>
            </div>
          ),
          accessor: "price",
          align: "right",
          render: (row) => (
            <div className="flex items-center justify-end">
              <input
                  id={`hh-price-${row.productId}-${row.unitId}`}
                  aria-label={`Price for ${row.productName}`}
                  type="number"
                  value={row.price ?? 0}
                  style={{ textAlign: 'right' }}
                  onChange={(e) => onUpdatePrice?.(row.productId, row.unitId, Number(e.target.value))}
                  className="w-24 font-bold text-gray-900 bg-transparent border-b border-dashed border-gray-300 focus:border-pos-primary outline-none text-xs"
              />
            </div>
          ),
        },
        {
          header: "Incl/Excl",
          accessor: "isIncl",
          align: "center",
          render: (row) => (
            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
              row.isIncl 
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                : 'bg-amber-50 text-amber-600 border-amber-100'
            }`}>
              {row.isIncl ? 'Incl' : 'Excl'}
            </span>
          ),
        },
        {
          header: (
            <div className="flex justify-end items-center w-full px-1">
              <span>Disc(%)</span>
            </div>
          ),
          accessor: "discountPercentage",
          align: "right",
          render: (row) => (
            <span className="block text-gray-600 font-bold text-sm" style={{ textAlign: 'right' }}>{row.discountPercentage}%</span>
          ),
        },
        {
          header: (
            <div className="flex justify-end items-center w-full px-1">
              <span>Disc</span>
            </div>
          ),
          accessor: "discountValue",
          align: "right",
          render: (row) => (
            <span className="block text-gray-600 font-medium text-sm" style={{ textAlign: 'right' }}>{row.discountValue.toFixed(decimalPart)}</span>
          ),
        },
        {
          header: (
            <div className="flex justify-end items-center w-full px-1">
              <span>Promo Price</span>
            </div>
          ),
          accessor: "promoPrice",
          align: "right",
          render: (row) => (
            <span className="block font-black text-pos-primary text-xl" style={{ textAlign: 'right' }}>{row.promoPrice.toFixed(decimalPart)}</span>
          ),
        },
        {
          header: "Action",
          accessor: "productId",
          align: "center",
          render: (row) => (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(row.productId, row.unitId);
              }}
              onDoubleClick={(e) => e.stopPropagation()}
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
};

export default HappyHourGrid;
