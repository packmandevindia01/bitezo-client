/**
 * Recall / Settled preview date + time (2026-11-14): 12-hour AM/PM instead of 24-hour, as the prints already are.
 */
import { describe, it, expect } from "vitest";
import { formatOrderDateTime } from "../features/pos/utils/orderDateTime";

describe("formatOrderDateTime", () => {
  it("afternoon / evening times show PM in 12-hour form", () => {
    expect(formatOrderDateTime("2026-11-14T19:46:02")).toBe("14/11/2026 07:46:02 PM");
    expect(formatOrderDateTime("2026-11-14T13:05:09")).toBe("14/11/2026 01:05:09 PM");
  });
  it("morning times show AM; midnight is 12 AM and noon 12 PM", () => {
    expect(formatOrderDateTime("2026-11-14T09:30:00")).toBe("14/11/2026 09:30:00 AM");
    expect(formatOrderDateTime("2026-11-14T00:15:00")).toBe("14/11/2026 12:15:00 AM");
    expect(formatOrderDateTime("2026-11-14T12:00:00")).toBe("14/11/2026 12:00:00 PM");
  });
  it("a bare time from the recall list text gets today's date", () => {
    expect(formatOrderDateTime("7:46:02 PM", new Date(2026, 10, 14))).toBe("14/11/2026 7:46:02 PM");
  });
  it("empty → empty; unreadable text is shown as is", () => {
    expect(formatOrderDateTime("")).toBe("");
    expect(formatOrderDateTime(null)).toBe("");
    expect(formatOrderDateTime("pending")).toBe("pending");
  });
});
