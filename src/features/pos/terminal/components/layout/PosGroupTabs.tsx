import React from "react";
import type { PosMenuTime, MenuGroup } from "../../../types";

interface PosGroupTabsProps {
  groups?: MenuGroup[];
  menuTimes?: PosMenuTime[];
  activeGroupId: number | null;
  onSelect: (id: number) => void;
}

const PosGroupTabs = ({
  groups,
  menuTimes,
  activeGroupId,
  onSelect,
}: PosGroupTabsProps) => {
  // Support either menuTimes or legacy groups array
  const items = (menuTimes && menuTimes.length > 0)
    ? menuTimes.map(m => ({ id: m.menuId, name: m.menuName, arabicName: m.arabicName }))
    : (groups ?? []).map(g => ({ id: g.groupId, name: g.groupName, arabicName: g.arabicName }));

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-4 bg-white border-b border-slate-100">
      {items.map((item) => {
        const isActive = item.id === activeGroupId;
        return (
          <button
            type="button"
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`
              whitespace-normal break-words text-center px-4 py-1.5 rounded-xl text-sm font-bold transition-all flex flex-col items-center justify-center max-w-[160px] shrink-0
              ${isActive 
                ? "bg-[#49293e] text-white shadow-lg" 
                : "bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200"}
            `}
          >
            <span className="line-clamp-2 break-words leading-tight">{item.name}</span>
            {item.arabicName && (
              <span className={`text-[10px] ${isActive ? "text-white/80" : "text-slate-400"} font-medium mt-0.5 line-clamp-2 break-words leading-tight`}>
                {item.arabicName}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default React.memo(PosGroupTabs);
