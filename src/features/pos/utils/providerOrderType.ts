/**
 * Order types on this backend are ONE list (GET /pos-config/order-type-list-name):
 *   1 DineIn, 2 TakeOut, 3 DriveThru, 4 Delivery, then every provider by its own id (5 Swiggy, 6 Zomato, 7 …).
 * So a provider order is saved with orderTypeId = the provider's id, and any id above 4 is a provider.
 * There is no "Providers" or "Coming" order type on the server ("coming" is only the isComing column of a
 * delivery order). The POS keeps the provider's name as the order-type name of a provider order ("Zomato"),
 * and the backend returns that name as `orderType` on saved orders.
 */
const STANDARD_ORDER_TYPE_NAMES: Record<number, string> = {
  1: "DineIn",
  2: "TakeOut",
  3: "DriveThru",
  4: "Delivery",
};

const STANDARD_ORDER_TYPE_PARTS = ["dine", "takein", "takeout", "takeaway", "drive", "delivery", "coming", "provider"];

const normalize = (value: string) => value.toLowerCase().replace(/[\s_-]/g, "");

/** True for a provider order type id (5, 6, 7 … — each provider's own id). */
export const isProviderOrderTypeId = (orderTypeId?: number | string | null): boolean => Number(orderTypeId) > 4;

/** "DineIn" … "Delivery" for 1–4, "Providers" for a provider id, "" when unknown. */
export const orderTypeNameFromId = (orderTypeId?: number | string | null): string => {
  const id = Number(orderTypeId);
  if (STANDARD_ORDER_TYPE_NAMES[id]) return STANDARD_ORDER_TYPE_NAMES[id];
  return isProviderOrderTypeId(id) ? "Providers" : "";
};

/** The provider's name when an order-type name is one ("Zomato"), else "" (DineIn, TakeOut, "Providers" …). */
export const providerNameFromOrderType = (name?: string | null): string => {
  const raw = String(name ?? "").trim();
  const normalized = normalize(raw);
  if (!normalized) return "";
  return STANDARD_ORDER_TYPE_PARTS.some((s) => normalized.includes(s)) ? "" : raw;
};

/** The order-type part of a recall / void list line: "Order : 61 Ticket : 61 01:18:25 AM (Zomato) (Rahul) …" → "Zomato". */
export const orderTypeFromListDetails = (details?: string | null): string =>
  (String(details ?? "").match(/\d{1,2}:\d{2}:\d{2}\s*[AP]M\s*\(([^)]*)\)/i) || [])[1]?.trim() || "";

/** Is a recall / void / settled list row a provider order? (id when the row has one, else its type name.) */
export const isProviderOrderRow = (row: any): boolean => {
  const id = Number(row?.orderTypeId ?? row?.OrderTypeId);
  if (id > 0) return isProviderOrderTypeId(id);
  const name = row?.orderType || row?.orderTypeName || orderTypeFromListDetails(row?.details);
  return Boolean(providerNameFromOrderType(name)) || normalize(String(name || "")).includes("provider");
};
