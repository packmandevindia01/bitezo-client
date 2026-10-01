/**
 * Cross-tab & local real-time synchronization utility for Employee Master data.
 * Broadcasts updates whenever employees are created, updated, or deleted.
 */

export const EMPLOYEE_SYNC_CHANNEL = "bitezo_employees_sync";
export const EMPLOYEE_STORAGE_KEY = "bitezo_employees_updated_at";

export const notifyEmployeesUpdated = () => {
  const timestamp = Date.now();
  const payload = { type: "EMPLOYEES_UPDATED", timestamp };

  // 1. Cross-tab BroadcastChannel
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(EMPLOYEE_SYNC_CHANNEL);
      channel.postMessage(payload);
      channel.close();
    }
  } catch {
    // Silently continue
  }

  // 2. Cross-tab localStorage fallback (fires 'storage' event in other tabs)
  try {
    localStorage.setItem(EMPLOYEE_STORAGE_KEY, String(timestamp));
  } catch {
    // Silently continue
  }

  // 3. Same-tab DOM CustomEvent
  try {
    window.dispatchEvent(new CustomEvent("employees:updated", { detail: payload }));
  } catch {
    // Silently continue
  }
};

export const subscribeToEmployeeUpdates = (onUpdate: () => void): (() => void) => {
  let channel: BroadcastChannel | null = null;

  const handleCustomEvent = () => {
    onUpdate();
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === EMPLOYEE_STORAGE_KEY) {
      onUpdate();
    }
  };

  const handleChannelMessage = (event: MessageEvent) => {
    if (event.data?.type === "EMPLOYEES_UPDATED") {
      onUpdate();
    }
  };

  // 1. Same-tab CustomEvent
  window.addEventListener("employees:updated", handleCustomEvent);

  // 2. Cross-tab StorageEvent
  window.addEventListener("storage", handleStorage);

  // 3. Cross-tab BroadcastChannel
  try {
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(EMPLOYEE_SYNC_CHANNEL);
      channel.onmessage = handleChannelMessage;
    }
  } catch {
    // Silently continue
  }

  return () => {
    window.removeEventListener("employees:updated", handleCustomEvent);
    window.removeEventListener("storage", handleStorage);
    if (channel) {
      try {
        channel.close();
      } catch {
        // Silently continue
      }
    }
  };
};
