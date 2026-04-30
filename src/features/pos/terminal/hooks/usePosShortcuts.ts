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
          // Esc voids the ticket
          actions.onClearCart();
          e.preventDefault();
          break;
        case "F2":
          // F2 holds the ticket
          actions.onHoldTicket();
          e.preventDefault();
          break;
        case " ": // Spacebar
          // Spacebar forces checkout
          actions.onCheckout();
          e.preventDefault();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [actions]);
};
