import { useEffect, type ReactNode } from "react";
import { ToastProvider } from "./ToastProvider";
import { Provider } from "react-redux";
import { store } from "../store";
import { useAppDispatch } from "../hooks";
import { tokenRefreshed } from "../../features/auth/store/authSlice";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

interface AppProvidersProps {
  children: ReactNode;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const AuthTokenListener = () => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const handleRefreshed = (event: Event) => {
      const customEvent = event as CustomEvent<{
        accessToken: string;
        refreshToken?: string;
        sessionExpiresAt?: string;
      }>;
      if (customEvent.detail) {
        dispatch(tokenRefreshed(customEvent.detail));
      }
    };

    window.addEventListener("auth:token-refreshed", handleRefreshed);
    return () => {
      window.removeEventListener("auth:token-refreshed", handleRefreshed);
    };
  }, [dispatch]);

  return null;
};

const AppProviders = ({ children }: AppProvidersProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <AuthTokenListener />
        <ToastProvider>{children}</ToastProvider>
      </Provider>
    </QueryClientProvider>
  );
};

export default AppProviders;
