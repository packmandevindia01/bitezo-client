/**
 * Phase 2c — the settle lock state machine (terminal/utils/settleFlow.ts).
 * The lock must stay held from "invoice saving" until "receipt printed + cart cleared", so a second
 * Settle tap during printing can never save a second invoice for the same order.
 */
import { describe, it, expect } from "vitest";
import { createSettleFlow, type SettleState } from "@pos/terminal/utils/settleFlow";

describe("settle flow", () => {
  it("happy path: idle → saving → printing → idle, reporting busy for the buttons", () => {
    const seen: SettleState[] = [];
    const f = createSettleFlow((s) => seen.push(s));
    expect(f.state).toBe("idle");
    expect(f.begin()).toBe(true);
    expect(f.busy).toBe(true);
    f.saved();
    expect(f.state).toBe("printing");
    f.finish();
    expect(f.state).toBe("idle");
    expect(f.busy).toBe(false);
    expect(seen).toEqual(["saving", "printing", "idle"]);
  });

  it("a second Settle while saving OR printing is refused (the double-invoice window)", () => {
    const f = createSettleFlow();
    expect(f.begin()).toBe(true);
    expect(f.begin()).toBe(false); // saving
    f.saved();
    expect(f.begin()).toBe(false); // printing — this used to be allowed
    f.finish();
    expect(f.begin()).toBe(true); // next order
  });

  it("fail() releases only before the invoice is saved", () => {
    const f = createSettleFlow();
    f.begin();
    f.fail(); // validation stop / server error
    expect(f.state).toBe("idle");

    f.begin();
    f.saved();
    f.fail(); // the `finally` of the save step after a successful save → must NOT release
    expect(f.state).toBe("printing");
    f.finish();
    expect(f.state).toBe("idle");
  });

  it("finish() from saving also releases (save succeeded without a print step)", () => {
    const f = createSettleFlow();
    f.begin();
    f.finish();
    expect(f.state).toBe("idle");
  });

  it("calls in the wrong state are harmless no-ops and do not notify", () => {
    const seen: SettleState[] = [];
    const f = createSettleFlow((s) => seen.push(s));
    f.saved();
    f.fail();
    f.finish();
    expect(f.state).toBe("idle");
    expect(seen).toEqual([]);
  });

  it("the full submit sequence as wired in usePosCheckoutFlow", async () => {
    const flags: boolean[] = [];
    const f = createSettleFlow((s) => flags.push(s !== "idle")); // → dispatch(setIsSettling(...))
    // submitSettlementForEmployee
    expect(f.begin()).toBe(true);
    // ...invoice saved
    f.saved();
    // finally of submit
    f.fail();
    expect(f.busy).toBe(true); // buttons stay disabled while printing
    // finalizeSettlement: print (async) + clear cart, then finally
    await Promise.resolve();
    f.finish();
    expect(flags).toEqual([true, true, false]);
  });
});
