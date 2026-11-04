/**
 * Reads the created/updated order reference from a `POST /menu/order` or `PUT /menu/order/{id}` reply.
 *
 * The reply shape is not documented in Swagger, so every known shape is accepted:
 *   { data: { id } }, { data: { orderId } }, { data: 123 }, { id }, { orderId }, { data: { data: { id } } }
 * plus orderNo / ticketNo when the backend includes them.
 *
 * Order and ticket numbers are created by the backend — they are only ever READ here, never guessed.
 */
export interface CreatedOrderRef {
  id: number | null;
  orderNo: string | null;
  ticketNo: string | null;
}

const ID_KEYS = ["id", "Id", "orderId", "OrderId", "orderID"] as const;
const ORDER_NO_KEYS = ["orderNo", "OrderNo", "orderNumber", "OrderNumber"] as const;
const TICKET_NO_KEYS = ["ticketNo", "TicketNo", "ticketNumber", "TicketNumber"] as const;

const toPositiveId = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "" || typeof v === "boolean") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** A printable order/ticket number, or null when missing ("undefined"/"null" strings count as missing). */
export const toDisplayNo = (v: unknown): string | null => {
  if (v === null || v === undefined || typeof v === "boolean" || typeof v === "object") return null;
  const s = String(v).trim();
  if (!s || s === "undefined" || s === "null" || s === "NaN" || s === "0") return null;
  return s;
};

const firstOf = <T>(objects: any[], keys: readonly string[], convert: (v: unknown) => T | null): T | null => {
  for (const o of objects) {
    if (!o || typeof o !== "object") continue;
    for (const k of keys) {
      const v = convert(o[k]);
      if (v !== null) return v;
    }
  }
  return null;
};

export const readCreatedOrder = (response: any): CreatedOrderRef => {
  const data = response?.data;
  // Most specific first: the order object inside `data`, then nested data, then the reply itself.
  const objects = [data, data?.data, data?.order, data?.masterData, response];

  const primitiveId = typeof data === "number" || typeof data === "string" ? toPositiveId(data) : null;
  const id = firstOf(objects, ID_KEYS, toPositiveId) ?? primitiveId;

  return {
    id,
    orderNo: firstOf(objects, ORDER_NO_KEYS, toDisplayNo),
    ticketNo: firstOf(objects, TICKET_NO_KEYS, toDisplayNo),
  };
};
