import { useEffect, type ReactNode } from "react";
import { ToastProvider } from "./ToastProvider";
import { Provider } from "react-redux";
import { store } from "../store";
import { useAppDispatch } from "../hooks";
import { tokenRefreshed } from "../../features/auth/store/authSlice";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useToast } from "./useToast";
import { QUERY_ERROR_EVENT, reportQueryError } from "./queryErrors";
import { setTokenRefresher } from "../../shared/api/http";
import { backofficeRefreshTokenApi, posRefreshTokenApi } from "../../features/auth/services/authApi";

// The shared HTTP client asks the auth feature to rotate tokens on a 401 (registered once, at load).
setTokenRefresher((accessToken, refreshToken, backoffice) =>
  backoffice ? backofficeRefreshTokenApi(accessToken, refreshToken) : posRefreshTokenApi(accessToken, refreshToken)
);

interface AppProvidersProps {
  children: ReactNode;
}

const queryClient = new QueryClient({
  // Every failed data load becomes a visible toast (see queryErrors.ts) instead of an empty screen.
  queryCache: new QueryCache({
    // Only when nothing is on screen yet: background refetches of data already shown (POS menu polls
    // every 30 s) must not raise a toast on every poll while the network is down.
    onError: (error, query) => {
      if (query.state.data !== undefined) return;
      reportQueryError(error, query.meta as Record<string, unknown> | undefined);
    },
  }),
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

/** Shows the toasts requested by reportQueryError (must live inside ToastProvider). */
const QueryErrorToaster = () => {
  const { showToast } = useToast();
  useEffect(() => {
    const onError = (event: Event) => {
      const message = (event as CustomEvent<string>).detail;
      if (message) showToast(message, "error");
    };
    window.addEventListener(QUERY_ERROR_EVENT, onError);
    return () => window.removeEventListener(QUERY_ERROR_EVENT, onError);
  }, [showToast]);
  return null;
};

const AppProviders = ({ children }: AppProvidersProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <AuthTokenListener />
        <ToastProvider>
          <QueryErrorToaster />
          {children}
        </ToastProvider>
      </Provider>
    </QueryClientProvider>
  );
};

export default AppProviders;
