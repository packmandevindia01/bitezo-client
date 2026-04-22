import { Trash2, Loader2 } from "lucide-react";
import type { TableRecord } from "../types";

interface TableCardGridProps {
  tables: TableRecord[];
  selectedId: number | null;
  loading: boolean;
  onEdit: (record: TableRecord) => void;
  onDeleteRequest: (record: TableRecord) => void;
}

const TableCardGrid = ({
  tables,
  selectedId,
  loading,
  onEdit,
  onDeleteRequest
}: TableCardGridProps) => {
  if (loading && tables.length === 0) {
    return (
      <div className="py-12 flex justify-center w-full">
        <Loader2 className="animate-spin text-[#49293e]" size={32} />
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center text-gray-400 w-full">
        No tables found for this section.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {tables.map((table) => (
        <div key={table.tableId} className="group relative">
          <button
            type="button"
            onClick={() => onEdit(table)}
            className={`h-32 w-full rounded-2xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-1 shadow-sm hover:translate-y-[-2px] hover:shadow-md ${
              selectedId === table.tableId
                ? "border-[#49293e] bg-[#49293e] text-white"
                : "border-gray-100 bg-white text-[#49293e] hover:border-[#49293e]/30"
            }`}
            disabled={loading}
          >
            <span className="text-2xl font-bold">{table.tableName}</span>
            <span className={`text-[10px] font-bold uppercase tracking-[0.1em] ${
              selectedId === table.tableId ? "text-white/70" : "text-gray-400"
            }`}>
              {table.chairs} Chairs
            </span>
            <div className={`mt-2 h-1.5 w-1.5 rounded-full ${
              table.isActive ? "bg-green-500" : "bg-red-400"
            }`} />
          </button>
          
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteRequest(table);
            }}
            className="absolute -right-2 -top-2 flex h-8 w-8 scale-0 items-center justify-center rounded-full bg-red-100 text-red-600 shadow-sm transition-transform duration-200 group-hover:scale-100 hover:bg-red-200"
            disabled={loading}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default TableCardGrid;
