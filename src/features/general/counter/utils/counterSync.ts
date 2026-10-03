/**
 * Cross-tab and local real-time synchronization utility for Counters.
 * Broadcasts updates whenever counters are created, updated, or deleted in Backoffice.
 */

export const COUNTER_SYNC_CHANNEL = "bitezo_counter_sync";
export const COUNTER_STORAGE_KEY = "bitezo_counter_updated_at";

export type CounterSyncAction = "created" | "updated" | "deleted";

export const notifyCounterUpdated = (action: CounterSyncAction = "created") => {
  const timestamp = Date.now();
  const payload = { type: "COUNTER_UPDATED", action, timestamp };

  // 1. Cross-tab BroadcastChannel
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(COUNTER_SYNC_CHANNEL);
      channel.postMessage(payload);
      channel.close();
    }
  } catch {
    // Silently continue
  }

  // 2. Cross-tab localStorage fallback (fires 'storage' event in other tabs)
  try {
    localStorage.setItem(COUNTER_STORAGE_KEY, `${timestamp}:${action}`);
  } catch {
    // Silently continue
  }

  // 3. Same-tab DOM CustomEvent
  try {
    window.dispatchEvent(new CustomEvent("counters:updated", { detail: payload }));
  } catch {
    // Silently continue
  }
};

export const subscribeToCounterUpdates = (onUpdate: () => void): (() => void) => {
  let channel: BroadcastChannel | null = null;

  const handleCustomEvent = () => {
    onUpdate();
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === COUNTER_STORAGE_KEY) {
      onUpdate();
    }
  };

  const handleChannelMessage = (event: MessageEvent) => {
    if (event.data?.type === "COUNTER_UPDATED") {
      onUpdate();
    }
  };

  // 1. Same-tab CustomEvent
  window.addEventListener("counters:updated", handleCustomEvent);

  // 2. Cross-tab StorageEvent
  window.addEventListener("storage", handleStorage);

  // 3. Cross-tab BroadcastChannel
  try {
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(COUNTER_SYNC_CHANNEL);
      channel.onmessage = handleChannelMessage;
    }
  } catch {
    // Silently continue
  }

  return () => {
    window.removeEventListener("counters:updated", handleCustomEvent);
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
