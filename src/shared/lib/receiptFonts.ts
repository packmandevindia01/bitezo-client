/**
 * Fonts for printed receipts. The files ship with the app (public/fonts/receipt), so prints look the same on every
 * Windows terminal and Android device, with or without internet.
 *
 * A receipt is laid out in a hidden iframe and drawn on a canvas of the main page, so a font has to be loaded in BOTH
 * documents. `renderHtmlToCanvas` does this through `withReceiptFontFaces` and `ensureReceiptFonts`.
 */
const FONTS = [
  { name: "Roboto", file: "roboto" },
  { name: "Roboto Condensed", file: "roboto-condensed" },
  { name: "Inter", file: "inter" },
  { name: "Noto Sans", file: "noto-sans" },
  { name: "Poppins", file: "poppins" },
  { name: "Oswald", file: "oswald" },
  { name: "Roboto Slab", file: "roboto-slab" },
  { name: "JetBrains Mono", file: "jetbrains-mono" },
] as const;

export const RECEIPT_FONT_NAMES: string[] = FONTS.map((f) => f.name);
export const DEFAULT_RECEIPT_FONT = "Roboto";

/** Thermal printers lose fine strokes, so "Regular" prints at medium weight. */
export const RECEIPT_WEIGHT_REGULAR = 500;
export const RECEIPT_WEIGHT_BOLD = 700;
const WEIGHTS = [RECEIPT_WEIGHT_REGULAR, RECEIPT_WEIGHT_BOLD];

/** Font names saved on branches before these fonts existed. */
const RETIRED_FONTS: Record<string, string> = {
  arial: "Roboto",
  courier: "JetBrains Mono",
  monospace: "JetBrains Mono",
  fonta: "JetBrains Mono",
  fontb: "Roboto Condensed",
  "times new roman": "Roboto Slab",
};

/** The font a saved name prints in. */
export const resolveReceiptFont = (name?: string | null): string => {
  const wanted = String(name ?? "").trim().toLowerCase();
  const current = RECEIPT_FONT_NAMES.find((font) => font.toLowerCase() === wanted);
  return current ?? RETIRED_FONTS[wanted] ?? DEFAULT_RECEIPT_FONT;
};

export const receiptFontStack = (name?: string | null): string =>
  `'${resolveReceiptFont(name)}', 'Segoe UI', Tahoma, Arial, sans-serif`;

const fontUrl = (file: string, weight: number) =>
  `${window.location.origin}${import.meta.env.BASE_URL}fonts/receipt/${file}-${weight}.woff2`;

export const receiptFontFaceCss = (): string =>
  FONTS.flatMap(({ name, file }) =>
    WEIGHTS.map((weight) => `@font-face{font-family:'${name}';font-weight:${weight};font-style:normal;font-display:block;src:url('${fontUrl(file, weight)}') format('woff2');}`),
  ).join("");

/** The receipt HTML with the font definitions added, for the iframe it is laid out in. */
export const withReceiptFontFaces = (html: string): string => {
  const style = `<style>${receiptFontFaceCss()}</style>`;
  return html.includes("<head>") ? html.replace("<head>", () => `<head>${style}`) : `${style}${html}`;
};

const usedFonts = (html?: string): string[] =>
  html === undefined ? RECEIPT_FONT_NAMES : RECEIPT_FONT_NAMES.filter((name) => html.includes(`'${name}'`));

/** Loads the fonts a receipt uses (all of them with no HTML) in `doc`. A font that fails falls back; printing goes on. */
export const ensureReceiptFonts = async (doc: Document = document, html?: string): Promise<void> => {
  if (!doc.getElementById("receipt-fonts")) {
    const style = doc.createElement("style");
    style.id = "receipt-fonts";
    style.textContent = receiptFontFaceCss();
    doc.head.appendChild(style);
  }
  if (!doc.fonts?.load) return;
  await Promise.all(
    usedFonts(html).flatMap((name) => WEIGHTS.map((weight) => doc.fonts.load(`${weight} 15px '${name}'`).catch(() => []))),
  );
};
