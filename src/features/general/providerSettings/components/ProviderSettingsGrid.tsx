import { Trash2 } from "lucide-react";
import { Table } from "../../../../components/common";
import { useCurrency } from "../../../../hooks/useCurrency";
import type { ProviderSettingEntry } from "../types";

interface Props {
  entries: ProviderSettingEntry[];
  onRemove: (productId: number, unitId: number) => void;
  onEdit?: (entry: ProviderSettingEntry) => void;
}

const ProviderSettingsGrid = ({ entries, onRemove, onEdit }: Props) => {
  const { decimalPart } = useCurrency();
  return (
  <div className="flex-1 min-h-[400px]">
    <Table<ProviderSettingEntry>
      data={entries}
      onRowDoubleClick={onEdit}
      rowKey={(row) => `${row.productId}-${row.unitId}`}
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
              <span className="font-bold text-gray-800">{row.productName}</span>
              <span className="block text-[10px] text-gray-400 font-normal uppercase tracking-tighter">
                {row.altName}
              </span>
            </div>
          ),
        },
        {
          header: "Code",
          accessor: "productCode",
          render: (row) => (
            <span className="text-xs font-bold text-gray-400 uppercase">
              {row.productCode}
            </span>
          ),
        },
        {
          header: "Alt Name",
          accessor: "altName",
          render: (row) => (
            <span className="text-gray-600">{row.altName}</span>
          )
        },
        {
          header: "Tax",
          accessor: "isIncl",
          align: "center",
          render: (row) => (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${row.isIncl ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
               {row.isIncl ? 'Incl' : 'Excl'}
            </span>
          ),
        },
        {
          header: (
            <div className="flex justify-end items-center w-full px-1">
              <span>Excl</span>
            </div>
          ),
          accessor: "exclPrice",
          align: "right",
          render: (row) => (
            <span className="font-bold text-gray-900">{row.exclPrice.toFixed(decimalPart)}</span>
          ),
        },
        {
          header: (
            <div className="flex justify-end items-center w-full px-1">
              <span>Incl</span>
            </div>
          ),
          accessor: "inclPrice",
          align: "right",
          render: (row) => (
            <span className="font-bold text-pos-primary">{row.inclPrice.toFixed(decimalPart)}</span>
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

export default ProviderSettingsGrid;