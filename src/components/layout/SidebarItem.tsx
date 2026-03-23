import React from "react";

interface Props {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const SidebarItem = ({ icon, label, active, onClick }: Props) => {
  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-2 md:gap-3
        px-4 py-2 md:py-3
        text-sm md:text-base
        cursor-pointer transition-all

        ${
          active
            ? "bg-[#f5f0f3] text-[#49293e] border-r-4 border-[#49293e] font-medium"
            : "text-gray-700 hover:bg-gray-100"
        }
      `}
    >
      {/* ICON */}
      <span className="flex items-center text-base md:text-lg">
        {icon}
      </span>

      {/* LABEL */}
      <span className="truncate">
        {label}
      </span>
    </div>
  );
};

export default SidebarItem;