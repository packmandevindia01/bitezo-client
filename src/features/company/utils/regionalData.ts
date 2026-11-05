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

// Currency minor units moved to shared/lib/currency.ts (Phase 0).
export { currencyDecimals, resolveDecimalPart } from "../../../shared/lib/currency";
