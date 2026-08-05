/**
 * Utility helper for managing keyboard focus navigation in forms.
 * Supports standard text inputs, textareas, native selects, and custom combobox dropdowns (SearchableSelect).
 */

export const handleFocusNextInput = (currentEl: HTMLElement) => {
  if (!currentEl) return;

  // Find the containing form, modal, card, dialog, or fall back to the document body.
  // Note: We deliberately exclude ".relative" because Tailwind's "relative" class is applied to tiny, 
  // nested wrapper divs, which would truncate the focus scope prematurely.
  const container =
    currentEl.closest("[role='dialog'], .modal, form, .card, body") ||
    document.body;

  // Query all potentially focusable interactive form fields
  const focusableElements = Array.from(
    container.querySelectorAll<HTMLElement>(
      'input:not([disabled]):not([readonly]):not([type="checkbox"]):not([type="radio"]), ' +
      'textarea:not([disabled]):not([readonly]), ' +
      'select:not([disabled]), ' +
      'div[role="combobox"]:not([tabindex="-1"])'
    )
  ).filter((el) => {
    // Ensure the element is visible in the viewport and not hidden by display: none or scale 0
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });

  // Sort by tabIndex (positive numbers first, then DOM order)
  focusableElements.sort((a, b) => {
    const aTab = a.tabIndex > 0 ? a.tabIndex : Number.MAX_SAFE_INTEGER;
    const bTab = b.tabIndex > 0 ? b.tabIndex : Number.MAX_SAFE_INTEGER;
    
    if (aTab !== bTab) {
      return aTab - bTab;
    }
    
    // Stable sort fallback for equal tabIndex (like 0)
    // compareDocumentPosition bitmask 4 means b follows a
    return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
  });

  const index = focusableElements.indexOf(currentEl);

  if (index > -1 && index < focusableElements.length - 1) {
    const nextEl = focusableElements[index + 1];
    nextEl.focus();

    // Auto-select text inside input/textarea fields for fast overwrite and touch efficiency
    setTimeout(() => {
      if (nextEl instanceof HTMLInputElement || nextEl instanceof HTMLTextAreaElement) {
        try {
          // Wrap in try-catch in case the browser throws an error for certain input types (like number/date)
          nextEl.setSelectionRange(0, nextEl.value.length);
        } catch (err) {
          nextEl.select?.();
        }
      }
    }, 20);
  } else {
    // If we have reached the end of the form fields, find and focus the primary action button
    const actionButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>("button:not([disabled])")
    ).filter((btn) => {
      const text = (btn.textContent || "").toLowerCase();
      const type = (btn.getAttribute("type") || "").toLowerCase();
      const title = (btn.getAttribute("title") || "").toLowerCase();
      const rect = btn.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        (type === "submit" ||
          title.includes("save") ||
          title.includes("submit") ||
          text.includes("save") ||
          text.includes("submit") ||
          text.includes("select") ||
          text.includes("update") ||
          text.includes("add now") ||
          text.includes("create"))
      );
    });

    if (actionButtons.length > 0) {
      actionButtons[0].focus();
    }
  }
};
