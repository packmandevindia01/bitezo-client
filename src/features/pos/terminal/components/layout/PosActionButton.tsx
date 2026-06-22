import type { ReactNode } from "react";

interface PosActionButtonProps {
  children: ReactNode;
  active?: boolean;
  accent?: "brand" | "neutral" | "warning" | "orange" | "green" | "gray" | "red" | "blue" | "outline";
  onClick?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  noPadding?: boolean;
  title?: string;
}

const accentStyles = {
  brand: "bg-slate-900 text-white shadow-premium hover:bg-slate-800 border-slate-700",
  neutral: "bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50 shadow-sm",
  warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-premium border-amber-600",
  orange: "bg-[#f37021] text-white hover:bg-[#e0661a] shadow-md border-[#d9731d]",
  green: "bg-[#8cc63f] text-white hover:bg-[#7db238] shadow-md border-[#6d9255]",
  gray: "bg-[#b3b3b3] text-white hover:bg-[#a0a0a0] shadow-sm border-[#999999]",
  red: "bg-[#e30613] text-white hover:bg-[#cc0511] shadow-md border-[#b3050f]",
  blue: "bg-[#a6c7e9] text-gray-800 hover:bg-[#8eb6e0] shadow-sm border-[#80a9d4]",
  outline: "bg-white text-slate-600 border-slate-400 hover:bg-slate-50 shadow-sm",
};

const activeStyles = {
  brand: "bg-slate-950 text-white shadow-inner",
  neutral: "bg-slate-100 text-slate-900 border-slate-400 shadow-inner",
  warning: "bg-amber-700 text-white shadow-inner",
  orange: "bg-[#d9731d] text-white shadow-inner",
  green: "bg-[#6d9255] text-white shadow-inner",
  gray: "bg-[#999999] text-white shadow-inner",
  red: "bg-[#b3050f] text-white shadow-inner",
  blue: "bg-[#80a9d4] text-gray-900 shadow-inner",
  outline: "bg-slate-200 text-slate-900 border-slate-500 shadow-inner",
};

const sizeStyles = {
  sm: "h-9 text-xs",
  md: "h-11 text-sm",
  lg: "h-14 text-base",
};

const paddingStyles = {
  sm: "px-3",
  md: "px-6",
  lg: "px-8",
};

const PosActionButton = ({
  children,
  active = false,
  accent = "neutral",
  onClick,
  className = "",
  size = "md",
  noPadding = false,
  title,
}: PosActionButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`
        inline-flex items-center justify-center rounded-lg border-2 
        font-bold tracking-tight uppercase transition-all duration-200 
        active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center justify-center
        ${sizeStyles[size]} 
        ${!noPadding ? paddingStyles[size] : ""}
        ${active ? activeStyles[accent] : accentStyles[accent]} 
        ${className}
      `}
    >
      {children}
    </button>
  );
};

export default PosActionButton;
