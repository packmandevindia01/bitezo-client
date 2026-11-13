import type React from "react";

/**
 * Keyboard helpers of the Back Office document pages (2026-11-13; each page had its own copies).
 * Enter moves through the form like Tab, and leaves the line grid on an empty row.
 */

/** Enter: focus the field with this id (after `delayMs`, when given). */
export const focusOnEnter = (e: React.KeyboardEvent, nextId?: string, delayMs?: number) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  if (!nextId) return;
  if (delayMs === undefined) {
    document.getElementById(nextId)?.focus();
  } else {
    setTimeout(() => {
      const el = document.getElementById(nextId);
      if (el) el.focus();
    }, delayMs);
  }
};

const FOCUSABLE = 'input:not([tabindex="-1"]):not([type="hidden"]), select:not([tabindex="-1"]), button:not([tabindex="-1"]), [role="combobox"]:not([tabindex="-1"])';

/** Focus the next enabled, editable field of the page after the event's target. */
export const focusNextField = (e: React.KeyboardEvent) => {
  const formElements = Array.from(document.querySelectorAll(FOCUSABLE))
    .filter(el => !el.hasAttribute('disabled') && !el.hasAttribute('readonly'));
  const currentIndex = formElements.indexOf(e.target as Element);
  if (currentIndex > -1 && formElements[currentIndex + 1]) {
    (formElements[currentIndex + 1] as HTMLElement).focus();
  }
};

interface RowEnterOptions {
  /** Product value of a row ("" when none). */
  getRowProduct: (rowIndex: number) => string | undefined;
  rowCount: number;
  removeRow: (rowIndex: number) => void;
  /** Field to go to when Enter is pressed on a row without a product. */
  exitToId: string;
}

/**
 * Enter in a line-grid cell: on a row without a product, drop that row (unless it is the only one) and leave the
 * grid; otherwise go to the next field.
 */
export const makeRowEnter = ({ getRowProduct, rowCount, removeRow, exitToId }: RowEnterOptions) =>
  (e: React.KeyboardEvent, rowIndex?: number) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (rowIndex !== undefined) {
      const rowProduct = getRowProduct(rowIndex);
      if (!rowProduct || rowProduct.trim() === "") {
        if (rowCount > 1) removeRow(rowIndex);
        setTimeout(() => document.getElementById(exitToId)?.focus(), 50);
        return;
      }
    }
    focusNextField(e);
  };

/**
 * Keys for a number cell limited to `maxChars` characters: Enter runs `onEnter`; minus, plus and exponent keys
 * are blocked; typing stops at the limit (editing keys and a selection still work).
 */
export const limitDigitsKeyDown = (
  e: React.KeyboardEvent<HTMLInputElement>,
  maxChars: number,
  onEnter?: () => void
) => {
  if (e.key === "Enter") {
    if (onEnter) {
      e.preventDefault();
      onEnter();
    }
    return;
  }
  if (e.key === "-" || e.key === "+" || e.key === "e" || e.key === "E") {
    e.preventDefault();
    return;
  }
  if (
    e.ctrlKey ||
    e.metaKey ||
    e.altKey ||
    [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Tab",
      "Home",
      "End",
      "Escape",
    ].includes(e.key)
  ) {
    return;
  }
  const target = e.currentTarget;
  if (
    target.selectionStart !== null &&
    target.selectionEnd !== null &&
    target.selectionStart !== target.selectionEnd
  ) {
    return;
  }
  if (target.value.length >= maxChars) {
    e.preventDefault();
  }
};

/** Paste into a number cell limited to `maxChars`: a longer result is cut and stored with `setValue`. */
export const limitDigitsPaste = (
  e: React.ClipboardEvent<HTMLInputElement>,
  maxChars: number,
  setValue: (value: string) => void
) => {
  const paste = e.clipboardData.getData("text");
  const target = e.currentTarget;
  const start = target.selectionStart ?? target.value.length;
  const end = target.selectionEnd ?? target.value.length;
  const newVal = target.value.slice(0, start) + paste + target.value.slice(end);
  if (newVal.length > maxChars) {
    e.preventDefault();
    const truncated = newVal.slice(0, maxChars);
    target.value = truncated;
    setValue(truncated);
  }
};
