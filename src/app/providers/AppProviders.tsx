import type { ReactNode } from "react";
import { ToastProvider } from "./ToastProvider";

import { Provider } from "react-redux";
import { store } from "../store";

interface AppProvidersProps {
  children: ReactNode;
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppProviders = ({ children }: AppProvidersProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <ToastProvider>{children}</ToastProvider>
      </Provider>
    </QueryClientProvider>
  );
};

export default AppProviders;
