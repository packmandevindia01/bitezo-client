import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableEmptySlotProps {
  id: string | number;
  onClick?: () => void;
}

const SortableEmptySlot = ({ id, onClick }: SortableEmptySlotProps) => {
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
      onClick={onClick}
      className={`h-22 w-full rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center transition-colors duration-200 ${
        isDragging ? "border-[#49293e] bg-[#49293e]/5 cursor-grabbing text-[#49293e]" : "hover:border-[#49293e]/30 hover:bg-[#49293e]/5 text-gray-400 hover:text-[#49293e] cursor-pointer"
      }`}
    >
      <span className="text-[10px] font-bold tracking-wider text-inherit uppercase">
        Empty Slot
      </span>
    </div>
  );
};

export default SortableEmptySlot;
