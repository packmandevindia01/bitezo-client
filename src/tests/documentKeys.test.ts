// @vitest-environment jsdom
/** Shared Enter-key and focus helpers of the Back Office document pages (shared/documentForm/documentKeys). */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  focusOnEnter, focusNextField, makeRowEnter, limitDigitsKeyDown, limitDigitsPaste, focusLineQty, focusLineProduct, focusFieldLater,
} from "../features/transaction/shared/documentForm/documentKeys";

const key = (k: string, target?: Element, extra: Record<string, unknown> = {}) =>
  ({ key: k, target, currentTarget: target, preventDefault: vi.fn(), ...extra }) as never;
const focused = () => document.activeElement?.id;

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = `
    <input id="a" /><input id="ro" readonly /><input id="b" /><button id="save">Save</button>
    <input id="product-select-0" /><input name="items.0.qty" id="qty0" />`;
});
afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ""; });

describe("focus helpers", () => {
  it("focusOnEnter moves on Enter only, now or after a delay", () => {
    focusOnEnter(key("Tab"), "b");
    expect(focused()).not.toBe("b");
    focusOnEnter(key("Enter"), "b");
    expect(focused()).toBe("b");
    focusOnEnter(key("Enter"), "save", 50);
    expect(focused()).toBe("b");
    vi.advanceTimersByTime(50);
    expect(focused()).toBe("save");
  });

  it("focusNextField skips read-only fields", () => {
    focusNextField(key("Enter", document.getElementById("a")!));
    expect(focused()).toBe("b");
  });

  it("focusLineQty, focusFieldLater", () => {
    focusLineQty(0);
    expect(focused()).toBe("qty0");
    focusFieldLater("a", 100);
    vi.advanceTimersByTime(99);
    expect(focused()).toBe("qty0");
    vi.advanceTimersByTime(1);
    expect(focused()).toBe("a");
  });

  it("focusLineProduct tries once more when the new line is not drawn yet", () => {
    focusLineProduct(1, 100);
    vi.advanceTimersByTime(100);
    const late = document.createElement("input");
    late.id = "product-select-1";
    document.body.appendChild(late);
    vi.advanceTimersByTime(50);
    expect(focused()).toBe("product-select-1");
  });
});

describe("makeRowEnter", () => {
  it("on an empty line drops it (not the only one) and leaves the grid", () => {
    const removeRow = vi.fn();
    makeRowEnter({ getRowProduct: () => " ", rowCount: 2, removeRow, exitToId: "save" })(key("Enter"), 1);
    expect(removeRow).toHaveBeenCalledWith(1);
    vi.advanceTimersByTime(50);
    expect(focused()).toBe("save");
  });

  it("keeps the only line, and moves on from a filled one", () => {
    const removeRow = vi.fn();
    makeRowEnter({ getRowProduct: () => "", rowCount: 1, removeRow, exitToId: "save" })(key("Enter"), 0);
    expect(removeRow).not.toHaveBeenCalled();
    makeRowEnter({ getRowProduct: () => "5", rowCount: 1, removeRow, exitToId: "save" })(key("Enter", document.getElementById("a")!), 0);
    expect(focused()).toBe("b");
  });
});

describe("number cell limits", () => {
  const input = (value: string) => Object.assign(document.createElement("input"), { value });

  it("blocks minus / exponent and typing past the limit, allows editing keys", () => {
    const e1 = key("-", input("1"));
    limitDigitsKeyDown(e1, 7);
    expect((e1 as { preventDefault: ReturnType<typeof vi.fn> }).preventDefault).toHaveBeenCalled();
    const full = input("1234567");
    const e2 = key("8", full);
    limitDigitsKeyDown(e2, 7);
    expect((e2 as { preventDefault: ReturnType<typeof vi.fn> }).preventDefault).toHaveBeenCalled();
    const e3 = key("Backspace", full);
    limitDigitsKeyDown(e3, 7);
    expect((e3 as { preventDefault: ReturnType<typeof vi.fn> }).preventDefault).not.toHaveBeenCalled();
    const onEnter = vi.fn();
    limitDigitsKeyDown(key("Enter", full), 7, onEnter);
    expect(onEnter).toHaveBeenCalled();
  });

  it("cuts a paste to the limit and stores it", () => {
    const el = input("12");
    el.setSelectionRange(2, 2);
    const setValue = vi.fn();
    limitDigitsPaste(key("v", el, { clipboardData: { getData: () => "34567" } }), 5, setValue);
    expect(setValue).toHaveBeenCalledWith("12345");
    expect(el.value).toBe("12345");
  });
});
