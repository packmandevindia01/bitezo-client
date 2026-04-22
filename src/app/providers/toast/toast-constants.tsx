import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import type { ToastType } from "../toast-context";

export const ICONS: { [key in ToastType]: React.ReactNode } = {
  success: <CheckCircle2 size={22} />,
  error: <XCircle size={22} />,
  warning: <AlertTriangle size={22} />,
  info: <Info size={22} />,
};

export const DEFAULT_TITLES: { [key in ToastType]: string } = {
  success: "Success",
  error: "Error",
  warning: "Warning",
  info: "Info",
};

export type ToastStyle = {
  border: string;
  icon: string;
  iconBg: string;
  title: string;
  progress: string;
  background: string;
};

export const STYLES: { [key in ToastType]: ToastStyle } = {
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
