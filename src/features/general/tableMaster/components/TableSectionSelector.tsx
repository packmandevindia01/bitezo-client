import { Plus, Loader2 } from "lucide-react";
import { Button } from "../../../../components/common";

interface TableSectionSelectorProps {
  sections: any[];
  selectedSectionId: number | null;
  loading: boolean;
  onSectionChange: (value: string) => void;
  onAdd: () => void;
}

const TableSectionSelector = ({
  sections,
  selectedSectionId,
  loading,
  onSectionChange,
  onAdd
}: TableSectionSelectorProps) => {
  return (
    <div className="flex flex-wrap items-center gap-6 md:gap-12">
      <label className="text-sm font-semibold uppercase tracking-wide text-[#5d3b4f]">
        Section
      </label>
      <select
        value={selectedSectionId ?? ""}
        onChange={(e) => onSectionChange(e.target.value)}
        className="h-10 w-64 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 outline-none transition focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20"
        disabled={loading}
      >
        {sections.map(section => (
          <option key={section.sectionId} value={section.sectionId}>
            {section.name || section.sectionName}
          </option>
        ))}
      </select>
      
      <Button 
        onClick={onAdd}
        className="h-10 min-w-[140px] shadow-sm active:translate-y-0"
        disabled={loading || sections.length === 0}
      >
        {loading ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Plus size={18} className="mr-2" />}
        Add Table
      </Button>
    </div>
  );
};

export default TableSectionSelector;
