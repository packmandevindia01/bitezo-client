/**
 * The order details shown at the top of the Split screen (owner's request 2026-11-12: "we don't know which order
 * we are splitting"). Read from the saved order's master row; the cart (the same order loaded for edit) fills gaps
 * the backend leaves empty.
 *
 * Employee (owner's rule): the employee whose code was punched when the order was placed, or the default employee
 * when no code was asked. Either way the order saves it as `employeeId`, so that id decides the name. An order with no
 * employee id at all was placed by the default employee.
 * Customer: the customer selected on the order, else "Cash Customer".
 */
import { toDisplayNo } from "../../services/orderResponse";
import { cachedEmployeeName, isRealEmployeeName } from "../../utils/employeeNames";

export interface SplitOrderInfo {
  orderNo: string;
  ticketNo: string;
  orderType: string;
  waiter: string;
  table: string;
  guests: number;
  customer: string;
  date: string;
  netAmount: number | null;
}

/** What the cart knows about the order being split. */
export interface SplitOrderCartInfo {
  orderId?: number | null;
  /** Default employee of this terminal: the employee of an order saved without an employee id. */
  defaultEmployeeName?: string | null;
  tableNo?: string;
  customerName?: string;
}

const text = (v: unknown) => (v === undefined || v === null ? "" : String(v).trim());

const ORDER_TYPE_LABELS: Record<string, string> = {
  dinein: "Dine In", takeout: "Take Out", drivethru: "Drive Thru", delivery: "Delivery", providers: "Providers", coming: "Coming",
};

/** dd/MM/yyyy HH:mm; "" when there is no date. Text that is not a date is shown as it is. */
export const formatSplitOrderDate = (raw: unknown): string => {
  const value = text(raw);
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const two = (n: number) => String(n).padStart(2, "0");
  return `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()} ${two(d.getHours())}:${two(d.getMinutes())}`;
};

/** Employee (waiter) id saved on the order: the first positive one of the fields the backend uses, else null. */
export const splitOrderEmployeeId = (master: Record<string, unknown> | null | undefined): number | null => {
  const m = master || {};
  for (const v of [m.employeeId, m.empId, m.salespersonId, m.waiterId]) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
};

export const getSplitOrderInfo = (master: Record<string, unknown> | null | undefined, cart: SplitOrderCartInfo = {}): SplitOrderInfo => {
  const m = master || {};
  const typeKey = text(m.orderTypeName || m.orderType).replace(/[\s_-]/g, "").toLowerCase();
  const orderType = ORDER_TYPE_LABELS[typeKey] || text(m.orderTypeName || m.orderType);

  const savedName = [m.employeeName, m.empName, m.waiterName, m.waiter].find(isRealEmployeeName);
  const employeeId = splitOrderEmployeeId(m);
  const waiter = text(savedName)
    || cachedEmployeeName(employeeId, { realNamesOnly: true })
    || (!employeeId && isRealEmployeeName(cart.defaultEmployeeName) ? text(cart.defaultEmployeeName) : "");

  const tableNo = text(m.tableNo || m.tableName) || text(cart.tableNo);
  const section = text(m.sectionName);
  const table = typeKey === "dinein" && tableNo ? (section ? `${section} - ${tableNo}` : tableNo) : "";

  const net = Number(m.netAmount ?? m.NetAmount);

  return {
    orderNo: toDisplayNo(m.orderNo) ?? (cart.orderId ? String(cart.orderId) : ""),
    ticketNo: toDisplayNo(m.ticketNo) ?? "",
    orderType,
    waiter,
    table,
    guests: Number(m.guestNo) > 0 ? Number(m.guestNo) : 0,
    customer: text(m.deliveryCustomerName || m.vehicleCustomerName || m.customerName)
      || (Number(m.customerId) > 0 ? text(cart.customerName) : "")
      || "Cash Customer",
    date: formatSplitOrderDate(m.voucherDate ?? m.orderDate ?? m.entryDate ?? m.transDate ?? m.createdAt),
    netAmount: Number.isFinite(net) && (m.netAmount ?? m.NetAmount) !== undefined ? net : null,
  };
};
