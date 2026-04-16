import type { ReactNode } from "react";
import { ToastProvider } from "./ToastProvider";

import { Provider } from "react-redux";
import { store } from "../store";

interface AppProvidersProps {
  children: ReactNode;
}

const AppProviders = ({ children }: AppProvidersProps) => {
  return (
    <Provider store={store}>
      <ToastProvider>{children}</ToastProvider>
    </Provider>
  );
};

export default AppProviders;
