import { useEffect } from "react";

/**
 * Back Office: Enter moves to the next input field (POS-style data entry), on every screen, without
 * wiring `nextFieldId` by hand on each field (only 7 forms had that).
 *
 * Enter keeps its own meaning — this handler steps aside — when:
 *   - the field already handled Enter (it called preventDefault: dropdown option pick, grids, search,
 *     the forms that use useEnterKeyNavigation),
 *   - the field is a multi-line text box (new line), a button (click) or a link,
 *   - a dropdown list is open (aria-expanded="true"),
 *   - Shift / Ctrl / Alt / Meta is held, or the IME is composing,
 *   - the field (or a parent) has data-enter="native".
 *
 * Next field = next visible, enabled, editable field in screen order inside the same form / dialog /
 * page; after the last field it moves to the Save (submit) button, where Enter saves.
 */

export interface FieldInfo {
  /** "input" | "select" | "textarea" | "submit" (a submit / Save button) */
  kind: "input" | "select" | "textarea" | "submit";
  disabled?: boolean;
  readOnly?: boolean;
  hidden?: boolean;
  /** tabIndex -1 = not part of keyboard flow */
  skip?: boolean;
}

/** Index of the field Enter should move to, or -1 when there is none. Pure (unit-tested). */
export const pickNextField = (fields: FieldInfo[], currentIndex: number): number => {
  for (let i = currentIndex + 1; i < fields.length; i++) {
    const f = fields[i];
    if (f.disabled || f.hidden || f.skip) continue;
    if (f.readOnly && f.kind !== "submit") continue;
    return i;
  }
  return -1;
};

const FIELD_SELECTOR = [
  "input:not([type=hidden]):not([type=button]):not([type=reset]):not([type=file])",
  "select",
  "textarea",
  "button[type=submit]",
  "input[type=submit]",
  "[data-enter-target]",
].join(",");

const SCOPE_SELECTOR = "form, [role=dialog], [aria-modal=true], [data-enter-scope]";

const isVisible = (el: HTMLElement) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

const describe = (el: HTMLElement): FieldInfo => {
  const tag = el.tagName;
  const type = (el.getAttribute("type") || "").toLowerCase();
  const kind: FieldInfo["kind"] =
    tag === "SELECT" ? "select"
      : tag === "TEXTAREA" ? "textarea"
      : tag === "BUTTON" || type === "submit" || el.hasAttribute("data-enter-target") ? "submit"
      : "input";
  return {
    kind,
    disabled: (el as HTMLInputElement).disabled || el.getAttribute("aria-disabled") === "true",
    readOnly: (el as HTMLInputElement).readOnly,
    hidden: !isVisible(el),
    skip: el.getAttribute("tabindex") === "-1",
  };
};

const shouldHandle = (e: KeyboardEvent, el: HTMLElement): boolean => {
  if (e.key !== "Enter" || e.defaultPrevented || e.isComposing) return false;
  if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return false;
  if (el.closest("[data-enter=native]")) return false;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "BUTTON" || tag === "A") return false;
  if (tag !== "INPUT" && tag !== "SELECT") return false;
  const type = (el.getAttribute("type") || "").toLowerCase();
  if (["button", "submit", "reset", "file"].includes(type)) return false;
  if (el.getAttribute("aria-expanded") === "true") return false;
  return true;
};

/** Mount once for the Back Office (see app/routes/BackofficeEnterNavigation.tsx). */
export const useEnterToNextField = (enabled = true): void => {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || !shouldHandle(e, el)) return;
      const scope = (el.closest(SCOPE_SELECTOR) as HTMLElement | null) || (el.closest("main") as HTMLElement | null) || document.body;
      const nodes = Array.from(scope.querySelectorAll<HTMLElement>(FIELD_SELECTOR));
      const current = nodes.indexOf(el);
      if (current < 0) return;
      const next = pickNextField(nodes.map(describe), current);
      if (next < 0) return;
      e.preventDefault(); // stop the browser's implicit form submit — the user moves on instead
      const target = nodes[next];
      target.focus();
      if (target instanceof HTMLInputElement && typeof target.select === "function" && target.type !== "checkbox" && target.type !== "radio") {
        try { target.select(); } catch { /* some input types cannot be selected */ }
      }
    };
    // Bubble phase on document: React field handlers (which may preventDefault) run first.
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
};

export default useEnterToNextField;
