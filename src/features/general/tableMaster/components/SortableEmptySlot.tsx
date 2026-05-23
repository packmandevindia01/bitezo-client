import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableEmptySlotProps {
  id: string | number;
}

const SortableEmptySlot = ({ id }: SortableEmptySlotProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`h-22 w-full rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center transition-colors duration-200 ${
        isDragging ? "border-[#49293e] bg-[#49293e]/5 cursor-grabbing" : "hover:border-gray-300 hover:bg-gray-50 cursor-grab"
      }`}
    >
      <span className="text-[10px] font-semibold tracking-wider text-gray-300 uppercase">
        Empty Slot
      </span>
    </div>
  );
};

export default SortableEmptySlot;
