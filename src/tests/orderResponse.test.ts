import { describe, it, expect } from "vitest";
import { readCreatedOrder, toDisplayNo } from "../features/pos/services/orderResponse";

// Bug: punching an order with print showed "Order No #undefined / Ticket No #undefined" because the
// new order's id was read only from `response.data.id`.
describe("readCreatedOrder — order id / numbers from the save reply", () => {
  it("reads { data: { id, ticketNo } } (current shape)", () => {
    expect(readCreatedOrder({ isSuccess: true, data: { id: 79, ticketNo: 12 } })).toEqual({ id: 79, orderNo: null, ticketNo: "12" });
  });

  it("reads { data: { orderId, orderNo, ticketNo } }", () => {
    expect(readCreatedOrder({ isSuccess: true, data: { orderId: 305, orderNo: 305, ticketNo: 7 } })).toEqual({ id: 305, orderNo: "305", ticketNo: "7" });
  });

  it("reads a bare id in data ({ data: 123 } and { data: \"123\" })", () => {
    expect(readCreatedOrder({ isSuccess: true, data: 123 }).id).toBe(123);
    expect(readCreatedOrder({ isSuccess: true, data: "123" }).id).toBe(123);
  });

  it("reads a top-level id / PascalCase keys / nested data", () => {
    expect(readCreatedOrder({ isSuccess: true, id: 44 }).id).toBe(44);
    expect(readCreatedOrder({ IsSuccess: true, data: { OrderId: 45, TicketNo: 3 } })).toEqual({ id: 45, orderNo: null, ticketNo: "3" });
    expect(readCreatedOrder({ data: { data: { id: 46 } } }).id).toBe(46);
  });

  it("returns nulls (never a guessed or 'undefined' value) when the reply has no id", () => {
    expect(readCreatedOrder({ isSuccess: true, message: "ok" })).toEqual({ id: null, orderNo: null, ticketNo: null });
    expect(readCreatedOrder({ isSuccess: true, data: null })).toEqual({ id: null, orderNo: null, ticketNo: null });
    expect(readCreatedOrder(undefined)).toEqual({ id: null, orderNo: null, ticketNo: null });
  });

  it("ignores the success flag (true is not an id)", () => {
    expect(readCreatedOrder({ isSuccess: true, data: true }).id).toBeNull();
  });
});

describe("toDisplayNo — prints never show 'undefined'", () => {
  it("blanks missing values", () => {
    for (const v of [undefined, null, "", "undefined", "null", "NaN", 0, "0", {}]) expect(toDisplayNo(v)).toBeNull();
  });
  it("keeps real numbers", () => {
    expect(toDisplayNo(305)).toBe("305");
    expect(toDisplayNo(" 12 ")).toBe("12");
  });
});
