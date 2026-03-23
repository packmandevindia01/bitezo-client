import React from "react";
import Button from "./Button";

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

const EmptyState = ({
  title = "No Data Found",
  description = "There is no data to display.",
  actionLabel,
  onAction,
  icon,
  className = "",
}: EmptyStateProps) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-10 px-4 ${className}`}
    >

      {/* ICON */}
      <div className="w-14 h-14 md:w-16 md:h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        {icon ? (
          icon
        ) : (
          <span className="text-gray-400 text-xl md:text-2xl">📄</span>
        )}
      </div>

      {/* TITLE */}
      <h2 className="text-base md:text-lg font-semibold text-gray-700">
        {title}
      </h2>

      {/* DESCRIPTION */}
      <p className="text-sm md:text-base text-gray-500 mt-1 max-w-sm">
        {description}
      </p>

      {/* ACTION */}
      {actionLabel && (
        <div className="mt-4">
          <Button onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}

    </div>
  );
};

export default EmptyState;