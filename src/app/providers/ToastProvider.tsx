import { useState, useCallback } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { ToastContext } from "./toast-context";
import type { Toast, ToastType } from "./toast-context";

const ICONS: { [key in ToastType]: React.ReactNode } = {
  success: <CheckCircle2 size={22} />,
  error: <XCircle size={22} />,
  warning: <AlertTriangle size={22} />,
  info: <Info size={22} />,
};

const DEFAULT_TITLES: { [key in ToastType]: string } = {
  success: "Success",
  error: "Error",
  warning: "Warning",
  info: "Info",
};

type ToastStyle = {
  border: string;
  icon: string;
  iconBg: string;
  title: string;
  progress: string;
  background: string;
};

const STYLES: { [key in ToastType]: ToastStyle } = {
  success: {
    border: "#0F6E56",
    icon: "#0F6E56",
    iconBg: "#E1F5EE",
    title: "#085041",
    progress: "#1D9E75",
    background: "#f0fdf8",
  },
  error: {
    border: "#993C1D",
    icon: "#993C1D",
    iconBg: "#FAECE7",
    title: "#712B13",
    progress: "#D85A30",
    background: "#fff7f4",
  },
  warning: {
    border: "#854F0B",
    icon: "#854F0B",
    iconBg: "#FAEEDA",
    title: "#633806",
    progress: "#EF9F27",
    background: "#fffbf0",
  },
  info: {
    border: "#185FA5",
    icon: "#185FA5",
    iconBg: "#E6F1FB",
    title: "#0C447C",
    progress: "#378ADD",
    background: "#f0f7ff",
  },
};

let _id = 0;

type ToastWithState = Toast & { removing?: boolean };

const ToastItem = ({
  toast,
  onRemove,
}: {
  toast: ToastWithState;
  onRemove: (id: number) => void;
}) => {
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

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastWithState[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((current) =>
      current.map((t) => (t.id === id ? { ...t, removing: true } : t))
    );
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 250);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success", title?: string) => {
      const id = ++_id;
      setToasts((current) => [...current, { id, message, type, title }]);
      setTimeout(() => removeToast(id), 3500);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(20px) scale(0.96); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes toastOut {
          from { opacity: 1; transform: translateX(0) scale(1); }
          to   { opacity: 0; transform: translateX(20px) scale(0.96); }
        }
        @keyframes progress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>

      {children}

      {/* Toast stack — top right */}
      <div
        style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          width: "min(440px, calc(100vw - 48px))",
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: "auto" }}>
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};