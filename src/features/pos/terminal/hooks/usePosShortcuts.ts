import { useEffect } from "react";

export const usePosShortcuts = (actions: {
  onClearCart: () => void;
  onHoldTicket: () => void;
  onCheckout: () => void;
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input field (like the search bar)
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (e.key) {
        case "Escape":
          // Esc asks to clear the ticket (the page opens a confirmation; it never clears directly)
          actions.onClearCart();
          e.preventDefault();
          break;
        case "F2":
          // F2 holds the ticket
          actions.onHoldTicket();
          e.preventDefault();
          break;
        case " ": // Spacebar
          // Let a focused button handle Space itself (keyboard activation).
          if (e.target instanceof HTMLButtonElement) break;
          // Spacebar: checkout shortcut (currently a no-op on the terminal page)
          actions.onCheckout();
          e.preventDefault();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actions]);
};
