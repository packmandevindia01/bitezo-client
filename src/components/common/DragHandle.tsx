import { GripVertical } from "lucide-react";

interface Props {
  size?: number;
  className?: string;
  listeners?: Record<string, any>;
  attributes?: Record<string, any>;
}

const DragHandle = ({ size = 15, className, listeners, attributes }: Props) => (
  <button
    {...attributes}
    {...listeners}
    tabIndex={-1}
    className={`text-gray-300 hover:text-[#49293e] cursor-grab active:cursor-grabbing transition shrink-0 ${className ?? ""}`}
  >
    <GripVertical size={size} />
  </button>
);

export default DragHandle;