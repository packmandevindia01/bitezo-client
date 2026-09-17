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
      fontFamily: "Courier",
      fontStyle: "Regular",
      fontSize: "Medium",
      offsetX: 0, // 0 = left, 50 = center, 100 = right
      section,
    };
  });
};

export const resolveFontSizePx = (fontSize?: string, isPreview: boolean = false): number => {
  const sizeLower = String(fontSize || "").toLowerCase();
  if (sizeLower === "small") return isPreview ? 11 : 13;
  if (sizeLower === "large") return isPreview ? 15 : 18;
  if (sizeLower === "medium") return isPreview ? 13 : 15;
  const parsed = parseInt(sizeLower, 10);
  if (!isNaN(parsed)) return isPreview ? Math.min(parsed, 14) : Math.max(12, parsed);
  return isPreview ? 13 : 15;
};

export const getLineStyle = (item: LineItem): React.CSSProperties => {
  const isBold = String(item.fontStyle || "").toLowerCase().includes("bold");
  const isItalic = String(item.fontStyle || "").toLowerCase().includes("italic");
  const fontSizePx = resolveFontSizePx(item.fontSize, false);

  const baseStyle: React.CSSProperties = {
    fontFamily: item.fontFamily ? `${item.fontFamily}, 'Courier New', monospace` : "'Courier New', monospace",
    fontWeight: isBold ? "bold" : 600,
    fontStyle: isItalic ? "italic" : "normal",
    fontSize: `${fontSizePx}px`,
    color: "#000000",
    WebkitTextStroke: isBold ? "0.22px #000000" : "0.15px #000000",
    wordBreak: "break-word",
    boxSizing: "border-box",
    lineHeight: 1.35,
    letterSpacing: "0.2px",
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

  return {
    ...baseStyle,
    textAlign: "left",
    paddingLeft: `${offset}%`,
    display: "block",
    width: "100%",
  };
};

export const getPreviewLineStyle = (item: LineItem): React.CSSProperties => {
  const base = getLineStyle(item);
  const fontSizePx = resolveFontSizePx(item.fontSize, true);
  return {
    ...base,
    fontSize: `${fontSizePx}px`,
    whiteSpace: "nowrap",
  };
};

export const FONT_FAMILIES = [
  "Courier",
  "FontA",
  "FontB",
  "Inter",
  "Arial",
  "Times New Roman",
  "Monospace",
];

export const FONT_STYLES = ["Regular", "Bold"];

export const FONT_SIZES = ["Small", "Medium", "Large"];