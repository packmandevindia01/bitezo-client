import { Plus } from "lucide-react";
import { Button, SelectInput } from "../../../../components/common";
import type { SectionRecord } from "../../section/types";

interface TableSectionSelectorProps {
  sections: SectionRecord[];
  selectedSectionId: number | null;
  loading: boolean;
  onSectionChange: (value: string) => void;
  onAdd?: () => void;
}

const TableSectionSelector = ({
  sections,
  selectedSectionId,
  loading,
  onSectionChange,
  onAdd
}: TableSectionSelectorProps) => {
  return (
    <div className="flex items-end justify-between w-full gap-4 pb-2">
      <div className="w-48 md:w-64">
        <SelectInput
          label="Section"
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
      
      {onAdd && (
        <Button 
          onClick={onAdd}
          className="h-10.5 shadow-sm hover:shadow-md transition-all font-bold"
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
