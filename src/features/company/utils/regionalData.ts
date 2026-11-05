/**
 * Regional reference data that is safe to keep in the frontend.
 *
 * Country and currency IDs MUST come from the backend master data. The company screens used to fall
 * back to invented ID lists (Bahrain = 1, BHD = 1, "Qatari Riyal" = 2 …) when the master data did not
 * load. Saving with those IDs could store the wrong country / currency. Only facts that do not depend
 * on database IDs live here: dialling codes (looked up by country NAME) and currency minor units.
 */

const DIAL_CODES: Record<string, string> = {
  bahrain: "+973",
  oman: "+968",
  uae: "+971",
  "united arab emirates": "+971",
  "saudi arabia": "+966",
  ksa: "+966",
  kuwait: "+965",
  qatar: "+974",
  india: "+91",
};

/** Dialling code for a country name ("" when unknown). Never used to invent IDs. */
export const dialCodeForCountry = (name: unknown): string =>
  DIAL_CODES[String(name ?? "").trim().toLowerCase()] ?? "";

/** Adds `mobCode` to API countries that do not carry one (matched by name). */
export const withDialCodes = <T extends { name?: string; mobCode?: string }>(countries: T[]): T[] =>
  (countries || []).map((c) => (c.mobCode ? c : { ...c, mobCode: dialCodeForCountry(c.name) }));

/** ISO 4217 minor units for currencies whose decimals differ from 2. */
const THREE_DECIMALS = new Set(["BHD", "KWD", "OMR", "JOD", "IQD", "LYD", "TND"]);
const ZERO_DECIMALS = new Set(["JPY", "KRW", "VND", "CLP", "ISK", "UGX", "XAF", "XOF"]);

/**
 * Decimals to use when the backend did not send `decimalPart`: derived from the currency code
 * (BHD / KWD / OMR = 3 fils / baisa). The old fallback was a fixed 2 even with "BHD".
 */
export const currencyDecimals = (currencyCode: unknown, fallback = 3): number => {
  const code = String(currencyCode ?? "").trim().toUpperCase();
  if (!code) return fallback;
  if (THREE_DECIMALS.has(code)) return 3;
  if (ZERO_DECIMALS.has(code)) return 0;
  return /^[A-Z]{3}$/.test(code) ? 2 : fallback;
};

/** decimalPart from the backend if it is a valid number (0 allowed), else derived from the currency. */
export const resolveDecimalPart = (decimalPart: unknown, currencyCode: unknown): number => {
  const n = Number(decimalPart);
  return decimalPart !== null && decimalPart !== undefined && decimalPart !== "" && Number.isInteger(n) && n >= 0 && n <= 6
    ? n
    : currencyDecimals(currencyCode);
};
