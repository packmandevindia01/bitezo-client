import React, { useState } from "react";
import { ShieldCheck, AlertTriangle, AlertCircle, Calendar, RefreshCw } from "lucide-react";
import { useSubscriptionStatus } from "../hooks/useSubscriptionStatus";

interface SubscriptionStatusBadgeProps {
  theme?: "dark" | "light";
  className?: string;
}

export const SubscriptionStatusBadge: React.FC<SubscriptionStatusBadgeProps> = ({
  theme = "dark",
  className = "",
}) => {
  const {
    data,
    isLoading,
    isExpired,
    daysLeft,
    formattedExpiresAt,
    statusMessage,
    badgeLabel,
    statusVariant,
    refetch,
  } = useSubscriptionStatus();

  const [isDetailOpen, setIsDetailOpen] = useState(false);

  if (isLoading && !data) {
    return null;
  }

  // Color mapping based on status and dark/light theme
  const getBadgeClasses = () => {
    if (theme === "dark") {
      switch (statusVariant) {
        case "danger":
          return "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30";
        case "warning":
          return "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30";
        case "info":
          return "bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30";
        case "success":
        default:
          return "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30";
      }
    } else {
      // Light theme (for Backoffice topbar)
      switch (statusVariant) {
        case "danger":
          return "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100";
        case "warning":
          return "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100";
        case "info":
          return "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100";
        case "success":
        default:
          return "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100";
      }
    }
  };

  const renderIcon = () => {
    const iconSize = 13;
    switch (statusVariant) {
      case "danger":
        return <AlertCircle size={iconSize} className="shrink-0 text-rose-400" />;
      case "warning":
        return <AlertTriangle size={iconSize} className="shrink-0 text-amber-400" />;
      case "info":
      case "success":
      default:
        return <ShieldCheck size={iconSize} className="shrink-0 text-emerald-400" />;
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsDetailOpen(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer select-none shadow-xs ${getBadgeClasses()} ${className}`}
        title={`Subscription: ${statusMessage} (Click for details)`}
      >
        {renderIcon()}
        <span className="hidden sm:inline font-medium">Sub:</span>
        <span className="font-bold">{badgeLabel}</span>
      </button>

      {/* Details Dialog */}
      {isDetailOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setIsDetailOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-gray-100 text-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-xl ${
                    statusVariant === "danger"
                      ? "bg-rose-100 text-rose-600"
                      : statusVariant === "warning"
                      ? "bg-amber-100 text-amber-600"
                      : "bg-emerald-100 text-emerald-600"
                  }`}
                >
                  {statusVariant === "danger" ? (
                    <AlertCircle size={20} />
                  ) : statusVariant === "warning" ? (
                    <AlertTriangle size={20} />
                  ) : (
                    <ShieldCheck size={20} />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Subscription Status</h3>
                  <p className="text-xs text-gray-500">Company License & Plan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => refetch()}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                title="Refresh status"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <span className="text-gray-500 block mb-1">Status Message</span>
                <span
                  className={`font-semibold text-sm ${
                    statusVariant === "danger"
                      ? "text-rose-600"
                      : statusVariant === "warning"
                      ? "text-amber-600"
                      : "text-emerald-700"
                  }`}
                >
                  {statusMessage}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-400 block text-[11px]">Days Remaining</span>
                  <span className="font-bold text-gray-800 text-sm">
                    {isExpired ? "0 (Expired)" : daysLeft > 0 ? `${daysLeft} days` : "Active"}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-gray-400 block text-[11px] flex items-center gap-1">
                    <Calendar size={11} /> Expiry Date
                  </span>
                  <span className="font-bold text-gray-800 text-sm">
                    {formattedExpiresAt || "Unlimited / Active"}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
