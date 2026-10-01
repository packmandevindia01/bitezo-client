/**
 * Cross-tab and local real-time synchronization utility for Paymodes.
 * Broadcasts updates whenever paymodes are created, updated, or deleted in Backoffice.
 */

export const PAYMODE_SYNC_CHANNEL = "bitezo_paymode_sync";
export const PAYMODE_STORAGE_KEY = "bitezo_paymode_updated_at";

export type PaymodeSyncAction = "created" | "updated" | "deleted";

export const notifyPaymodeUpdated = (action: PaymodeSyncAction = "created") => {
  const timestamp = Date.now();
  const payload = { type: "PAYMODE_UPDATED", action, timestamp };

  // 1. Cross-tab BroadcastChannel
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(PAYMODE_SYNC_CHANNEL);
      channel.postMessage(payload);
      channel.close();
    }
  } catch {
    // Silently continue
  }

  // 2. Cross-tab localStorage fallback (fires 'storage' event in other tabs)
  try {
    localStorage.setItem(PAYMODE_STORAGE_KEY, `${timestamp}:${action}`);
  } catch {
    // Silently continue
  }

  // 3. Same-tab DOM CustomEvent
  try {
    window.dispatchEvent(new CustomEvent("paymodes:updated", { detail: payload }));
  } catch {
    // Silently continue
  }
};
