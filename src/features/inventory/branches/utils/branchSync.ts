/**
 * Cross-tab & local real-time synchronization utility for Branch Master data.
 * Broadcasts updates whenever branches are created, updated, or deleted in Backoffice.
 */

export const BRANCH_SYNC_CHANNEL = "bitezo_branches_sync";
export const BRANCH_STORAGE_KEY = "bitezo_branches_updated_at";

export const notifyBranchesUpdated = () => {
  const timestamp = Date.now();
  const payload = { type: "BRANCHES_UPDATED", timestamp };

  // 1. Cross-tab BroadcastChannel
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(BRANCH_SYNC_CHANNEL);
      channel.postMessage(payload);
      channel.close();
    }
  } catch {
    // Silently continue
  }

  // 2. Cross-tab localStorage fallback (fires 'storage' event in other tabs)
  try {
    localStorage.setItem(BRANCH_STORAGE_KEY, String(timestamp));
  } catch {
    // Silently continue
  }

  // 3. Same-tab DOM CustomEvent
  try {
    window.dispatchEvent(new CustomEvent("branches:updated", { detail: payload }));
  } catch {
    // Silently continue
  }
};

export const subscribeToBranchUpdates = (onUpdate: () => void): (() => void) => {
  let channel: BroadcastChannel | null = null;

  const handleCustomEvent = () => {
    onUpdate();
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === BRANCH_STORAGE_KEY) {
      onUpdate();
    }
  };

  const handleChannelMessage = (event: MessageEvent) => {
    if (event.data?.type === "BRANCHES_UPDATED") {
      onUpdate();
    }
  };

  // 1. Same-tab CustomEvent
  window.addEventListener("branches:updated", handleCustomEvent);

  // 2. Cross-tab StorageEvent
  window.addEventListener("storage", handleStorage);

  // 3. Cross-tab BroadcastChannel
  try {
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(BRANCH_SYNC_CHANNEL);
      channel.onmessage = handleChannelMessage;
    }
  } catch {
    // Silently continue
  }

  return () => {
    window.removeEventListener("branches:updated", handleCustomEvent);
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
