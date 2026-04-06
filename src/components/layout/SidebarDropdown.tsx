import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface Props {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
  nested?: boolean;
  defaultOpen?: boolean;
}

const SidebarDropdown = ({
  icon,
  label,
  children,
  nested = false,
  defaultOpen = false,
}: Props) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <div
        onClick={() => setOpen((current) => !current)}
        className={`
          flex cursor-pointer items-center justify-between transition-all duration-200 hover:bg-gray-100
          ${nested ? "mx-2 rounded-md px-4 py-2 text-sm" : "px-4 py-3"}
          ${open ? "bg-gray-100 text-[#49293e]" : ""}
        `}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0">{icon}</span>
          <span className="min-w-0 break-words font-medium">{label}</span>
        </div>

        <ChevronDown
          size={16}
          className={`transition-transform duration-300 ${open ? "rotate-180 text-[#49293e]" : ""}`}
        />
      </div>

      <div
        className={`grid overflow-hidden transition-all duration-300 ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div
          className={`min-h-0 flex flex-col text-gray-600 ${
            nested ? "ml-4 border-l border-gray-200 pl-2 text-sm md:ml-5" : "ml-6 text-sm md:ml-8"
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default SidebarDropdown;
