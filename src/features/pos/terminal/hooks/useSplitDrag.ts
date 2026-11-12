/**
 * Drag a whole line from one split bill to another (owner's request 2026-11-12: moving 8 units by double-click
 * meant 8 double-clicks). Double-click still moves one unit; a drop moves the line's full quantity.
 *
 * Pointer events, so it works with a mouse and on a touch screen:
 *  - mouse / pen: the drag starts once the pointer moves 6px with the button down;
 *  - touch: press and hold ~0.3s, then move (moving straight away still scrolls the list).
 * Bills are marked with `data-split-bucket="<id>"`; the drop target is the bill under the pointer.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";

export interface SplitDragState {
  fromBucketId: string;
  mapId: number;
  label: string;
  x: number;
  y: number;
  /** Bill under the pointer, null when over nothing. */
  overBucketId: string | null;
}

interface Pending {
  fromBucketId: string;
  mapId: number;
  label: string;
  startX: number;
  startY: number;
  pointerId: number;
  isTouch: boolean;
  armed: boolean;
  dragging: boolean;
}

const MOUSE_THRESHOLD = 6;
const TOUCH_SCROLL_TOLERANCE = 10;
const TOUCH_HOLD_MS = 300;
/** Clicks arriving this soon after a drop belong to the drag, not to a tap. */
const CLICK_SUPPRESS_MS = 400;

export const SPLIT_BUCKET_ATTR = "data-split-bucket";

const bucketAt = (x: number, y: number): string | null => {
  const el = typeof document.elementFromPoint === "function" ? document.elementFromPoint(x, y) : null;
  const bucket = el?.closest?.(`[${SPLIT_BUCKET_ATTR}]`);
  return bucket ? bucket.getAttribute(SPLIT_BUCKET_ATTR) : null;
};

/** Minimal shape of a split bill for the drop rule. */
export interface DropBucket {
  id: string;
  isBase: boolean;
  items: { mapId: number; currentQty: number }[];
}

/**
 * Whether dropping line `mapId` of bill `fromId` on bill `toId` moves it. `move: false` with a message: tell the
 * cashier why; without one: nothing to do (dropped where it already is).
 */
export const splitDropCheck = (buckets: DropBucket[], fromId: string, toId: string | null, mapId: number): { move: boolean; message?: string } => {
  if (!toId || toId === fromId) return { move: false };
  const from = buckets.find((b) => b.id === fromId);
  const to = buckets.find((b) => b.id === toId);
  const item = from?.items.find((i) => i.mapId === mapId);
  if (!from || !to || !item || item.currentQty <= 0) return { move: false };
  if (from.isBase) {
    const left = from.items.reduce((sum, i) => sum + i.currentQty, 0) - item.currentQty;
    if (left <= 0) return { move: false, message: "Original order must have at least one item." };
  }
  return { move: true };
};

export const useSplitDrag = (onDrop: (fromBucketId: string, toBucketId: string | null, mapId: number) => void) => {
  const [drag, setDrag] = useState<SplitDragState | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const lastDropAtRef = useRef(0);
  const onDropRef = useRef(onDrop);
  useEffect(() => { onDropRef.current = onDrop; }, [onDrop]);
  const detachRef = useRef<() => void>(() => {});

  const stop = useCallback(() => {
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
    pendingRef.current = null;
    detachRef.current();
    detachRef.current = () => {};
    setDrag(null);
  }, []);

  useEffect(() => stop, [stop]);

  const begin = (p: Pending, x: number, y: number) => {
    p.dragging = true;
    setDrag({ fromBucketId: p.fromBucketId, mapId: p.mapId, label: p.label, x, y, overBucketId: bucketAt(x, y) });
  };

  const onPointerDown = (fromBucketId: string, mapId: number, label: string) => (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    stop();
    const p: Pending = {
      fromBucketId, mapId, label, startX: e.clientX, startY: e.clientY, pointerId: e.pointerId,
      isTouch: e.pointerType === "touch", armed: e.pointerType !== "touch", dragging: false,
    };
    pendingRef.current = p;
    if (p.isTouch) {
      holdTimerRef.current = window.setTimeout(() => {
        holdTimerRef.current = null;
        if (pendingRef.current === p && !p.dragging) { p.armed = true; begin(p, p.startX, p.startY); }
      }, TOUCH_HOLD_MS);
    }

    const move = (ev: PointerEvent) => {
      const cur = pendingRef.current;
      if (!cur || ev.pointerId !== cur.pointerId) return;
      const dist = Math.hypot(ev.clientX - cur.startX, ev.clientY - cur.startY);
      if (!cur.dragging) {
        if (cur.isTouch) {
          if (dist > TOUCH_SCROLL_TOLERANCE) stop(); // finger moved before the hold: it is a scroll
          return;
        }
        if (dist < MOUSE_THRESHOLD) return;
        begin(cur, ev.clientX, ev.clientY);
        return;
      }
      setDrag((d) => (d ? { ...d, x: ev.clientX, y: ev.clientY, overBucketId: bucketAt(ev.clientX, ev.clientY) } : d));
    };
    const up = (ev: PointerEvent) => {
      const cur = pendingRef.current;
      if (!cur || ev.pointerId !== cur.pointerId) return;
      if (cur.dragging) {
        lastDropAtRef.current = Date.now();
        onDropRef.current(cur.fromBucketId, bucketAt(ev.clientX, ev.clientY), cur.mapId);
      }
      stop();
    };
    const cancel = (ev: PointerEvent) => {
      if (pendingRef.current && ev.pointerId === pendingRef.current.pointerId) stop();
    };
    // While a touch drag is on, the page must not scroll under the finger.
    const touchMove = (ev: TouchEvent) => {
      const cur = pendingRef.current;
      if (cur && cur.isTouch && (cur.armed || cur.dragging) && ev.cancelable) ev.preventDefault();
    };
    const key = (ev: KeyboardEvent) => {
      if (ev.key === "Escape" && pendingRef.current?.dragging) { ev.preventDefault(); ev.stopImmediatePropagation(); stop(); }
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("touchmove", touchMove, { passive: false });
    window.addEventListener("keydown", key, true);
    detachRef.current = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("touchmove", touchMove);
      window.removeEventListener("keydown", key, true);
    };
  };

  /** True for the click that ends a drag: the row ignores it (no select / no double-click count). */
  const isDragClick = () => Date.now() - lastDropAtRef.current < CLICK_SUPPRESS_MS;

  return { drag, onPointerDown, isDragClick };
};
