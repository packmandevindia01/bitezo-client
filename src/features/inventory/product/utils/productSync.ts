/**
 * Cross-tab & local real-time synchronization utility for Product Master data.
 * Broadcasts updates whenever products are created, updated, or deleted.
 */

import { notifyPosMenuUpdated } from "../../../pos/utils/posMenuSync";

export const PRODUCT_SYNC_CHANNEL = "bitezo_products_sync";
export const PRODUCT_STORAGE_KEY = "bitezo_products_updated_at";

export type ProductSyncAction = "created" | "updated" | "deleted";

export const notifyProductsUpdated = (action: ProductSyncAction = "created") => {
  const timestamp = Date.now();
  const payload = { type: "PRODUCTS_UPDATED", action, timestamp };

  // 1. Cross-tab BroadcastChannel
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(PRODUCT_SYNC_CHANNEL);
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
    localStorage.setItem(PRODUCT_STORAGE_KEY, `${timestamp}:${action}`);
  } catch {
    // Silently continue
  }

  // 3. Same-tab DOM CustomEvent
  try {
    window.dispatchEvent(new CustomEvent("products:updated", { detail: payload }));
  } catch {
    // Silently continue
  }

  // 4. POS menu notification sync
  try {
    notifyPosMenuUpdated("product");
  } catch {
    // Silently continue
  }
};

export const subscribeToProductUpdates = (onUpdate: () => void): (() => void) => {
  let channel: BroadcastChannel | null = null;

  const handleCustomEvent = () => {
    onUpdate();
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === PRODUCT_STORAGE_KEY || event.key === "bitezo_pos_menu_updated_at") {
      onUpdate();
    }
  };

  const handleChannelMessage = (event: MessageEvent) => {
    if (event.data?.type === "PRODUCTS_UPDATED" || event.data?.type === "MENU_UPDATED") {
      onUpdate();
    }
  };

  // 1. Same-tab CustomEvent
  window.addEventListener("products:updated", handleCustomEvent);
  window.addEventListener("pos_menu_updated", handleCustomEvent);

  // 2. Cross-tab StorageEvent
  window.addEventListener("storage", handleStorage);

  // 3. Cross-tab BroadcastChannel
  try {
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(PRODUCT_SYNC_CHANNEL);
      channel.onmessage = handleChannelMessage;
    }
  } catch {
    // Silently continue
  }

  return () => {
    window.removeEventListener("products:updated", handleCustomEvent);
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
