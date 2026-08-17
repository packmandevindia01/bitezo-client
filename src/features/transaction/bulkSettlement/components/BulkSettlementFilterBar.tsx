import React from "react";
import { Search, CheckSquare, Square } from "lucide-react";
import { Button, SelectInput } from "../../../../components/common";
import type { EntityOption, EntityType } from "../types";

interface BulkSettlementFilterBarProps {
  entityType: EntityType;
  entities: EntityOption[];
  isEntitiesLoading: boolean;
  selectedEntityId: number | null;
  isAllSelected: boolean;
  hasOrders: boolean;
  onEntityTypeChange: (type: EntityType) => void;
  onEntityChange: (id: number | null) => void;
  onSearch: () => void;
  onToggleSelectAll: () => void;
}

export const BulkSettlementFilterBar: React.FC<BulkSettlementFilterBarProps> = ({
  entityType,
  entities,
  isEntitiesLoading,
  selectedEntityId,
  isAllSelected,
  hasOrders,
  onEntityTypeChange,
  onEntityChange,
  onSearch,
  onToggleSelectAll,
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-end bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end flex-1">
        {/* Type Selector (Driver / Provider) */}
        <div className="w-44">
          <SelectInput
            id="bulk-entity-type"
            label="Type"
            value={entityType}
            onChange={(e) => onEntityTypeChange(e.target.value as EntityType)}
            options={[
              { label: "Driver", value: "driver" },
              { label: "Provider", value: "provider" },
            ]}
          />
        </div>

        {/* Entity Selector (Driver / Provider Name) */}
        <div className="w-64 max-w-full">
          <SelectInput
            id="bulk-entity-id"
            label={entityType === "driver" ? "Driver Name" : "Provider Name"}
            autoFocus
            value={selectedEntityId ? String(selectedEntityId) : ""}
            onChange={(e) => onEntityChange(e.target.value ? Number(e.target.value) : null)}
            options={entities.map((ent) => ({
              label: ent.name,
              value: String(ent.id),
            }))}
            placeholder={
              isEntitiesLoading
                ? "Loading..."
                : `Select ${entityType === "driver" ? "Driver" : "Provider"}`
            }
            disabled={isEntitiesLoading || entities.length === 0}
          />
        </div>

        {/* Search Button */}
        <div>
          <Button
            type="button"
            onClick={onSearch}
            icon={<Search size={18} />}
            className="bg-[#49293e] hover:bg-[#382030] text-white"
          >
            SEARCH
          </Button>
        </div>
      </div>

      {/* Check Box All Button */}
      {hasOrders && (
        <div>
          <button
            type="button"
            onClick={onToggleSelectAll}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all h-[38px] ${
              isAllSelected
                ? "bg-[#49293e]/10 text-[#49293e] border-[#49293e]/30"
                : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
            }`}
          >
            {isAllSelected ? (
              <CheckSquare size={18} className="text-[#49293e]" />
            ) : (
              <Square size={18} className="text-gray-400" />
            )}
            Check Box All
          </button>
        </div>
      )}
    </div>
  );
};
