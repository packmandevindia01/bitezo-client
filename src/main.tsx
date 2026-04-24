import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./app/App";
import AppProviders from "./app/providers/AppProviders";
import ErrorBoundary from "./components/common/ErrorBoundary";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <ErrorBoundary name="Application">
        <App />
      </ErrorBoundary>
    </AppProviders>
  </StrictMode>,
);
