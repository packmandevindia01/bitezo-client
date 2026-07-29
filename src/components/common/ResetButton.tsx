import React from "react";
import { RotateCcw } from "lucide-react";
import Button from "./Button";

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
  size = 14,
  ...props
}: ResetButtonProps) => {
  return (
    <Button
      onClick={onReset}
      className={`font-semibold ${className}`}
      title={title}
      type="button"
      tabIndex={-1}
      variant="secondary"
      size="sm"
      icon={<RotateCcw size={size} className="transition-transform active:rotate-[-45deg] duration-200" />}
      {...props as any}
    >
      Reset
    </Button>
  );
};

export default ResetButton;
