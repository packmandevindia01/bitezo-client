import React from "react";
import { RotateCcw } from "lucide-react";

interface ResetButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onReset: () => void;
  className?: string;
  title?: string;
  size?: number;
}

const ResetButton = ({
  onReset,
  className = "",
  title = "Reset Filters",
  size = 18,
  ...props
}: ResetButtonProps) => {
  return (
    <button
      onClick={onReset}
      className={`p-1.5 text-[#49293e] hover:bg-[#49293e]/10 rounded-full transition-colors z-30 ${className}`}
      title={title}
      type="button"
      tabIndex={-1}
      {...props}
    >
      <RotateCcw size={size} className="transition-transform active:rotate-[-45deg] duration-200" />
    </button>
  );
};

export default ResetButton;
