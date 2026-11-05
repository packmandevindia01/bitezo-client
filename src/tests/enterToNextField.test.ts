/** Back Office Enter → next field: the "which field is next" rule (hooks/useEnterToNextField.ts). */
import { describe, it, expect } from "vitest";
import { pickNextField, type FieldInfo } from "../hooks/useEnterToNextField";

const f = (kind: FieldInfo["kind"], extra: Partial<FieldInfo> = {}): FieldInfo => ({ kind, ...extra });

describe("Enter moves to the next field", () => {
  it("goes to the next field in screen order", () => {
    expect(pickNextField([f("input"), f("input"), f("select")], 0)).toBe(1);
    expect(pickNextField([f("input"), f("input"), f("select")], 1)).toBe(2);
  });

  it("skips disabled, hidden, read-only and tabIndex -1 fields", () => {
    const fields = [f("input"), f("input", { disabled: true }), f("input", { hidden: true }), f("input", { readOnly: true }), f("input", { skip: true }), f("textarea")];
    expect(pickNextField(fields, 0)).toBe(5);
  });

  it("after the last field it lands on the Save (submit) button", () => {
    expect(pickNextField([f("input"), f("input"), f("submit")], 1)).toBe(2);
  });

  it("returns -1 when nothing follows (Enter then does nothing)", () => {
    expect(pickNextField([f("input"), f("input")], 1)).toBe(-1);
    expect(pickNextField([f("input"), f("submit", { disabled: true })], 0)).toBe(-1);
  });
});
