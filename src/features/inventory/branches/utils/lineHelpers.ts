import type { LineItem } from "../types";

let counter = 0;

export const makeLines = (section: "header" | "footer"): LineItem[] =>
  Array.from({ length: 7 }, (_, i) => ({
    id: `${section}-${i}-${++counter}`,
    value: "",
    fontFamily: "Inter",
    fontStyle: "Regular",
    fontSize: "12",
    offsetX: 0, // 0 = left, 50 = center, 100 = right
    section,
  }));

export const getLineStyle = (item: LineItem): React.CSSProperties => ({
  fontFamily: item.fontFamily,
  fontWeight: item.fontStyle.includes("Bold") ? "bold" : "normal",
  fontStyle: item.fontStyle.includes("Italic") ? "italic" : "normal",
  fontSize: `${item.fontSize}px`,
  position: "relative",
  left: `${item.offsetX}%`,
  transform: item.offsetX === 50 ? "translateX(-50%)" : item.offsetX > 50 ? "translateX(-100%)" : "none",
  display: "inline-block",
  maxWidth: "100%",
  whiteSpace: "nowrap",
});

export const getPreviewLineStyle = (item: LineItem): React.CSSProperties => ({
  ...getLineStyle(item),
  fontSize: `${Math.min(Number(item.fontSize), 13)}px`,
});

export const FONT_FAMILIES = [
  "Inter", "Arial", "Times New Roman", "Courier New",
  "Georgia", "Verdana", "Tahoma", "Trebuchet MS",
  "Comic Sans MS", "Impact",
];
export const FONT_STYLES = ["Regular", "Bold", "Italic", "Bold Italic"];
export const FONT_SIZES = ["8", "9", "10", "11", "12", "13", "14", "16", "18", "20", "24", "28", "32"];