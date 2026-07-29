import { Plus } from "lucide-react";
import { Button, SelectInput } from "../../../../components/common";
import type { SectionRecord } from "../../section/types";

interface TableSectionSelectorProps {
  sections: SectionRecord[];
  selectedSectionId: number | null;
  loading: boolean;
  onSectionChange: (value: string) => void;
  onAdd?: () => void;
  onAddSection?: () => void;
}

const TableSectionSelector = ({
  sections,
  selectedSectionId,
  loading,
  onSectionChange,
  onAdd,
  onAddSection
}: TableSectionSelectorProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4 pb-2 border-b border-gray-100">
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 whitespace-nowrap">
          Section
        </label>
        <div className="flex-1 sm:w-48 md:w-64 flex items-center gap-2">
          <div className="flex-1">
            <SelectInput
              value={selectedSectionId !== null ? String(selectedSectionId) : ""}
              onChange={(e) => onSectionChange(e.target.value)}
              placeholder={loading ? "Loading..." : "Select Section"}
              noMargin
              disabled={loading}
              options={sections.map(section => ({
                value: String(section.sectionId),
                label: section.name || (section as any).sectionName as string
              }))}
            />
          </div>
          {onAddSection && (
            <button
              onClick={onAddSection}
              disabled={loading}
              className="h-[42px] w-[42px] flex-shrink-0 flex items-center justify-center bg-[#49293e] hover:bg-[#3d2234] text-white rounded-[10px] transition-colors"
            >
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>
      
      {onAdd && (
        <Button 
          onClick={onAdd}
          isAction
          className="w-full sm:w-auto"
          disabled={loading || sections.length === 0}
          icon={<Plus size={18} />}
        >
          Add Table
        </Button>
      )}
    </div>
  );
};

export default TableSectionSelector;
