/**
 * Cross-tab & local real-time synchronization utility for POS Terminal Menu & Catalog data.
 * Broadcasts updates whenever products, categories, subcategories, or groups are modified in Backoffice.
 */

export const POS_MENU_SYNC_CHANNEL = "bitezo_pos_menu_sync";
export const POS_MENU_STORAGE_KEY = "bitezo_pos_menu_updated_at";

export type PosMenuUpdateDetail = "product" | "category" | "subcategory" | "group" | "menu" | string;

export const notifyPosMenuUpdated = (detail: PosMenuUpdateDetail = "general") => {
  const timestamp = Date.now();
  const payload = { type: "MENU_UPDATED", detail, timestamp };

  // 1. Cross-tab BroadcastChannel (supported across all modern browsers)
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(POS_MENU_SYNC_CHANNEL);
      channel.postMessage(payload);
      channel.close();
    }
  } catch {
    // Silently continue
  }

  // 2. Cross-tab localStorage fallback (fires 'storage' event in other tabs)
  try {
    localStorage.setItem(POS_MENU_STORAGE_KEY, `${timestamp}:${detail}`);
  } catch {
    // Silently continue
  }

  // 3. Same-tab DOM CustomEvent
  try {
    window.dispatchEvent(new CustomEvent("pos_menu_updated", { detail: payload }));
  } catch {
    // Silently continue
  }
};
