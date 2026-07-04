import { useCallback } from "react";

/**
 * Custom hook to handle Enter key focus navigation globally, preventing code repetition.
 */
export const useEnterKeyNavigation = () => {
  const handleKeyDown = useCallback((e: React.KeyboardEvent<any>, nextFieldId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextFieldId) {
        setTimeout(() => {
          const targetElement = document.getElementById(nextFieldId) as HTMLElement | null;
          if (targetElement) {
            targetElement.focus();

            // Auto-expand native select options if it is a <select> element
            if (
              targetElement.tagName === "SELECT" &&
              typeof (targetElement as any).showPicker === "function"
            ) {
              try {
                (targetElement as any).showPicker();
              } catch (err) {
                console.warn("[useEnterKeyNavigation] showPicker failed:", err);
              }
            }
          }
        }, 50);
      }
    }
  }, []);

  return handleKeyDown;
};

export default useEnterKeyNavigation;
