import { Trash2 } from "lucide-react";
import { Table, StatusBadge } from "../../../../components/common";
import type { ProviderSettingEntry } from "../types";

interface Props {
  entries: ProviderSettingEntry[];
  onRemove: (productId: number, unitId: number) => void;
}

const ProviderSettingsGrid = ({ entries, onRemove }: Props) => (
  <div className="flex-1 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm max-h-[400px] overflow-y-auto">
    <Table<ProviderSettingEntry>
      data={entries}
      rowKey="productId" // ProductId alone isn't enough, but Table uses it for key. 
      // Actually, productId-unitId would be better.
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
        },
        {
          header: "Tax",
          accessor: "isIncl",
          render: (row) => (
            <StatusBadge
              status={row.isIncl ? "active" : "inactive"}
              label={row.isIncl ? "Included" : "Excluded"}
            />
          ),
        },
        {
          header: "Excl",
          accessor: "exclPrice",
          align: "right",
          render: (row) => (
            <span className="font-bold text-gray-900">{row.exclPrice.toFixed(3)}</span>
          ),
        },
        {
          header: "Incl",
          accessor: "inclPrice",
          align: "right",
          render: (row) => (
            <span className="font-bold text-pos-primary">{row.inclPrice.toFixed(3)}</span>
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

export default ProviderSettingsGrid;