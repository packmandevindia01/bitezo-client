/**
 * Cross-tab & local real-time synchronization utility for Supplier Master data.
 * Broadcasts updates whenever suppliers are created, updated, or deleted.
 */

export const SUPPLIER_SYNC_CHANNEL = "bitezo_suppliers_sync";
export const SUPPLIER_STORAGE_KEY = "bitezo_suppliers_updated_at";

export const notifySuppliersUpdated = () => {
  const timestamp = Date.now();
  const payload = { type: "SUPPLIERS_UPDATED", timestamp };

  // 1. Cross-tab BroadcastChannel
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(SUPPLIER_SYNC_CHANNEL);
      channel.postMessage(payload);
      channel.close();
    }
  } catch {
    // Silently continue
  }

  // 2. Cross-tab localStorage fallback (fires 'storage' event in other tabs)
  try {
    localStorage.setItem(SUPPLIER_STORAGE_KEY, String(timestamp));
  } catch {
    // Silently continue
  }

  // 3. Same-tab DOM CustomEvent
  try {
    window.dispatchEvent(new CustomEvent("suppliers:updated", { detail: payload }));
  } catch {
    // Silently continue
  }
};

export const subscribeToSupplierUpdates = (onUpdate: () => void): (() => void) => {
  let channel: BroadcastChannel | null = null;

  const handleCustomEvent = () => {
    onUpdate();
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === SUPPLIER_STORAGE_KEY) {
      onUpdate();
    }
  };

  const handleChannelMessage = (event: MessageEvent) => {
    if (event.data?.type === "SUPPLIERS_UPDATED") {
      onUpdate();
    }
  };

  // 1. Same-tab CustomEvent
  window.addEventListener("suppliers:updated", handleCustomEvent);

  // 2. Cross-tab StorageEvent
  window.addEventListener("storage", handleStorage);

  // 3. Cross-tab BroadcastChannel
  try {
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(SUPPLIER_SYNC_CHANNEL);
      channel.onmessage = handleChannelMessage;
    }
  } catch {
    // Silently continue
  }

  return () => {
    window.removeEventListener("suppliers:updated", handleCustomEvent);
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
