/** Phase 2d — popup layer stack (shared/lib/layers.ts): only the top popup owns Esc; page shortcuts stay quiet. */
import { describe, it, expect, beforeEach } from "vitest";
import { openLayer, closeLayer, isTopLayer, hasOpenLayers, openLayerCount, subscribeLayers, resetLayers } from "@shared/lib/layers";

beforeEach(() => resetLayers());

describe("popup layers", () => {
  it("no popup open → page shortcuts may run", () => {
    expect(hasOpenLayers()).toBe(false);
  });

  it("the most recently opened popup is the top one", () => {
    const a = openLayer();
    const b = openLayer(); // e.g. a confirmation on top of the extras screen
    expect(isTopLayer(b)).toBe(true);
    expect(isTopLayer(a)).toBe(false);
    closeLayer(b);
    expect(isTopLayer(a)).toBe(true);
    closeLayer(a);
    expect(hasOpenLayers()).toBe(false);
  });

  it("closing a lower popup first keeps the top one on top", () => {
    const a = openLayer();
    const b = openLayer();
    closeLayer(a);
    expect(isTopLayer(b)).toBe(true);
    expect(openLayerCount()).toBe(1);
  });

  it("closing twice / unknown ids is harmless", () => {
    const a = openLayer();
    closeLayer(a);
    closeLayer(a);
    closeLayer(999);
    expect(openLayerCount()).toBe(0);
  });

  it("notifies subscribers on open / close", () => {
    let calls = 0;
    const off = subscribeLayers(() => calls++);
    const a = openLayer();
    closeLayer(a);
    off();
    openLayer();
    expect(calls).toBe(2);
  });
});
