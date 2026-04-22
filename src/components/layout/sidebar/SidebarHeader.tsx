import { X } from "lucide-react";

interface SidebarHeaderProps {
  systemName: string | null;
  onClose: () => void;
}

const SidebarHeader = ({ systemName, onClose }: SidebarHeaderProps) => {
  return (
    <>
      <div className="flex shrink-0 justify-end p-4 md:hidden">
        <X size={20} onClick={onClose} className="cursor-pointer" />
      </div>

      <div className="flex h-16 shrink-0 items-center border-b border-gray-200 px-4 text-xl font-bold text-[#49293e] md:h-20">
        Bitezo
        {systemName && (
          <span className="ml-2 text-xs font-normal text-gray-400 truncate max-w-[100px]">
            · {systemName}
          </span>
        )}
      </div>
    </>
  );
};

export default SidebarHeader;
