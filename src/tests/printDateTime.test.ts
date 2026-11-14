/**
 * Back Office transaction prints (2026-11-14): document date + saved time in 12-hour AM/PM, and "Printed on".
 */
import { describe, it, expect } from "vitest";
import { formatDocDateTime, formatPrintedOn, formatTime12, pickSavedAt } from "../utils/printDateTime";

describe("formatTime12", () => {
  it("12-hour with AM / PM; midnight 12 AM, noon 12 PM", () => {
    expect(formatTime12(new Date(2026, 10, 7, 15, 25))).toBe("03:25 PM");
    expect(formatTime12(new Date(2026, 10, 7, 9, 5))).toBe("09:05 AM");
    expect(formatTime12(new Date(2026, 10, 7, 0, 10))).toBe("12:10 AM");
    expect(formatTime12(new Date(2026, 10, 7, 12, 0))).toBe("12:00 PM");
  });
});

describe("formatDocDateTime", () => {
  it("document date as dd/MM/yyyy plus the saved time", () => {
    expect(formatDocDateTime("2026-11-07", "2026-11-07T15:25:00")).toBe("07/11/2026 03:25 PM");
    expect(formatDocDateTime("07/11/2026", "2026-11-07T08:40:00")).toBe("07/11/2026 08:40 AM");
  });
  it("no usable saved time → the date alone", () => {
    expect(formatDocDateTime("2026-11-07", "")).toBe("07/11/2026");
    expect(formatDocDateTime("2026-11-07", undefined)).toBe("07/11/2026");
    expect(formatDocDateTime("2026-11-07", "2026-11-07T00:00:00")).toBe("07/11/2026");
    expect(formatDocDateTime("2026-11-07", "0001-01-01T00:00:00")).toBe("07/11/2026");
  });
  it("empty date with a saved time uses the saved date", () => {
    expect(formatDocDateTime("", "2026-11-07T15:25:00")).toBe("07/11/2026 03:25 PM");
    expect(formatDocDateTime("", "")).toBe("");
  });
});

describe("pickSavedAt", () => {
  it("takes the backend's created time, whatever its field name", () => {
    expect(new Date(pickSavedAt({ createdAt: "2026-11-07T15:25:00" })).getHours()).toBe(15);
    expect(new Date(pickSavedAt({ CreatedDate: "2026-11-07T09:10:00" })).getHours()).toBe(9);
  });
  it("ignores placeholders and date-only values", () => {
    expect(pickSavedAt({ createdAt: "0001-01-01T00:00:00" })).toBe("");
    expect(pickSavedAt({ createdAt: "1900-01-01T00:00:00" })).toBe("");
    expect(pickSavedAt({ createdAt: "2026-11-07" })).toBe("");
    expect(pickSavedAt({})).toBe("");
    expect(pickSavedAt(null)).toBe("");
  });
});

describe("formatPrintedOn", () => {
  it("dd/MM/yyyy hh:mm AM/PM", () => {
    expect(formatPrintedOn(new Date(2026, 10, 14, 12, 11))).toBe("14/11/2026 12:11 PM");
  });
});
