import { useEffect, useRef } from "react";
import { closeLayer, isTopLayer, openLayer } from "../lib/layers";

/**
 * Registers a popup layer while `isOpen` (see shared/lib/layers.ts).
 * Optional `onEscape`: called when Esc is pressed and this popup is the TOP layer — unless a field
 * inside already handled Esc (e.g. a dropdown closing its list called preventDefault).
 * Returns `isTop()` for components with their own key handling.
 */
export const useModalLayer = (isOpen: boolean, onEscape?: () => void): { isTop: () => boolean } => {
  const idRef = useRef<number | null>(null);
  const onEscapeRef = useRef(onEscape);
  // Keep the latest callback without re-registering the layer (updated after render, not during it).
  useEffect(() => {
    onEscapeRef.current = onEscape;
  });

  useEffect(() => {
    if (!isOpen) return;
    const id = openLayer();
    idRef.current = id;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented || !onEscapeRef.current) return;
      if (!isTopLayer(id)) return;
      e.preventDefault();
      onEscapeRef.current();
    };
    // Bubble phase on document: handlers inside the popup (React) run first and can keep Esc for themselves.
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      closeLayer(id);
      idRef.current = null;
    };
  }, [isOpen]);

  return { isTop: () => idRef.current !== null && isTopLayer(idRef.current) };
};

export default useModalLayer;
