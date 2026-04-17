import { Pencil, Trash2 } from "lucide-react";
import { RecordTableCard } from "../../../../components/common";
import type { ModifierRecord } from "../types";

interface ModifierListCardProps {
  records: ModifierRecord[];
  search: string;
  onSearchChange: (value: string) => void;
  onAdd: () => void;
  onEdit: (record: ModifierRecord) => void;
  onDelete: (record: ModifierRecord) => void;
}

const ModifierListCard = ({
  records,
  search,
  onSearchChange,
  onAdd,
  onEdit,
  onDelete,
}: ModifierListCardProps) => {
  return (
    <RecordTableCard
      title="List Modifiers"
      search={search}
      onSearchChange={onSearchChange}
      data={records}
      rowKey="id"
      actionLabel="+ Add Modifier"
      onAction={onAdd}
      columns={[
        { header: "Name", accessor: "name" },
        { header: "Arabic", accessor: "arabic" },
        { 
          header: "Price", 
          accessor: "price",
          render: (row) => <span>{Number(row.price || 0).toFixed(3)}</span>
        },
        {
          header: "Color",
          accessor: "color",
          render: (row) => (
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-4 w-4 rounded-full border border-gray-300"
                style={{ backgroundColor: row.color || "#cccccc" }}
              />
              <span className="text-xs">{row.color || "None"}</span>
            </div>
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

export default ModifierListCard;

