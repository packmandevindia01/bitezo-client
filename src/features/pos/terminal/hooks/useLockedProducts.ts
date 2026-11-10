import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "../../../../app/providers/useToast";
import { lockProductService } from "../../lockItem/services/lockProductService";

const STORAGE_KEY = "posLockedProductIds";
const REFRESH_MS = 15000;

const readSavedIds = (): Set<number> => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return new Set(Array.isArray(saved) ? saved.map(Number).filter(Number.isFinite) : []);
  } catch {
    return new Set();
  }
};

/** Locked items, kept fresh. When the server cannot be reached the last list saved on this device stays in force. */
export const useLockedProducts = () => {
  const { showToast } = useToast();
  const [lockedIds, setLockedIds] = useState<Set<number>>(readSavedIds);
  const warned = useRef(false);

  const refreshLockedProducts = useCallback(async () => {
    try {
      const locked = await lockProductService.list();
      const ids = locked.map((item) => item.productId);
      setLockedIds(new Set(ids));
      warned.current = false;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
      } catch {
        // Storage full or blocked: the list on screen is still right.
      }
    } catch (error) {
      console.warn("[LockedItems] Could not refresh the locked list:", error);
      if (!warned.current) {
        warned.current = true;
        showToast("Could not refresh locked items. Using the last list saved on this device.", "warning");
      }
    }
  }, [showToast]);

  useEffect(() => {
    void refreshLockedProducts();
    const interval = setInterval(() => void refreshLockedProducts(), REFRESH_MS);
    return () => clearInterval(interval);
  }, [refreshLockedProducts]);

  return { lockedIds, refreshLockedProducts };
};
