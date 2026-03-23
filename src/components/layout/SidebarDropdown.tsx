import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface Props {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

const SidebarDropdown = ({ icon, label, children }: Props) => {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {/* HEADER */}
      <div
        onClick={() => setOpen(!open)}
        className={`
          flex justify-between items-center px-4 py-3 cursor-pointer
          transition-all duration-200
          hover:bg-gray-100
          ${open ? "bg-gray-100 text-[#49293e]" : ""}
        `}
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-medium">{label}</span>
        </div>

        <ChevronDown
          size={16}
          className={`
            transition-transform duration-300
            ${open ? "rotate-180 text-[#49293e]" : ""}
          `}
        />
      </div>

      {/* DROPDOWN CONTENT */}
      <div
        className={`
          overflow-hidden transition-all duration-300
          ${open ? "max-h-40" : "max-h-0"}
        `}
      >
        <div className="ml-8 flex flex-col text-sm text-gray-600">

          {children}

        </div>
      </div>
    </div>
  );
};

export default SidebarDropdown;