// @vitest-environment jsdom
/** Branch Master header and footer lines: what the bills print and what the live preview shows. */
import { createElement } from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import ReceiptPreview from "../features/inventory/branches/components/ReceiptPreview";
import { getLineGapStyle, getLineStyle, printLineHtml } from "../features/inventory/branches/utils/lineHelpers";
import { fetchBranchPrintData, refreshTerminalPrintData } from "../features/inventory/branches/services/branchApi";
import { generateGuestPrintHtml } from "../features/pos/utils/guestPrintTemplate";
import { generateKotHtml } from "../features/pos/utils/kotTemplate";
import axiosInstance from "../api/axiosInstance";
import type { LineItem } from "../features/inventory/branches/types";

vi.mock("../api/axiosInstance", () => ({ default: { get: vi.fn() } }));

const line = (code: string, value: string, over: Partial<LineItem> = {}): LineItem => ({
  id: code, code, value, fontFamily: "Courier", fontStyle: "Regular", fontSize: "Medium", offsetX: 0,
  section: code.startsWith("H") ? "header" : "footer", ...over,
});
const cache = (lines: LineItem[]) => localStorage.setItem("branchPrintData", JSON.stringify(lines));
const items = [{ uniqueId: "a", productId: 1, quantity: 1, price: 1, lineTotal: 1, product: { id: 1, name: "Burger", price: 1 } }] as never;
const data = { orderNo: "1", ticketNo: "1", orderType: "TakeOut", netAmount: 1 } as never;
const settled = { ...(data as object), isSettlement: true, invoiceNo: "9" } as never;
const text = (html: string) => html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("billArabic", "Enable");
  vi.clearAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => cleanup());

describe.each([["guest bill", data], ["settle bill", settled]])("%s", (_name, printData) => {
  it("has no fixed closing text: only the backend's footer lines", async () => {
    cache([line("H1", "Demo Company"), line("F1", "See you soon")]);
    const t = text(await generateGuestPrintHtml(items, printData));
    expect(t).toContain("Demo Company");
    expect(t).toContain("See you soon");
    expect(t).not.toMatch(/thank you/i);
    expect(t).not.toMatch(/good day/i);
  });

  it("prints no footer at all when the backend has none", async () => {
    cache([line("H1", "Demo Company")]);
    const t = text(await generateGuestPrintHtml(items, printData));
    expect(t.trim().endsWith("Demo Company")).toBe(false);
    expect(t).not.toMatch(/thank you/i);
  });

  it("keeps footer lines in the backend's order, each with its own position", async () => {
    cache([line("F1", "First", { offsetX: 50 }), line("F2", "Second", { offsetX: 100 })]);
    const html = await generateGuestPrintHtml(items, printData);
    expect(html.indexOf("First")).toBeLessThan(html.indexOf("Second"));
    expect(html).toMatch(/text-align:center[^>]*>First/);
    expect(html).toMatch(/text-align:right[^>]*>Second/);
  });

  it("shows special characters as typed and they cannot break the bill", async () => {
    cache([line("H1", "A<B & Co"), line("F1", "<script>x</script>")]);
    const html = await generateGuestPrintHtml(items, printData);
    expect(html).toContain("A&lt;B &amp; Co");
    expect(html).not.toContain("<script>x");
  });
});

describe("a line placed between the snap points", () => {
  it("gets a gap that gives way first, never padding that forces a wrap", () => {
    const html = printLineHtml(line("H3", "Building:65,Road:2003,Block:320", { offsetX: 6 }));
    expect(html).toContain("display:flex");
    expect(html).toContain("flex:0 1 6%");
    expect(html).toContain("min-width:0");
    expect(html).toContain("flex:0 0 auto;max-width:100%");
    expect(html).not.toContain("padding-left");
  });

  it.each([[0, "left"], [50, "center"], [100, "right"]])("position %s stays plain text-align %s", (offsetX, align) => {
    const html = printLineHtml(line("H1", "Demo", { offsetX }));
    expect(html).toContain(`text-align:${align}`);
    expect(html).not.toContain("<span");
    expect(getLineGapStyle(line("H1", "Demo", { offsetX }))).toBeNull();
  });

  it("Arabic keeps the same position on the row and reads right to left", () => {
    const html = printLineHtml(line("H3", "مطعم", { offsetX: 20 }));
    expect(html).toMatch(/direction:ltr[^>]*><span style="flex:0 1 20%/);
    expect(html).toMatch(/direction:rtl">مطعم/);
  });

  it("bills use it", async () => {
    cache([line("H3", "Building:65", { offsetX: 6 }), line("F1", "Bye", { offsetX: 12 })]);
    const html = await generateGuestPrintHtml(items, data);
    expect(html).toContain("flex:0 1 6%");
    expect(html).toContain("flex:0 1 12%");
  });
});

describe("kitchen ticket header", () => {
  it("special characters cannot break it", async () => {
    cache([line("H1", "A<B")]);
    const html = await generateKotHtml(items, { orderNo: "1", companyNameKot: true } as never);
    expect(html).toContain("A&lt;B");
  });
});

describe("live preview", () => {
  const open = (lines: LineItem[], activeTab: "kot" | "end" = "kot") =>
    render(createElement(ReceiptPreview, { branchName: "Main", allLines: lines, activeTab, onOffsetChange: vi.fn() }));

  it.each([[0, "Small", "Regular"], [25, "Large", "Bold"], [50, "Medium", "Regular"], [100, "Large", "Regular"]])(
    "position %s, %s, %s uses the print's own style", (offsetX, fontSize, fontStyle) => {
      const item = line("H1", "Demo Company", { offsetX, fontSize, fontStyle });
      open([item]);
      const text = screen.getByText("Demo Company");
      const shown = (getLineGapStyle(item) ? text.parentElement : text) as HTMLElement;
      const printed = getLineStyle(item);
      expect(shown.style.fontSize).toBe(printed.fontSize);
      expect(shown.style.textAlign).toBe(printed.textAlign ?? "");
      expect(shown.style.textRendering.toLowerCase()).toBe("geometricprecision");
      expect(shown.style.whiteSpace).toBe("");
    });

  it("is as wide as the receipt, with the same side space and no extra indent", () => {
    open([line("H1", "Demo Company")]);
    const shown = screen.getByText("Demo Company");
    expect(shown.closest('[style*="width: 288px"]')).not.toBeNull();
    expect(shown.closest(".px-3")).not.toBeNull();
    expect(shown.closest(".pl-3")).toBeNull();
  });

  it("bill tab: no branch name, because the bill does not print it", () => {
    open([line("H1", "Demo Company")]);
    expect(screen.queryByText("Main")).toBeNull();
  });

  it("end report tab keeps the branch name", () => {
    open([line("EH1", "Report", { section: "dayEndHeader" })], "end");
    expect(screen.getByText("Main")).toBeTruthy();
  });

  it("shows the real bill between the lines, with no fixed closing text", async () => {
    open([line("H1", "Demo Company"), line("F1", "Bye")]);
    const frame = screen.getByTitle("Sample bill") as HTMLIFrameElement;
    await waitFor(() => expect(frame.getAttribute("srcdoc")).toContain("GUEST PRINT"));
    const body = frame.getAttribute("srcdoc") as string;
    expect(body).toContain("ITEM 123");
    expect(body).not.toMatch(/thank you/i);
    expect(body).not.toContain("Demo Company");
  });

  it("empty lines are not shown", () => {
    open([line("H1", ""), line("F1", "")]);
    expect(screen.getByText("Header lines appear here")).toBeTruthy();
    expect(screen.getByText("Footer lines appear here")).toBeTruthy();
  });
});

describe("after a branch is saved", () => {
  const backendSends = (rows: unknown) => (axiosInstance.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { data: rows } });

  it("this device's next print uses the new lines", async () => {
    cache([line("H1", "Old")]);
    backendSends([{ code: "H1", value: "New", section: "header", offsetX: 50 }]);
    await refreshTerminalPrintData(2);
    expect((axiosInstance.get as ReturnType<typeof vi.fn>).mock.calls[0][0]).toContain("/branches/2/");
    expect(text(await generateGuestPrintHtml(items, data))).toContain("New");
  });

  it("keeps the old lines when the backend returns nothing or fails", async () => {
    cache([line("H1", "Old")]);
    backendSends([]);
    await refreshTerminalPrintData(2);
    expect(localStorage.getItem("branchPrintData")).toContain("Old");
    (axiosInstance.get as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("down"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await refreshTerminalPrintData(2);
    expect(localStorage.getItem("branchPrintData")).toContain("Old");
  });

  it("does nothing on a device with no terminal branch", async () => {
    await refreshTerminalPrintData(0);
    expect(axiosInstance.get).not.toHaveBeenCalled();
  });

  it("reads position and font from the backend", async () => {
    backendSends([{ code: "F2", lineValue: "Bye", offsetX: 25, fontSize: "Large", fontStyle: "Bold" }]);
    const [row] = await fetchBranchPrintData(2);
    expect(row).toMatchObject({ section: "footer", value: "Bye", offsetX: 25, fontSize: "Large", fontStyle: "Bold" });
  });
});
