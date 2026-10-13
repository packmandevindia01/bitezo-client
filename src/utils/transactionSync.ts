/**
 * Cross-tab & local real-time synchronization utility for Transactions.
 * Broadcasts updates whenever any transaction (Sales, Purchase, Purchase Return,
 * Payment, Receipt, Pay In/Out, Bulk Settlement, etc.) is created, updated, or cancelled.
 */

export const TRANSACTION_SYNC_CHANNEL = "bitezo_transactions_sync";
export const TRANSACTION_STORAGE_KEY = "bitezo_transactions_updated_at";

export type TransactionType =
  | "sale"
  | "purchase"
  | "purchase_return"
  | "payment"
  | "receipt"
  | "pay_in_out"
  | "settlement"
  | "general"
  | string;

export interface TransactionUpdatePayload {
  type: "TRANSACTION_UPDATED";
  transactionType: TransactionType;
  timestamp: number;
}

export const notifyTransactionsUpdated = (transactionType: TransactionType = "general") => {
  const timestamp = Date.now();
  const payload: TransactionUpdatePayload = {
    type: "TRANSACTION_UPDATED",
    transactionType,
    timestamp,
  };

  // 1. Cross-tab BroadcastChannel (supported in modern browsers)
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(TRANSACTION_SYNC_CHANNEL);
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

  // 2. Cross-tab localStorage fallback (fires 'storage' event in other tabs/windows)
  try {
    localStorage.setItem(TRANSACTION_STORAGE_KEY, `${timestamp}:${transactionType}`);
  } catch {
    // Silently continue
  }

  // 3. Same-tab DOM CustomEvent
  try {
    window.dispatchEvent(new CustomEvent("transactions:updated", { detail: payload }));
  } catch {
    // Silently continue
  }
};

export const subscribeToTransactionUpdates = (
  onUpdate: (payload?: TransactionUpdatePayload) => void
): (() => void) => {
  let channel: BroadcastChannel | null = null;
  let lastTimestamp = 0;

  const trigger = (payload?: TransactionUpdatePayload) => {
    const ts = payload?.timestamp || Date.now();
    if (ts === lastTimestamp) return;
    lastTimestamp = ts;
    onUpdate(payload);
  };

  const handleCustomEvent = (e: Event) => {
    const detail = (e as CustomEvent<TransactionUpdatePayload>).detail;
    trigger(detail);
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.key === TRANSACTION_STORAGE_KEY && event.newValue) {
      const parts = event.newValue.split(":");
      const ts = parseInt(parts[0], 10) || Date.now();
      const transactionType = parts[1] || "general";
      trigger({ type: "TRANSACTION_UPDATED", transactionType, timestamp: ts });
    }
  };

  const handleChannelMessage = (event: MessageEvent<TransactionUpdatePayload>) => {
    if (event.data?.type === "TRANSACTION_UPDATED") {
      trigger(event.data);
    }
  };

  window.addEventListener("transactions:updated", handleCustomEvent);
  window.addEventListener("storage", handleStorage);

  try {
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(TRANSACTION_SYNC_CHANNEL);
      channel.onmessage = handleChannelMessage;
    }
  } catch {
    // Silently continue
  }

  return () => {
    window.removeEventListener("transactions:updated", handleCustomEvent);
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
