import { createContext } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: number;
  message: string;
  title?: string;
  type: ToastType;
}

export interface ToastContextType {
  showToast: (message: string, type?: ToastType, title?: string) => void;
}

export const ToastContext = createContext<ToastContextType | null>(null);