import { useDroppable } from "@dnd-kit/core";

interface Props {
  id: string;
  children: React.ReactNode;
  className?: string;
  emptyMessage?: string;
  isEmpty?: boolean;
}

const SectionDropZone = ({ id, children, className, emptyMessage, isEmpty }: Props) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-10 rounded-lg transition-all duration-200
        ${isOver ? "ring-2 ring-[#49293e]/30 bg-[#49293e]/5" : ""}
        ${className ?? ""}
      `}
    >
      {children}
      {isEmpty && (
        <p className="text-xs text-gray-300 text-center py-4 border border-dashed border-gray-200 rounded-lg">
          {emptyMessage ?? "Drop items here"}
        </p>
      )}
    </div>
  );
};

export default SectionDropZone;