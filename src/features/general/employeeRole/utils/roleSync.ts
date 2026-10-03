/**
 * Cross-tab & local real-time synchronization utility for Employee Role Master data.
 * Broadcasts updates whenever roles are created, updated, or deleted.
 */

export const ROLE_SYNC_CHANNEL = "bitezo_employee_roles_sync";
export const ROLE_STORAGE_KEY = "bitezo_employee_roles_updated_at";

export const notifyRolesUpdated = () => {
  const timestamp = Date.now();
  const payload = { type: "ROLES_UPDATED", timestamp };

  // 1. Cross-tab BroadcastChannel
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(ROLE_SYNC_CHANNEL);
      channel.postMessage(payload);
      setTimeout(() => {
        try {
          channel.close();
        } catch {
          // Silently continue
        }
      }, 1000);
    }
  } catch {
    // Silently continue
  }

  // 2. Cross-tab localStorage fallback (fires 'storage' event in other tabs)
  try {
    localStorage.setItem(ROLE_STORAGE_KEY, String(timestamp));
  } catch {
    // Silently continue
  }

  // 3. Same-tab DOM CustomEvent
  try {
    window.dispatchEvent(new CustomEvent("roles:updated", { detail: payload }));
  } catch {
    // Silently continue
  }
};

export const subscribeToRoleUpdates = (onUpdate: () => void): (() => void) => {
  let channel: BroadcastChannel | null = null;

  const handleCustomEvent = () => {
    onUpdate();
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === ROLE_STORAGE_KEY) {
      onUpdate();
    }
  };

  const handleChannelMessage = (event: MessageEvent) => {
    if (event.data?.type === "ROLES_UPDATED") {
      onUpdate();
    }
  };

  // 1. Same-tab CustomEvent
  window.addEventListener("roles:updated", handleCustomEvent);

  // 2. Cross-tab StorageEvent
  window.addEventListener("storage", handleStorage);

  // 3. Cross-tab BroadcastChannel
  try {
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(ROLE_SYNC_CHANNEL);
      channel.onmessage = handleChannelMessage;
    }
  } catch {
    // Silently continue
  }

  return () => {
    window.removeEventListener("roles:updated", handleCustomEvent);
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
