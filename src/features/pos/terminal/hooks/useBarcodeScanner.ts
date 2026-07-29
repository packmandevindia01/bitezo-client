import { useEffect, useRef } from "react";

/**
 * A custom hook to intercept physical barcode scanner inputs.
 * Hardware scanners act as very fast keyboards. We measure the time between
 * keystrokes to differentiate a scanner from human typing.
 */
export const useBarcodeScanner = (onScan: (barcode: string) => void) => {
  const buffer = useRef("");
  const lastKeyTime = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime.current;
      
      const activeEl = document.activeElement;
      const isInputFocused = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");

      if (e.key === "Enter") {
        if (buffer.current.length > 3) {
          onScan(buffer.current);
          buffer.current = "";
          if (!isInputFocused) e.preventDefault();
        }
        return;
      }

      if (timeDiff > 50) {
        buffer.current = "";
      }

      if (e.key && e.key.length === 1) {
        if (timeDiff <= 50 && !isInputFocused) {
          e.preventDefault();
        }
        buffer.current += e.key;
      }
      
      lastKeyTime.current = currentTime;
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onScan]);
};
