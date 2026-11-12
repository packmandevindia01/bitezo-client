/** POS employee-name cache and lookups (src/features/pos/utils/employeeNames.ts). */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  readEmployeeNameMap,
  cachedEmployeeName,
  isEmployeeKnownOrCacheEmpty,
  mergeEmployeeNames,
  replaceEmployeeNames,
  findEmployeeName,
  resolveEmployeeNameForPrint,
  savedOrderWaiterName,
  EMPLOYEE_NAME_MAP_KEY,
} from "../features/pos/utils/employeeNames";
import { getEmployeeNames, getEmployeeById } from "../features/general/employee/services/employeeService";

vi.mock("../features/general/employee/services/employeeService", () => ({
  getEmployeeNames: vi.fn(),
  getEmployeeById: vi.fn(),
}));
vi.mock("@shared/config/device", () => ({ getTerminalBranchId: () => 4 }));

const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;
const setMap = (m: Record<string, string>) => localStorage.setItem(EMPLOYEE_NAME_MAP_KEY, JSON.stringify(m));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mock(getEmployeeNames).mockResolvedValue([]);
  mock(getEmployeeById).mockResolvedValue(null);
});

describe("the cache", () => {
  it("reads {} when empty or unreadable", () => {
    expect(readEmployeeNameMap()).toEqual({});
    localStorage.setItem(EMPLOYEE_NAME_MAP_KEY, "{broken");
    expect(readEmployeeNameMap()).toEqual({});
    localStorage.setItem(EMPLOYEE_NAME_MAP_KEY, "[1,2]");
    expect(readEmployeeNameMap()).toEqual({});
  });

  it("gives a cached name; placeholder names only when real names are not required", () => {
    setMap({ "7": "Ahmed ", "8": "Waiter" });
    expect(cachedEmployeeName(7)).toBe("Ahmed ");
    expect(cachedEmployeeName(7, { realNamesOnly: true })).toBe("Ahmed");
    expect(cachedEmployeeName(8)).toBe("Waiter");
    expect(cachedEmployeeName(8, { realNamesOnly: true })).toBeNull();
    expect(cachedEmployeeName(0)).toBeNull();
    expect(cachedEmployeeName(null)).toBeNull();
    expect(cachedEmployeeName(99)).toBeNull();
  });

  it("an empty cache accepts any employee; a filled one only known ones", () => {
    expect(isEmployeeKnownOrCacheEmpty(5)).toBe(true);
    setMap({ "7": "Ahmed" });
    expect(isEmployeeKnownOrCacheEmpty(7)).toBe(true);
    expect(isEmployeeKnownOrCacheEmpty(5)).toBe(false);
  });

  it("merge keeps other names; replace starts over and keeps ids without a name", () => {
    setMap({ "1": "Old" });
    expect(mergeEmployeeNames([{ empId: 2, empName: "Sara" }, { id: 3, name: "Ali" }, { empId: 4 }])).toEqual({ "1": "Old", "2": "Sara", "3": "Ali" });
    expect(replaceEmployeeNames([{ empId: 5, empName: "Noor" }, { empId: 6 }])).toEqual({ "5": "Noor", "6": "" });
    expect(readEmployeeNameMap()).toEqual({ "5": "Noor", "6": "" });
  });
});

describe("findEmployeeName (KOT / bill print)", () => {
  it("cache first, without asking the server", async () => {
    setMap({ "7": "Ahmed" });
    expect(await findEmployeeName(7)).toBe("Ahmed");
    expect(getEmployeeNames).not.toHaveBeenCalled();
  });

  it("then the authorized employee with the same id", async () => {
    localStorage.setItem("authorizedEmployeeId", "7");
    localStorage.setItem("authorizedEmployeeName", "Manager");
    expect(await findEmployeeName(7)).toBe("Manager");
  });

  it("then the branch list, which is cached for next time", async () => {
    mock(getEmployeeNames).mockResolvedValue([{ empId: 7, empName: "Ahmed" }]);
    expect(await findEmployeeName(7)).toBe("Ahmed");
    expect(getEmployeeNames).toHaveBeenCalledWith(4);
    expect(cachedEmployeeName(7)).toBe("Ahmed");
  });

  it("null when not found or the request fails", async () => {
    expect(await findEmployeeName(7)).toBeNull();
    mock(getEmployeeNames).mockRejectedValue(new Error("offline"));
    expect(await findEmployeeName(7)).toBeNull();
    expect(await findEmployeeName(0)).toBeNull();
  });
});

describe("resolveEmployeeNameForPrint (table / settled order prints)", () => {
  it("uses the name already on the order", async () => {
    expect(await resolveEmployeeNameForPrint(7, " Sara ")).toBe("Sara");
    expect(getEmployeeNames).not.toHaveBeenCalled();
  });

  it("skips placeholder names at every step", async () => {
    setMap({ "7": "Waiter" });
    localStorage.setItem("authorizedEmployeeId", "7");
    localStorage.setItem("authorizedEmployeeName", "cashier");
    mock(getEmployeeNames).mockResolvedValue([{ empId: 7, empName: "Waiter" }]);
    mock(getEmployeeById).mockResolvedValue({ empName: "Ahmed" });
    expect(await resolveEmployeeNameForPrint(7, "Waiter")).toBe("Ahmed");
  });

  it("looks the employee up by id and remembers the name", async () => {
    mock(getEmployeeById).mockResolvedValue({ firstName: "Noor" });
    expect(await resolveEmployeeNameForPrint(9, null)).toBe("Noor");
    expect(cachedEmployeeName(9)).toBe("Noor");
  });

  it("owner's rule: an order with an employee id never shows this device's default / authorized / logged-in name", async () => {
    localStorage.setItem("defaultEmployeeName", "Default");
    localStorage.setItem("authorizedEmployeeId", "3");
    localStorage.setItem("authorizedEmployeeName", "Manager");
    localStorage.setItem("employeeName", "Logged In");
    expect(await resolveEmployeeNameForPrint(9, null)).toBe("Waiter");
  });

  it("an order without an employee id was placed by the default employee", async () => {
    localStorage.setItem("defaultEmployeeName", "Default");
    localStorage.setItem("employeeName", "Logged In");
    expect(await resolveEmployeeNameForPrint(null, "waiter")).toBe("Default");
    localStorage.clear();
    expect(await resolveEmployeeNameForPrint(null, null)).toBe("Waiter");
  });
});

describe("savedOrderWaiterName (recall reprint, no server calls)", () => {
  it("order name → cached name of the order's id → Waiter; never another device name", () => {
    expect(savedOrderWaiterName(" Sara ", 7)).toBe("Sara");
    setMap({ "7": "Ahmed", "8": "Waiter" });
    expect(savedOrderWaiterName("null", 7)).toBe("Ahmed");
    expect(savedOrderWaiterName(undefined, 8)).toBe("Waiter");
    localStorage.setItem("authorizedEmployeeName", "Manager");
    localStorage.setItem("defaultEmployeeName", "Default");
    expect(savedOrderWaiterName("cashier", 8)).toBe("Waiter");
    expect(getEmployeeNames).not.toHaveBeenCalled();
  });

  it("the authorized employee counts only when it is the order's own id", () => {
    localStorage.setItem("authorizedEmployeeId", "8");
    localStorage.setItem("authorizedEmployeeName", "Manager");
    expect(savedOrderWaiterName(undefined, 8)).toBe("Manager");
    expect(savedOrderWaiterName(undefined, 9)).toBe("Waiter");
  });

  it("no employee id on the order: the default employee", () => {
    localStorage.setItem("defaultEmployeeName", "Default");
    expect(savedOrderWaiterName(undefined, 0)).toBe("Default");
  });
});
