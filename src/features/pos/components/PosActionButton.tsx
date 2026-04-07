import type { ReactNode } from "react";

interface PosActionButtonProps {
  children: ReactNode;
  active?: boolean;
  accent?: "brand" | "neutral" | "warning";
  onClick?: () => void;
  className?: string;
}

const accentStyles = {
  brand:
    "border-[#49293e]/20 bg-[#49293e] text-white shadow-[0_10px_25px_-18px_rgba(73,41,62,0.9)]",
  neutral: "border-slate-200 bg-white text-slate-700 hover:border-[#49293e]/20 hover:text-[#49293e]",
  warning:
    "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100",
};

const activeStyles = {
  brand: "border-transparent bg-[#49293e] text-white",
  neutral: "border-[#49293e] bg-[#49293e]/8 text-[#49293e]",
  warning: "border-amber-400 bg-amber-100 text-amber-800",
};

const PosActionButton = ({
  children,
  active = false,
  accent = "neutral",
  onClick,
  className = "",
}: PosActionButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold transition ${active ? activeStyles[accent] : accentStyles[accent]} ${className}`}
    >
      {children}
    </button>
  );
};

export default PosActionButton;
