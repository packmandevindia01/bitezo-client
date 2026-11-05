import { describe, it, expect } from "vitest";
import { toLocalDateString, firstOfMonthLocalString, localDateAtCurrentTimeIso } from "../utils/date";
import { escapeHtml } from "../utils/html";
import { calculateOrder } from "../features/pos/terminal/utils/billing";
import { generateKotHtml } from "../features/pos/utils/kotTemplate";
import { generateGuestPrintHtml } from "../features/pos/utils/guestPrintTemplate";

describe("local date helpers (UTC date bug)", () => {
  it("uses the LOCAL calendar day, not the UTC day", () => {
    // 00:30 local time: in GCC / India this is still the previous day in UTC.
    const justAfterMidnight = new Date(2026, 10, 5, 0, 30, 0);
    expect(toLocalDateString(justAfterMidnight)).toBe("2026-11-05");
    const lateEvening = new Date(2026, 10, 5, 23, 59, 59);
    expect(toLocalDateString(lateEvening)).toBe("2026-11-05");
  });

  it("first of month is the local 1st (was the last day of the previous month in UTC+ zones)", () => {
    expect(firstOfMonthLocalString(new Date(2026, 10, 20, 10))).toBe("2026-11-01");
    expect(firstOfMonthLocalString(new Date(2026, 0, 1, 0, 5))).toBe("2026-01-01");
  });

  it("chosen local day + current local time → the right instant", () => {
    const now = new Date(2026, 10, 6, 1, 15, 30, 250);
    const iso = localDateAtCurrentTimeIso("2026-11-05", now);
    const back = new Date(iso);
    expect(toLocalDateString(back)).toBe("2026-11-05");
    expect([back.getHours(), back.getMinutes(), back.getSeconds()]).toEqual([1, 15, 30]);
  });

  it("falls back to now for an invalid date string", () => {
    const now = new Date(2026, 10, 6, 9, 0, 0);
    expect(localDateAtCurrentTimeIso("", now)).toBe(now.toISOString());
  });
});

describe("escapeHtml (print templates)", () => {
  it("escapes markup characters", () => {
    expect(escapeHtml(`<img src=x onerror="alert(1)">`)).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(escapeHtml("FISH & CHIPS")).toBe("FISH &amp; CHIPS");
    expect(escapeHtml("O'Neil")).toBe("O&#39;Neil");
  });

  it("handles null / undefined / numbers", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(12)).toBe("12");
  });

  it("leaves Arabic text unchanged", () => {
    expect(escapeHtml("شاي كرك")).toBe("شاي كرك");
  });
});

describe("print templates escape DB / cashier text", () => {
  const evil = `<img src=x onerror=alert(1)>`;
  const lines = () => {
    localStorage.clear();
    localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true } }));
    localStorage.setItem("decimalPart", "3");
    localStorage.setItem("kotArabic", "Disable");
    localStorage.setItem("billArabic", "Disable");
    return calculateOrder(
      [{ uniqueId: "a", productId: 9, quantity: 1, price: 10, isIncl: true, product: { id: 9, name: evil, price: 10, vatValue: 10, isIncl: true } }] as any,
      { orderType: "Delivery", orderTypeId: 4 } as any
    ).lines as any;
  };
  const data: any = {
    orderNo: "900", ticketNo: "900", waiter: "w", counter: "C1", orderType: "Delivery", orderTypeId: 4,
    contactNo: "33445566", customerName: `Ali ${evil}`, address: `Road <b>1</b>`,
  };

  it("guest bill", async () => {
    const html = await generateGuestPrintHtml(lines(), data);
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<IMG SRC=X");
    expect(html).toContain("&lt;");
  });

  it("KOT", async () => {
    const html = await generateKotHtml(lines(), data);
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<IMG SRC=X");
    expect(html).toContain("&lt;");
  });
});

import { describeQueryError, reportQueryError, QUERY_ERROR_EVENT } from "../app/providers/queryErrors";

describe("query error toasts", () => {
  it("describes HTTP errors, ignores 401 and cancellations", () => {
    expect(describeQueryError({ response: { status: 403, data: { message: "Forbidden" } } })).toContain("No permission");
    expect(describeQueryError({ response: { status: 500, data: { message: "Boom" } } })).toBe("Could not load data (500): Boom");
    expect(describeQueryError({ message: "Cannot reach the server." })).toBe("Could not load data: Cannot reach the server.");
    expect(describeQueryError({ response: { status: 401 } })).toBeNull();
    expect(describeQueryError({ name: "CanceledError" })).toBeNull();
  });

  it("emits once for identical errors and respects silentError", () => {
    const seen: string[] = [];
    const target = new EventTarget();
    (globalThis as any).window = target;
    target.addEventListener(QUERY_ERROR_EVENT, (e) => seen.push((e as CustomEvent<string>).detail));
    const err = { response: { status: 500, data: { message: "dup-test" } } };
    reportQueryError(err);
    reportQueryError(err);
    reportQueryError({ response: { status: 500, data: { message: "silent" } } }, { silentError: true });
    expect(seen).toEqual(["Could not load data (500): dup-test"]);
    delete (globalThis as any).window;
  });
});
