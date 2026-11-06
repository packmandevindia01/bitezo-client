import { describe, it, expect, vi, beforeEach } from "vitest";
import { decideSettlePrint, getSettlePrintConfig, saveSettlePrintConfig } from "../features/pos/utils/settlePrintConfig";
import { mapApiToState, mapStateToApi } from "../features/pos/terminal/hooks/usePosConfiguration";

beforeEach(() => localStorage.clear());

describe("settle print setting", () => {
  it("nothing saved: print directly, no question", () => {
    expect(getSettlePrintConfig()).toEqual({ enabled: true, askBeforePrint: false });
  });

  it("is kept in this device's localStorage", () => {
    saveSettlePrintConfig({ enabled: true, askBeforePrint: true });
    expect(JSON.parse(localStorage.getItem("settlePrintConfig")!)).toEqual({ enabled: true, askBeforePrint: true });
    expect(getSettlePrintConfig()).toEqual({ enabled: true, askBeforePrint: true });
  });

  it("broken saved data falls back to printing directly", () => {
    localStorage.setItem("settlePrintConfig", "{oops");
    expect(getSettlePrintConfig()).toEqual({ enabled: true, askBeforePrint: false });
  });
});

describe("does this settlement print", () => {
  it("disabled: no print and no question, even if asking was on", async () => {
    saveSettlePrintConfig({ enabled: false, askBeforePrint: true });
    const ask = vi.fn();
    expect(await decideSettlePrint(ask)).toBe(false);
    expect(ask).not.toHaveBeenCalled();
  });

  it("enabled, direct: prints with no question", async () => {
    saveSettlePrintConfig({ enabled: true, askBeforePrint: false });
    const ask = vi.fn();
    expect(await decideSettlePrint(ask)).toBe(true);
    expect(ask).not.toHaveBeenCalled();
  });

  it("enabled, ask: Yes prints, No does not", async () => {
    saveSettlePrintConfig({ enabled: true, askBeforePrint: true });
    expect(await decideSettlePrint(async () => true)).toBe(true);
    expect(await decideSettlePrint(async () => false)).toBe(false);
  });
});

describe("POS config form", () => {
  it("loads the device setting, whatever the server sends", () => {
    saveSettlePrintConfig({ enabled: false, askBeforePrint: true });
    const form = mapApiToState({ configs: {} } as never);
    expect(form.settlePrint).toBe(false);
    expect(form.settlePrintAsk).toBe(true);
  });

  it("is not sent to the server", () => {
    const payload = mapStateToApi(mapApiToState({ configs: {} } as never), 1);
    expect(payload).not.toHaveProperty("settlePrint");
    expect(payload).not.toHaveProperty("settlePrintAsk");
  });
});
