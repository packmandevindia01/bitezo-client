/**
 * Popup layer stack (Phase 2d). Every open popup registers a layer; only the TOP layer reacts to
 * Esc, and page-level shortcuts (POS Esc / F2 / Space) stay quiet while any layer is open.
 *
 * Before: popups and page shortcuts all listened to the same key presses — e.g. Esc on the POS page
 * reached the "clear cart" shortcut even while a popup was open.
 */
type Listener = () => void;

let stack: number[] = [];
let nextId = 1;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

/** Register a layer on top; returns its id. */
export const openLayer = (): number => {
  const id = nextId++;
  stack = [...stack, id];
  emit();
  return id;
};

/** Remove a layer (wherever it is in the stack). */
export const closeLayer = (id: number): void => {
  if (!stack.includes(id)) return;
  stack = stack.filter((x) => x !== id);
  emit();
};

export const isTopLayer = (id: number): boolean => stack.length > 0 && stack[stack.length - 1] === id;
export const hasOpenLayers = (): boolean => stack.length > 0;
export const openLayerCount = (): number => stack.length;

export const subscribeLayers = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Test helper. */
export const resetLayers = (): void => {
  stack = [];
  emit();
};
