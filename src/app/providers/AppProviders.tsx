import type { ReactNode } from "react";
import { ToastProvider } from "./ToastProvider";

interface AppProvidersProps {
  children: ReactNode;
}

const AppProviders = ({ children }: AppProvidersProps) => {
  return <ToastProvider>{children}</ToastProvider>;
};

export default AppProviders;
