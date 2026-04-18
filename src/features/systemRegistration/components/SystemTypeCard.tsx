import { Monitor, LayoutGrid } from "lucide-react";
import type { SystemType } from "../types";

interface Props {
  type: SystemType;
  selected: boolean;
  onClick: () => void;
}

const CONFIG = {
  pos: {
    Icon: Monitor,
    title: "POS Terminal",
    description:
      "This machine is a Point of Sale terminal. It will require a cashier to open and close shifts before accessing the system.",
    tagline: "Requires Cashier In / Out",
    gradient: "from-[#49293e] to-[#7b3f6e]",
    selectedBorder: "border-[#49293e]",
    tagBg: "bg-[#49293e]/10 text-[#49293e]",
  },
  backoffice: {
    Icon: LayoutGrid,
    title: "Back Office",
    description:
      "This machine is a Back Office workstation. It will have full access to management, reports, and master data without shift management.",
    tagline: "Full admin access",
    gradient: "from-slate-600 to-slate-800",
    selectedBorder: "border-slate-600",
    tagBg: "bg-slate-100 text-slate-600",
  },
} as const;

const SystemTypeCard = ({ type, selected, onClick }: Props) => {
  const { Icon, title, description, tagline, gradient, selectedBorder, tagBg } =
    CONFIG[type];

  return (
    <button
      type="button"
      id={`system-type-${type}`}
      onClick={onClick}
      className={`
        group relative w-full rounded-2xl border-2 bg-white p-6 text-left
        transition-all duration-200 hover:shadow-md
        ${selected ? `${selectedBorder} shadow-md` : "border-gray-200 hover:border-gray-300"}
      `}
    >
      {/* Selected indicator */}
      {selected && (
        <span className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-[#49293e]">
          <svg viewBox="0 0 12 10" className="h-3 w-3 fill-none stroke-white stroke-2">
            <polyline points="1,5 4,8 11,1" />
          </svg>
        </span>
      )}

      {/* Icon */}
      <div
        className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-sm`}
      >
        <Icon size={22} />
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>

      {/* Tag */}
      <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tagBg}`}>
        {tagline}
      </span>

      {/* Description */}
      <p className="mt-3 text-sm leading-relaxed text-gray-500">{description}</p>
    </button>
  );
};

export default SystemTypeCard;
