import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./app/App";
import AppProviders from "./app/providers/AppProviders";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { loadConfig } from "./config";

// Automatic reload on dynamic chunk load failure (e.g. new build deployed on server)
window.addEventListener("vite:preloadError", () => {
  const lastReload = sessionStorage.getItem("vite_preload_reload");
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
    sessionStorage.setItem("vite_preload_reload", now.toString());
    window.location.reload();
  }
});

const init = async () => {
  // Load runtime configuration before anything else
  await loadConfig();

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <AppProviders>
        <ErrorBoundary name="Application">
          <App />
        </ErrorBoundary>
      </AppProviders>
    </StrictMode>,
  );
};

init();

