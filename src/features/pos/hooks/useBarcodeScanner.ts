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
      // Ignore inputs if the user is explicitly typing into an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime.current;

      if (e.key === "Enter") {
        // If the buffer has content and we arrived here fast, it's a scan
        if (buffer.current.length > 3) {
          onScan(buffer.current);
          buffer.current = "";
          e.preventDefault(); // Prevent standard enter behavior
        }
        return;
      }

      // If more than 50ms (human typing speed) passed, reset the buffer
      if (timeDiff > 50) {
        buffer.current = "";
      }

      // Only record single characters (ignore Shift, Control, etc)
      if (e.key.length === 1) {
        buffer.current += e.key;
      }
      
      lastKeyTime.current = currentTime;
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onScan]);
};
