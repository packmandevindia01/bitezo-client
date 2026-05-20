import type { MenuGroup } from "../../types";

interface PosGroupTabsProps {
  groups: MenuGroup[];
  activeGroupId: number | null;
  onSelect: (groupId: number) => void;
}

const PosGroupTabs = ({
  groups,
  activeGroupId,
  onSelect,
}: PosGroupTabsProps) => {
  if (groups.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-4 bg-white border-b border-slate-100">
      {groups.map((group) => {
        const isActive = group.groupId === activeGroupId;
        return (
          <button
            key={group.groupId}
            onClick={() => onSelect(group.groupId)}
            className={`
              whitespace-normal break-words text-center px-4 py-1.5 rounded-xl text-sm font-bold transition-all flex flex-col items-center justify-center max-w-[160px] shrink-0
              ${isActive 
                ? "bg-[#49293e] text-white shadow-lg" 
                : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200"}
            `}
          >
            <span className="line-clamp-2 break-words leading-tight">{group.groupName}</span>
            {group.arabicName && (
              <span className={`text-[10px] ${isActive ? "text-white/80" : "text-slate-400"} font-medium mt-0.5 line-clamp-2 break-words leading-tight`}>
                {group.arabicName}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default PosGroupTabs;
