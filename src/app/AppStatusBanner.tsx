import { useEffect, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";

/**
 * App-wide status banners:
 * - Offline: the device lost its network, so orders / settles cannot reach the server.
 * - Update: a new build was deployed. The service worker is in "prompt" mode, so the app is never
 *   reloaded by itself in the middle of a shift (open modal / half-entered payment). Staff reload
 *   when they are ready.
 */
const AppStatusBanner = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [needRefresh, setNeedRefresh] = useState(false);
  const updateSWRef = useRef<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    if (updateSWRef.current) return;
    try {
      updateSWRef.current = registerSW({
        onNeedRefresh: () => setNeedRefresh(true),
      });
    } catch (err) {
      console.warn("[PWA] service worker registration failed", err);
    }
  }, []);

  if (isOnline && !needRefresh) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-3 z-[9999] flex flex-col items-center gap-2 px-3">
      {!isOnline && (
        <div
          role="alert"
          className="pointer-events-auto rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg"
        >
          No network connection. Orders and payments cannot be sent until the connection is back.
        </div>
      )}
      {needRefresh && (
        <div
          role="status"
          className="pointer-events-auto flex items-center gap-3 rounded-lg bg-gray-900 px-4 py-2 text-sm text-white shadow-lg"
        >
          <span>A new version is available.</span>
          <button
            type="button"
            className="rounded bg-white px-3 py-1 text-xs font-bold text-gray-900 hover:bg-gray-200"
            onClick={() => {
              void updateSWRef.current?.(true);
            }}
          >
            Reload now
          </button>
          <button
            type="button"
            className="text-xs text-gray-300 hover:text-white"
            onClick={() => setNeedRefresh(false)}
          >
            Later
          </button>
        </div>
      )}
    </div>
  );
};

export default AppStatusBanner;
