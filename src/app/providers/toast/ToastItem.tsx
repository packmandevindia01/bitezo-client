import { X } from "lucide-react";
import { STYLES, ICONS, DEFAULT_TITLES } from "./toast-constants";
import type { Toast } from "../toast-context";

export type ToastWithState = Toast & { removing?: boolean };

interface ToastItemProps {
  toast: ToastWithState;
  onRemove: (id: number) => void;
}

const ToastItem = ({ toast, onRemove }: ToastItemProps) => {
  const s = STYLES[toast.type];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "16px",
        background: s.background,
        border: `1.5px solid ${s.border}`,
        borderRadius: "16px",
        padding: "20px 22px",
        width: "100%",
        boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
        animation: toast.removing
          ? "toastOut 0.25s ease forwards"
          : "toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: "46px",
          height: "46px",
          borderRadius: "50%",
          background: s.iconBg,
          color: s.icon,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {ICONS[toast.type]}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, paddingTop: "2px" }}>
        <p
          style={{
            margin: 0,
            fontSize: "17px",
            fontWeight: 700,
            color: s.title,
            letterSpacing: "-0.01em",
          }}
        >
          {toast.title ?? DEFAULT_TITLES[toast.type]}
        </p>
        <p
          style={{
            margin: "5px 0 0",
            fontSize: "15px",
            color: "#475569",
            lineHeight: 1.6,
          }}
        >
          {toast.message}
        </p>
      </div>

      {/* Close button */}
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "#94a3b8",
          padding: "2px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          borderRadius: "6px",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "#475569")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
      >
        <X size={18} />
      </button>

      {/* Progress bar at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: "3px",
          borderRadius: "0 0 16px 16px",
          background: s.progress,
          animation: "progress 3s linear forwards",
        }}
      />
    </div>
  );
};

export default ToastItem;
