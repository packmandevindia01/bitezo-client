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
    <div className="flex flex-wrap items-center gap-4 md:gap-8">
      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold uppercase tracking-wide text-[#5d3b4f] shrink-0">
          Section
        </label>
        <select
          value={selectedSectionId ?? ""}
          onChange={(e) => onSectionChange(e.target.value)}
          className="h-12 w-48 md:w-64 rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 outline-none transition focus:border-[#49293e] focus:ring-4 focus:ring-[#49293e]/10 shadow-sm"
          disabled={loading}
        >
          <option value="">
            {loading ? "Loading..." : "Select Section"}
          </option>
          {sections.map(section => (
            <option key={section.sectionId} value={section.sectionId}>
              {section.name || section.sectionName}
            </option>
          ))}
        </select>
      </div>
      
      <Button 
        onClick={onAdd}
        className="h-12 min-w-[140px] shadow-md active:translate-y-0.5 rounded-xl font-bold"
        disabled={loading || sections.length === 0}
        size="lg"
      >
        {loading ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Plus size={18} className="mr-2" />}
        Add Table
      </Button>
    </div>
  );
};

export default TableSectionSelector;
