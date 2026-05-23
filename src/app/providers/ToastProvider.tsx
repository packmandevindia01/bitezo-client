import { useState, useCallback } from "react";
import { ToastContext } from "./toast-context";
import type { ToastType } from "./toast-context";
import ToastItem, { type ToastWithState } from "./toast/ToastItem";
import ToastStyles from "./toast/ToastStyles";

let _id = 0;

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
      // Convert 'error' to 'warning' to show all errors as warnings
      const finalType = type === "error" ? "warning" : type;
      const id = ++_id;
      setToasts((current) => [...current, { id, message, type: finalType, title }]);
      setTimeout(() => removeToast(id), 2500);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      <ToastStyles />
      {children}

      <div
        style={{
          position: "fixed",
          bottom: "24px",
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