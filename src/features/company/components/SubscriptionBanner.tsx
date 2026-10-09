import React, { useState } from "react";
import { AlertCircle, AlertTriangle, X } from "lucide-react";
import { useSubscriptionStatus } from "../hooks/useSubscriptionStatus";

interface SubscriptionBannerProps {
  className?: string;
}

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({ className = "" }) => {
  const { shouldShowBanner, statusMessage, isExpired, daysLeft } = useSubscriptionStatus();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!shouldShowBanner || isDismissed) {
    return null;
  }

  const isCritical = isExpired || (daysLeft > 0 && daysLeft <= 3);

  return (
    <div
      className={`w-full px-4 py-2 flex items-center justify-between text-xs font-semibold shadow-xs transition-all ${
        isCritical
          ? "bg-rose-600 text-white"
          : "bg-amber-500 text-white"
      } ${className}`}
    >
      <div className="flex items-center gap-2 max-w-[90%] truncate">
        {isCritical ? (
          <AlertCircle size={16} className="shrink-0" />
        ) : (
          <AlertTriangle size={16} className="shrink-0" />
        )}
        <span className="truncate">{statusMessage}</span>
      </div>

      <button
        type="button"
        onClick={() => setIsDismissed(true)}
        className="p-1 hover:bg-black/20 rounded-lg transition shrink-0 ml-2"
        title="Dismiss warning for this session"
      >
        <X size={14} />
      </button>
    </div>
  );
};
