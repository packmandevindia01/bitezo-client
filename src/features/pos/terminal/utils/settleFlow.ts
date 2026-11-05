/**
 * Settle flow — a tiny state machine that owns the "settling" lock (Phase 2c).
 *
 *   idle ──begin──▶ saving ──saved──▶ printing ──finish──▶ idle
 *                     │
 *                     └──fail──▶ idle
 *
 * Before: a boolean ref was released in `finally` right after the invoice was saved, while the receipt
 * print (up to the printer agent's 20 s timeout) and the cart clear were still running in the
 * background. The cart still held the settled order and the lock was free → a second Settle tap could
 * save a SECOND invoice for the same order. Now the lock is held until printing + cart clear finish.
 */
export type SettleState = "idle" | "saving" | "printing";

export interface SettleFlow {
  readonly state: SettleState;
  /** idle → saving. Returns false (and changes nothing) when a settlement is already running. */
  begin(): boolean;
  /** saving → printing (invoice saved; receipt + cart clear still to come). */
  saved(): void;
  /** saving → idle (nothing was saved: validation stop or server error). No-op in other states. */
  fail(): void;
  /** printing / saving → idle (everything finished). */
  finish(): void;
  /** True while the lock is held. */
  readonly busy: boolean;
}

export const createSettleFlow = (onChange?: (state: SettleState) => void): SettleFlow => {
  let state: SettleState = "idle";
  const set = (next: SettleState) => {
    if (next === state) return;
    state = next;
    onChange?.(state);
  };
  return {
    get state() { return state; },
    get busy() { return state !== "idle"; },
    begin() {
      if (state !== "idle") return false;
      set("saving");
      return true;
    },
    saved() {
      if (state === "saving") set("printing");
    },
    fail() {
      if (state === "saving") set("idle");
    },
    finish() {
      if (state !== "idle") set("idle");
    },
  };
};
