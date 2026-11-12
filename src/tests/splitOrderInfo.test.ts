// @vitest-environment jsdom
/** Split screen header: which order is being split (owner's request 2026-11-12). */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { getSplitOrderInfo, formatSplitOrderDate, splitOrderEmployeeId } from "../features/pos/terminal/utils/splitOrderInfo";
import { EMPLOYEE_NAME_MAP_KEY, lookupEmployeeName } from "../features/pos/utils/employeeNames";
import { getEmployeeNames, getEmployeeById } from "../features/general/employee/services/employeeService";

vi.mock("../features/general/employee/services/employeeService", () => ({ getEmployeeNames: vi.fn(), getEmployeeById: vi.fn() }));
vi.mock("@shared/config/device", () => ({ getTerminalBranchId: () => 4 }));
const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mock(getEmployeeNames).mockResolvedValue([]);
  mock(getEmployeeById).mockResolvedValue(null);
});

const dineIn = {
  orderNo: 285, ticketNo: 12, orderType: "DineIn", orderTypeName: "DineIn", employeeName: "Ahmed",
  sectionName: "Hall", tableNo: "T4", guestNo: 3, customerName: "Cash Customer", voucherDate: "2026-11-12T14:05:00", netAmount: 5.082,
};

describe("getSplitOrderInfo", () => {
  it("dine-in order: number, ticket, type, waiter, table, guests, customer, date, total", () => {
    expect(getSplitOrderInfo(dineIn)).toEqual({
      orderNo: "285", ticketNo: "12", orderType: "Dine In", waiter: "Ahmed", table: "Hall - T4", guests: 3,
      customer: "Cash Customer", date: "12/11/2026 14:05", netAmount: 5.082,
    });
  });

  it("employee = the order's employee id (punched code or default employee); placeholder names skipped", () => {
    localStorage.setItem(EMPLOYEE_NAME_MAP_KEY, JSON.stringify({ 9: "Sara", 4: "Waiter Joe" }));
    expect(getSplitOrderInfo({ ...dineIn, employeeName: "Waiter", employeeId: 9 }).waiter).toBe("Sara");
    // The employee id wins over the selected waiter id.
    expect(getSplitOrderInfo({ ...dineIn, employeeName: "", employeeId: 9, waiterId: 4 }).waiter).toBe("Sara");
    // No employee id on the order: the default employee placed it.
    expect(getSplitOrderInfo({ ...dineIn, employeeName: "null" }, { defaultEmployeeName: "Ravi" }).waiter).toBe("Ravi");
    // An id whose name is not known yet is looked up from the server, never replaced by the default employee.
    expect(getSplitOrderInfo({ ...dineIn, employeeName: "", employeeId: 50 }, { defaultEmployeeName: "Ravi" }).waiter).toBe("");
  });

  it("customer: the selected customer, else Cash Customer", () => {
    expect(getSplitOrderInfo({ ...dineIn, customerName: "" }).customer).toBe("Cash Customer");
    expect(getSplitOrderInfo({ ...dineIn, customerName: "", customerId: 8 }, { customerName: "Ali" }).customer).toBe("Ali");
    expect(getSplitOrderInfo({ ...dineIn, customerName: "", customerId: 0 }, { customerName: "Ali" }).customer).toBe("Cash Customer");
  });

  it("table only for dine-in; the cart's table fills a missing one", () => {
    expect(getSplitOrderInfo({ ...dineIn, orderType: "TakeOut", orderTypeName: "TakeOut" }).table).toBe("");
    expect(getSplitOrderInfo({ ...dineIn, tableNo: "", sectionName: "" }, { tableNo: "T9" }).table).toBe("T9");
  });

  it("order number falls back to the order id; no master at all still works", () => {
    expect(getSplitOrderInfo({ ...dineIn, orderNo: undefined }, { orderId: 77 }).orderNo).toBe("77");
    expect(getSplitOrderInfo(null, { orderId: 77 })).toMatchObject({ orderNo: "77", customer: "Cash Customer", netAmount: null, guests: 0 });
  });

  it("delivery customer name wins over the account name", () => {
    expect(getSplitOrderInfo({ ...dineIn, deliveryCustomerName: "Mona" }).customer).toBe("Mona");
  });

  it("formatSplitOrderDate: empty stays empty, other text shown as it is", () => {
    expect(formatSplitOrderDate(undefined)).toBe("");
    expect(formatSplitOrderDate("7:46:02 PM")).toBe("7:46:02 PM");
  });
});

describe("employee on the split screen", () => {
  it("splitOrderEmployeeId: employeeId first, then empId / salespersonId / waiterId", () => {
    expect(splitOrderEmployeeId({ waiterId: 3, employeeId: "12" })).toBe(12);
    expect(splitOrderEmployeeId({ employeeId: 0, waiterId: 3 })).toBe(3);
    expect(splitOrderEmployeeId({ waiterId: null, empId: 5 })).toBe(5);
    expect(splitOrderEmployeeId({})).toBeNull();
  });

  it("lookupEmployeeName: from the branch list, else by id; never the device default employee", async () => {
    localStorage.setItem("defaultEmployeeName", "Device Default");
    mock(getEmployeeNames).mockResolvedValue([{ empId: 12, empName: "Ahmed" }]);
    expect(await lookupEmployeeName(12)).toBe("Ahmed");
    mock(getEmployeeById).mockResolvedValue({ empName: "Sara" });
    expect(await lookupEmployeeName(30)).toBe("Sara");
    mock(getEmployeeById).mockResolvedValue({ empName: "Waiter" });
    expect(await lookupEmployeeName(31)).toBeNull();
    expect(await lookupEmployeeName(0)).toBeNull();
  });
});
