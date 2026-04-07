import { createContext } from "react";

export type ToastType = "success" | "error";

export interface Toast {
  message: string;
  type: ToastType;
}

export interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

export const ToastContext = createContext<ToastContextType | null>(null);
