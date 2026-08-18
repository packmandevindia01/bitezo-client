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
    <div className="flex flex-col md:flex-row gap-3 justify-between items-center bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs shrink-0">
      <div className="flex flex-wrap gap-3 items-center flex-1 w-full">
        {/* Type Selector (Driver / Provider) */}
        <div className="w-36">
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
        <div className="w-60 max-w-full">
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
            disabled={isEntitiesLoading}
          />
        </div>

        {/* Search Button */}
        <div className="pt-5">
          <Button
            type="button"
            onClick={onSearch}
            icon={<Search size={16} />}
            className="bg-[#49293e] hover:bg-[#382030] text-white h-9 px-5 text-xs font-black uppercase tracking-wider"
          >
            SEARCH
          </Button>
        </div>
      </div>

      {/* Check Box All Button */}
      {hasOrders && (
        <div className="shrink-0 pt-5">
          <button
            type="button"
            onClick={onToggleSelectAll}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all h-9 ${
              isAllSelected
                ? "bg-[#49293e] text-white border-[#49293e] shadow-2xs"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
            }`}
          >
            {isAllSelected ? (
              <CheckSquare size={16} className="text-white" />
            ) : (
              <Square size={16} className="text-slate-400" />
            )}
            Check Box All
          </button>
        </div>
      )}
    </div>
  );
};
