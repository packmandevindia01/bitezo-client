import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SectionDropZone } from "../../../components/common";
import SortableRow from "./SortableRow";
import type { LineItem } from "../types";

interface Props {
  section: "header" | "footer";
  lines: LineItem[];
  onUpdate: (id: string, patch: Partial<LineItem>) => void;
  onOpenFont: (id: string) => void;
  disabled?: boolean;
  lastRowKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const PrintSection = ({
  section, lines, onUpdate, onOpenFont, disabled, lastRowKeyDown,
}: Props) => {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {section === "header" ? "Header" : "Footer"} Lines
        <span className="ml-2 text-[10px] text-gray-300 normal-case font-normal">
          ({lines.length})
        </span>
      </p>

      <SectionDropZone
        id={`zone-${section}`}
        isEmpty={lines.length === 0}
        emptyMessage={`Drop ${section} lines here`}
        className="space-y-1 p-1 -m-1"
      >
        <SortableContext
          items={lines.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {lines.map((item, i) => (
            <SortableRow
              key={item.id}
              item={item}
              index={i}
              onChange={(val) => onUpdate(item.id, { value: val })}
              onOffsetChange={(offset) => onUpdate(item.id, { offsetX: offset })}
              onOpenFont={() => onOpenFont(item.id)}
              disabled={disabled}
              onKeyDown={i === lines.length - 1 ? lastRowKeyDown : undefined}
            />
          ))}
        </SortableContext>
      </SectionDropZone>
    </div>
  );
};

export default PrintSection;