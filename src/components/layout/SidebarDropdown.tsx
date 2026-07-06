import { ChevronDown } from "lucide-react";
import { useState } from "react";

// Single consistent accent for ALL nested sub-headings — matches brand #49293e
const NESTED_ACCENT = {
  bg:     "bg-[#49293e]/8",
  text:   "text-[#49293e]",
  border: "border-[#49293e]/25",
  dot:    "bg-[#49293e]",
};

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
  const accent = NESTED_ACCENT;

  // ── Top-level group header (Master / Transaction / Reports / Settings)
  if (!nested) {
    return (
      <div className="mb-0.5">
        <div
          onClick={() => setOpen((c) => !c)}
          className={`
            group flex cursor-pointer items-center justify-between px-4 py-3
            transition-all duration-200 select-none
            hover:bg-[#49293e]/5
            ${open ? "text-[#49293e]" : "text-gray-700"}
          `}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`
                shrink-0 transition-colors duration-200
                ${open ? "text-[#49293e]" : "text-gray-400 group-hover:text-[#49293e]"}
              `}
            >
              {icon}
            </span>
            <span
              className={`
                min-w-0 break-words font-semibold text-sm
                ${open ? "text-[#49293e]" : "text-gray-700 group-hover:text-[#49293e]"}
              `}
            >
              {label}
            </span>
          </div>

          <ChevronDown
            size={15}
            className={`shrink-0 transition-transform duration-300 ${
              open ? "rotate-180 text-[#49293e]" : "text-gray-300 group-hover:text-[#49293e]"
            }`}
          />
        </div>

        {/* Animated expand */}
        <div
          className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0 flex flex-col ml-4 md:ml-5">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // ── Nested sub-heading (General / Order / Inventory / Sales Report / Purchase Report …)
  return (
    <div className="mb-1">
      {/* Brand-tinted pill sub-heading */}
      <div
        onClick={() => setOpen((c) => !c)}
        className={`
          group flex cursor-pointer items-center justify-between
          mx-1 my-0.5 px-3 py-1.5 rounded-md
          transition-all duration-200 select-none
          ${accent.bg} border ${accent.border}
          hover:brightness-95
        `}
      >
        <div className="flex min-w-0 items-center gap-2">
          {/* Brand-tinted dot */}
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 opacity-70 ${accent.dot}`} />
          <span className={`text-[10px] font-bold uppercase tracking-widest ${accent.text}`}>
            {label}
          </span>
        </div>

        <ChevronDown
          size={11}
          className={`shrink-0 transition-transform duration-300 opacity-60 ${accent.text} ${
            open ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Animated children with brand-tinted left border */}
      <div
        className={`grid overflow-hidden transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div
          className={`
            min-h-0 flex flex-col text-gray-600 text-sm
            ml-3 pl-2.5 border-l-2 ${accent.border} my-0.5
          `}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default SidebarDropdown;
