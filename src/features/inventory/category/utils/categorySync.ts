/**
 * Cross-tab & local real-time synchronization utility for Category Master data.
 * Broadcasts updates whenever categories are created, updated, or deleted.
 */

import { notifyPosMenuUpdated } from "../../../pos/utils/posMenuSync";

export const CATEGORY_SYNC_CHANNEL = "bitezo_categories_sync";
export const CATEGORY_STORAGE_KEY = "bitezo_categories_updated_at";

export type CategorySyncAction = "created" | "updated" | "deleted";

export const notifyCategoriesUpdated = (action: CategorySyncAction = "created") => {
  const timestamp = Date.now();
  const payload = { type: "CATEGORIES_UPDATED", action, timestamp };

  // 1. Cross-tab BroadcastChannel
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(CATEGORY_SYNC_CHANNEL);
      channel.postMessage(payload);
      channel.close();
    }
  } catch {
    // Silently continue
  }

  // 2. Cross-tab localStorage fallback (fires 'storage' event in other tabs)
  try {
    localStorage.setItem(CATEGORY_STORAGE_KEY, `${timestamp}:${action}`);
  } catch {
    // Silently continue
  }

  // 3. Same-tab DOM CustomEvent
  try {
    window.dispatchEvent(new CustomEvent("categories:updated", { detail: payload }));
  } catch {
    // Silently continue
  }

  // 4. POS menu notification sync
  try {
    notifyPosMenuUpdated("category");
  } catch {
    // Silently continue
  }
};

export const subscribeToCategoryUpdates = (onUpdate: () => void): (() => void) => {
  let channel: BroadcastChannel | null = null;

  const handleCustomEvent = () => {
    onUpdate();
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === CATEGORY_STORAGE_KEY) {
      onUpdate();
    }
  };

  const handleChannelMessage = (event: MessageEvent) => {
    if (event.data?.type === "CATEGORIES_UPDATED") {
      onUpdate();
    }
  };

  // 1. Same-tab CustomEvent
  window.addEventListener("categories:updated", handleCustomEvent);
  window.addEventListener("pos_menu_updated", handleCustomEvent);

  // 2. Cross-tab StorageEvent
  window.addEventListener("storage", handleStorage);

  // 3. Cross-tab BroadcastChannel
  try {
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(CATEGORY_SYNC_CHANNEL);
      channel.onmessage = handleChannelMessage;
    }
  } catch {
    // Silently continue
  }

  return () => {
    window.removeEventListener("categories:updated", handleCustomEvent);
    window.removeEventListener("pos_menu_updated", handleCustomEvent);
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
