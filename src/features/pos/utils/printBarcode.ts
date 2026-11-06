import JsBarcode from "jsbarcode";
import { escapeHtml } from "../../../utils/html";

/**
 * Code 128 barcode for receipts, drawn as plain black <div> bars.
 *
 * Receipts are rendered at 288 CSS px = 576 printer dots (1 CSS px = 2 dots), then cut to 1-bit, so a bar that
 * lands between two dots prints one dot too wide. Bars therefore start on a whole CSS px and are a whole number of
 * dots wide. 3-dot bars still scan when the thermal head prints them slightly thick; 2-dot bars are only for values
 * too long to fit otherwise. Tested through html2canvas: SVG and PNG images do not keep the bars exact.
 */
const CONTENT_WIDTH_DOTS = 544; // 272 CSS px: the 288 px receipt minus the body's 8 px side padding
const QUIET_ZONE_MODULES = 10;
const BAR_HEIGHT_PX = 40;

/** The barcode as modules, "1" = black, "0" = white. Null when the value cannot be encoded. */
export const code128Modules = (value: string): string | null => {
  try {
    const encoded: { encodings?: { data: string }[] } = {};
    JsBarcode(encoded, value, { format: "CODE128" });
    return encoded.encodings?.map((e) => e.data).join("") || null;
  } catch {
    return null;
  }
};

const barDots = (moduleCount: number): number | null => {
  const totalModules = moduleCount + QUIET_ZONE_MODULES * 2;
  if (totalModules * 3 <= CONTENT_WIDTH_DOTS) return 3;
  if (totalModules * 2 <= CONTENT_WIDTH_DOTS) return 2;
  return null;
};

const barsHtml = (modules: string, dots: number): string => {
  const widthPx = (modules.length * dots) / 2;
  const leftPx = Math.floor((CONTENT_WIDTH_DOTS / 2 - widthPx) / 2);
  const bars = (modules.match(/1+|0+/g) ?? [])
    .map((run) => {
      const color = run[0] === "1" ? "#000000" : "#ffffff";
      return `<div style="flex:none; width:${(run.length * dots) / 2}px; height:${BAR_HEIGHT_PX}px; background:${color};"></div>`;
    })
    .join("");
  // ltr: an Arabic receipt must not reverse the bars
  return `<div dir="ltr" style="display:flex; direction:ltr; width:${widthPx}px; height:${BAR_HEIGHT_PX}px; margin-left:${leftPx}px;">${bars}</div>`;
};

/**
 * Barcode with the number under it, so staff can type it if a scan fails. A value that cannot be encoded prints as
 * the number alone (the bill still prints); no value prints nothing.
 */
export const barcodeHtml = (value: string | null | undefined): string => {
  const text = (value ?? "").trim();
  if (!text) return "";
  const modules = code128Modules(text);
  const dots = modules ? barDots(modules.length) : null;
  const caption = `<div style="text-align:center; font-size:12px; font-weight:bold; letter-spacing:1px; margin-top:2px;">${escapeHtml(text)}</div>`;
  return modules && dots ? barsHtml(modules, dots) + caption : caption;
};
