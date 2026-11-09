import { escapeHtml } from "../../../../utils/html";
import { DEFAULT_RECEIPT_FONT, RECEIPT_FONT_NAMES, RECEIPT_WEIGHT_BOLD, RECEIPT_WEIGHT_REGULAR, receiptFontStack } from "@shared/lib/receiptFonts";
import type { LineItem } from "../types";

export const getSectionPrefix = (section: "header" | "footer" | "dayEndHeader"): string => {
  if (section === "header") return "H";
  if (section === "footer") return "F";
  return "EH";
};

export const makeLines = (section: "header" | "footer" | "dayEndHeader", length: number = 7): LineItem[] => {
  const prefix = getSectionPrefix(section);
  return Array.from({ length }, (_, i) => {
    const code = `${prefix}${i + 1}`;
    return {
      id: code,
      code,
      value: "",
      fontFamily: DEFAULT_RECEIPT_FONT,
      fontStyle: "Regular",
      fontSize: "Medium",
      offsetX: 0, // 0 = left, 50 = center, 100 = right
      section,
    };
  });
};

export const resolveFontSizePx = (fontSize?: string): number => {
  const sizeLower = String(fontSize || "").toLowerCase();
  if (sizeLower === "small") return 13;
  if (sizeLower === "large") return 18;
  if (sizeLower === "medium") return 15;
  const parsed = parseInt(sizeLower, 10);
  if (!isNaN(parsed)) return Math.max(12, parsed);
  return 15;
};

const ARABIC_TEXT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export const getLineStyle = (item: LineItem): React.CSSProperties => {
  const isBold = String(item.fontStyle || "").toLowerCase().includes("bold");
  const isItalic = String(item.fontStyle || "").toLowerCase().includes("italic");
  const fontSizePx = resolveFontSizePx(item.fontSize);
  const isArabic = ARABIC_TEXT.test(String(item.value || ""));

  const arabicFont = "'Cairo', 'Segoe UI', Tahoma, Arial, 'Traditional Arabic', sans-serif";

  const baseStyle: React.CSSProperties = {
    fontFamily: isArabic ? arabicFont : receiptFontStack(item.fontFamily),
    fontWeight: isBold ? RECEIPT_WEIGHT_BOLD : RECEIPT_WEIGHT_REGULAR,
    fontStyle: isItalic ? "italic" : "normal",
    fontSize: `${fontSizePx}px`,
    color: "#000000",
    wordBreak: isArabic ? "normal" : "break-word",
    overflowWrap: isArabic ? "break-word" : undefined,
    boxSizing: "border-box",
    lineHeight: 1.35,
    letterSpacing: "normal",
    direction: isArabic ? "rtl" : undefined,
    unicodeBidi: isArabic ? "embed" : undefined,
    textRendering: "geometricPrecision", // the print body uses it: text must measure the same in the preview
  };

  const offset = typeof item.offsetX === "number" ? Math.max(0, Math.min(100, item.offsetX)) : 0;

  if (offset === 0) {
    return {
      ...baseStyle,
      textAlign: "left",
      paddingLeft: 0,
      display: "block",
      width: "100%",
    };
  }
  if (offset === 50) {
    return {
      ...baseStyle,
      textAlign: "center",
      margin: "0 auto",
      display: "block",
      width: "100%",
    };
  }
  if (offset === 100) {
    return {
      ...baseStyle,
      textAlign: "right",
      paddingRight: 0,
      display: "block",
      width: "100%",
    };
  }

  // Between the snap points the line is a row: a shrinkable gap, then the text (see getLineGapStyle).
  return {
    ...baseStyle,
    display: "flex",
    width: "100%",
    direction: "ltr",
  };
};

const hasCustomOffset = (item: LineItem): boolean =>
  typeof item.offsetX === "number" && item.offsetX > 0 && item.offsetX < 100 && item.offsetX !== 50;

/**
 * The gap before a line placed between the snap points, or null for left / centre / right lines. It gives way first:
 * a line too long for its position moves left instead of dropping its last letters onto a new row.
 */
export const getLineGapStyle = (item: LineItem): React.CSSProperties | null =>
  hasCustomOffset(item) ? { flex: `0 1 ${item.offsetX}%`, minWidth: 0 } : null;

export const getLineTextStyle = (item: LineItem): React.CSSProperties => ({
  flex: "0 0 auto",
  maxWidth: "100%",
  direction: getLineStyleDirection(item),
});

const getLineStyleDirection = (item: LineItem): "rtl" | "ltr" =>
  ARABIC_TEXT.test(String(item.value || "")) ? "rtl" : "ltr";

const toCssText = (style: React.CSSProperties): string =>
  Object.entries(style)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}:${value}`)
    .join(";");

/** One header / footer line for every printed document. Same layout as the Branch Master preview (PreviewLine). */
export const printLineHtml = (item: LineItem): string => {
  const text = escapeHtml(item.value);
  const gap = getLineGapStyle(item);
  const content = gap
    ? `<span style="${toCssText(gap)}"></span><span style="${toCssText(getLineTextStyle(item))}">${text}</span>`
    : text;
  return `<div dir="auto" style="${toCssText(getLineStyle(item))}">${content}</div>`;
};

export const FONT_FAMILIES = RECEIPT_FONT_NAMES;

export const FONT_STYLES = ["Regular", "Bold"];

export const FONT_SIZES = ["Small", "Medium", "Large"];