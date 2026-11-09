// @vitest-environment jsdom
/** Branch Master font picker and the fonts receipts print in. */
import { createElement } from "react";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  RECEIPT_FONT_NAMES, ensureReceiptFonts, receiptFontFaceCss, receiptFontStack, resolveReceiptFont, withReceiptFontFaces,
} from "../shared/lib/receiptFonts";
import { FONT_FAMILIES, FONT_SIZES, FONT_STYLES, getLineStyle, makeLines, printLineHtml, resolveFontSizePx } from "../features/inventory/branches/utils/lineHelpers";
import FontModal from "../features/inventory/branches/components/FontModal";
import type { LineItem } from "../features/inventory/branches/types";

vi.mock("../components/common", () => ({
  Modal: ({ children, footer }: { children: unknown; footer: unknown }) => createElement("div", null, children as never, footer as never),
  Button: ({ onClick }: { onClick: () => void }) => createElement("button", { onClick }, "btn"),
}));

const line = (over: Partial<LineItem>): LineItem => ({
  id: "H1", code: "H1", value: "Packman", fontFamily: "Roboto", fontStyle: "Regular", fontSize: "Medium", offsetX: 50, section: "header", ...over,
});

afterEach(() => cleanup());
beforeEach(() => document.getElementById("receipt-fonts")?.remove());

describe("the font list", () => {
  it("is what the picker offers", () => {
    expect(FONT_FAMILIES).toEqual(RECEIPT_FONT_NAMES);
    expect(FONT_FAMILIES).toHaveLength(8);
  });

  it("every font ships with the app, in both weights", () => {
    const urls = [...receiptFontFaceCss().matchAll(/fonts\/receipt\/([\w-]+\.woff2)/g)].map((m) => m[1]);
    expect(urls).toHaveLength(16);
    const shipped = Object.keys(import.meta.glob("/public/fonts/receipt/*.woff2")).map((path) => path.split("/").pop());
    expect([...urls].sort()).toEqual([...shipped].sort());
  });

  it("new branch lines start in the default font", () => {
    expect(makeLines("header")[0].fontFamily).toBe("Roboto");
  });
});

describe("saved font names", () => {
  it.each([
    ["Arial", "Roboto"], ["Courier", "JetBrains Mono"], ["FontA", "JetBrains Mono"], ["FontB", "Roboto Condensed"],
    ["Times New Roman", "Roboto Slab"], ["Monospace", "JetBrains Mono"], ["Inter", "Inter"], ["roboto slab", "Roboto Slab"],
    ["Something else", "Roboto"], ["", "Roboto"], [null, "Roboto"], [undefined, "Roboto"],
  ])("%s prints in %s", (saved, font) => {
    expect(resolveReceiptFont(saved)).toBe(font);
  });
});

describe("how a line is styled", () => {
  it("uses the chosen font first, then system fonts", () => {
    expect(getLineStyle(line({ fontFamily: "Oswald" })).fontFamily).toBe(receiptFontStack("Oswald"));
    expect(receiptFontStack("Oswald").startsWith("'Oswald',")).toBe(true);
  });

  it("Regular and Bold are different weights", () => {
    expect(getLineStyle(line({ fontStyle: "Regular" })).fontWeight).toBe(500);
    expect(getLineStyle(line({ fontStyle: "Bold" })).fontWeight).toBe(700);
  });

  it.each([["Small", 13], ["Medium", 15], ["Large", 18]])("%s is %spx", (size, px) => {
    expect(resolveFontSizePx(size)).toBe(px);
    expect(getLineStyle(line({ fontSize: size })).fontSize).toBe(`${px}px`);
  });

  it("no outline that clogs small letters on a thermal head", () => {
    expect(getLineStyle(line({})).WebkitTextStroke).toBeUndefined();
    expect(printLineHtml(line({}))).not.toContain("stroke");
  });

  it("the printed line carries font, weight and size", () => {
    const html = printLineHtml(line({ fontFamily: "Poppins", fontStyle: "Bold", fontSize: "Large" }));
    expect(html).toContain("font-family:'Poppins'");
    expect(html).toContain("font-weight:700");
    expect(html).toContain("font-size:18px");
  });

  it("Arabic text keeps its Arabic font", () => {
    expect(String(getLineStyle(line({ value: "مطعم" })).fontFamily)).toContain("Cairo");
  });
});

describe("loading fonts for a print", () => {
  it("adds the definitions to the receipt's head, or the front without one", () => {
    expect(withReceiptFontFaces("<html><head><title>x</title></head></html>")).toMatch(/^<html><head><style>@font-face/);
    expect(withReceiptFontFaces("<div>x</div>")).toMatch(/^<style>@font-face.*<div>x<\/div>$/);
  });

  it("a $ in a receipt is left alone", () => {
    expect(withReceiptFontFaces("<head>$& $1")).toContain("</style>$& $1");
  });

  const fakeFonts = (load: ReturnType<typeof vi.fn>) => Object.defineProperty(document, "fonts", { configurable: true, value: { load } });

  it("loads only the fonts this receipt uses, in both weights", async () => {
    const load = vi.fn().mockResolvedValue([]);
    fakeFonts(load);
    await ensureReceiptFonts(document, "<div style=\"font-family:'Oswald', Arial\">x</div>");
    expect(load.mock.calls.map(([f]) => f)).toEqual(["500 15px 'Oswald'", "700 15px 'Oswald'"]);
  });

  it("adds the definitions once", async () => {
    fakeFonts(vi.fn().mockResolvedValue([]));
    await ensureReceiptFonts();
    await ensureReceiptFonts();
    expect(document.querySelectorAll("#receipt-fonts")).toHaveLength(1);
  });

  it("a font that cannot load does not stop the print", async () => {
    fakeFonts(vi.fn().mockRejectedValue(new Error("offline")));
    await expect(ensureReceiptFonts()).resolves.toBeUndefined();
  });
});

describe("font picker", () => {
  const open = (temp: Record<string, string>) => {
    const onChange = vi.fn();
    render(createElement(FontModal, {
      state: { open: true, lineId: "H1", temp } as never, sampleText: "Packman Sample", onChange, onApply: vi.fn(), onClose: vi.fn(),
    }));
    return onChange;
  };
  const selected = (name: string) => screen.getByText(name).className.includes("bg-[#49293e]");

  it("lists every font in its own face", () => {
    open({ fontFamily: "Roboto", fontStyle: "Regular", fontSize: "Medium" });
    for (const font of FONT_FAMILIES) expect(screen.getByText(font).style.fontFamily).toContain(font);
    for (const s of [...FONT_STYLES, ...FONT_SIZES]) expect(screen.getByText(s)).toBeTruthy();
  });

  it("a line saved in Arial shows Roboto as chosen, the font it prints in", () => {
    open({ fontFamily: "Arial", fontStyle: "Bold", fontSize: "Large" });
    expect(selected("Roboto")).toBe(true);
    expect(selected("Bold")).toBe(true);
    expect(selected("Large")).toBe(true);
  });

  it("the sample shows the choice exactly as printed", () => {
    open({ fontFamily: "Oswald", fontStyle: "Bold", fontSize: "Large" });
    const sample = screen.getByText("Packman Sample");
    expect(sample.style.fontFamily).toContain("Oswald");
    expect(sample.style.fontWeight).toBe("700");
    expect(sample.style.fontSize).toBe("18px");
  });

  it("picking a font, style and size reports it", () => {
    const onChange = open({ fontFamily: "Roboto", fontStyle: "Regular", fontSize: "Medium" });
    fireEvent.click(screen.getByText("Poppins"));
    fireEvent.click(screen.getByText("Bold"));
    fireEvent.click(screen.getByText("Small"));
    expect(onChange.mock.calls.map(([c]) => c)).toEqual([{ fontFamily: "Poppins" }, { fontStyle: "Bold" }, { fontSize: "Small" }]);
  });
});
