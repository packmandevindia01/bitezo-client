// @vitest-environment jsdom
/**
 * Phase 5 safety net: the list screens of the simple masters, rendered with only the network and the permission
 * check mocked. Written against the four separate pages, so the shared page has to behave the same.
 */
import { createElement, type ComponentType } from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { store } from "../app/store";
import CounterPage from "../features/general/counter/pages/CounterPage";
import SectionPage from "../features/general/section/pages/SectionPage";
import PaymodePage from "../features/general/paymode/pages/PaymodePage";
import UserRolePage from "../features/general/userRole/pages/UserRolePage";
import ProviderPage from "../features/general/provider/pages/ProviderPage";
import VoucherSeriesPage from "../features/inventory/voucherSeries/pages/VoucherSeriesPage";
import UnitPage from "../features/inventory/unit/pages/UnitPage";
import TaxPage from "../features/inventory/tax/pages/TaxPage";
import GroupPage from "../features/inventory/group/pages/GroupPage";
import StockAdjustmentTypePage from "../features/inventory/stockAdjustmentType/pages/StockAdjustmentTypePage";
import ModifierTypePage from "../features/inventory/modifierType/pages/ModifierTypePage";
import ExtrasTypePage from "../features/inventory/extrasType/pages/ExtrasTypePage";

const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }));
const perms = vi.hoisted(() => ({ denied: new Set<string>(), asked: new Set<string>() }));
vi.mock("../api/axiosInstance", () => ({ default: http }));
vi.mock("../app/providers/useToast", () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock("../hooks/usePermissions", async (original) => ({
  ...(await original<object>()),
  usePermissions: () => ({
    hasPermission: (moduleName: string, action: string) => {
      perms.asked.add(moduleName);
      return !perms.denied.has(action);
    },
  }),
}));
vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });

const ok = (data: unknown) => ({ data: { isSuccess: true, data } });

interface Doc {
  name: string;
  Page: ComponentType;
  module: string;
  table: string;
  placeholder: string;
  list: string;
  rows: unknown[];
  detail: string;
  detailData: unknown;
  remove: string;
  message: string;
  dialogTitle: string;
}

const DOCS: Doc[] = [
  {
    name: "Counter", Page: CounterPage, module: "Counter Master", table: "Saved Counter List", placeholder: "Search counters...",
    list: "/counter/counter-list",
    rows: [{ sNo: 1, counterId: 1, counterName: "Front", branch: "Main" }, { sNo: 2, counterId: 2, counterName: "Bar", branch: "Mall" }],
    detail: "/counter/1/counterid-data", detailData: { counterId: 1, counterName: "Front", branchId: 2 },
    remove: "/counter/1", message: 'Are you sure you want to delete counter "Front"?', dialogTitle: "Confirm Delete",
  },
  {
    name: "Section", Page: SectionPage, module: "Section Master", table: "Saved Section List", placeholder: "Search sections...",
    list: "/section/section-list",
    rows: [{ sNo: 1, sectionId: 1, name: "Front", counter: "Main" }, { sNo: 2, sectionId: 2, name: "Bar", counter: "Mall" }],
    detail: "/section/1/sectionid-data", detailData: { sectionId: 1, sectionName: "Front", counterId: 2 },
    remove: "/section/1", message: 'Are you sure you want to delete section "Front"?', dialogTitle: "Confirm Delete",
  },
  {
    name: "Paymode", Page: PaymodePage, module: "Paymode Master", table: "Saved Paymode List", placeholder: "Search paymodes...",
    list: "/paymode/paymode-list",
    rows: [{ sNo: 1, paymodeId: 1, code: 10, paymodeName: "Front", isActive: "Active" }, { sNo: 2, paymodeId: 2, code: 20, paymodeName: "Bar", isActive: false }],
    detail: "/paymode/1/paymodeid-data", detailData: { paymode: [{ paymodeId: 1, code: 10, paymodeName: "Front", isActive: true }], counter: [] },
    remove: "/paymode/1", message: 'Are you sure you want to delete paymode "Front"?', dialogTitle: "Confirm Delete",
  },
  {
    name: "User Role", Page: UserRolePage, module: "User Master", table: "Saved User Role List", placeholder: "Search roles...",
    list: "/user-role/user-role-list",
    rows: [{ sNo: 1, roleId: 1, roleName: "Front" }, { sNo: 2, roleId: 2, roleName: "Bar" }],
    detail: "/user-role/1/roleid-data", detailData: { role: [{ roleId: 1, roleName: "Front" }], permissions: [] },
    remove: "/user-role/1", message: 'Are you sure you want to delete role "Front"?', dialogTitle: "Delete User Role",
  },
];

const show = (Page: ComponentType) => render(createElement(Provider, {
  store,
  children: createElement(QueryClientProvider, {
    client: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    children: createElement(MemoryRouter, null, createElement(Page)),
  }),
}));

const rowTexts = () => Array.from(document.querySelectorAll("tbody tr")).map((row) => row.textContent ?? "");
const loaded = () => waitFor(() => expect(rowTexts().join()).toContain("Front"));
const firstRow = () => within(document.querySelectorAll("tbody tr")[0] as HTMLElement);
const plainDelete = () => screen.getAllByRole("button", { name: /^\s*Delete\s*$/ }).at(-1) as HTMLElement;

beforeEach(() => {
  vi.clearAllMocks();
  perms.denied.clear();
  perms.asked.clear();
  localStorage.clear();
  sessionStorage.clear();
  vi.spyOn(console, "error").mockImplementation(() => {});
  http.delete.mockResolvedValue(ok({}));
});
afterEach(() => cleanup());

describe.each(DOCS)("$name master list", (doc) => {
  beforeEach(() => {
    http.get.mockImplementation(async (url: string) => {
      if (url === doc.list) return ok(doc.rows);
      if (url === doc.detail) return ok(doc.detailData);
      if (url.includes("next-paymode-code")) return ok({ code: 11 });
      return ok([]);
    });
  });

  it("shows its table, rows and the permission it checks", async () => {
    show(doc.Page);
    await loaded();
    expect(screen.getByText(doc.table)).toBeTruthy();
    expect(rowTexts()).toHaveLength(2);
    expect(rowTexts()[0]).toMatch(/^1/);
    expect([...perms.asked]).toEqual([doc.module]);
  });

  it("search narrows the list", async () => {
    show(doc.Page);
    await loaded();
    fireEvent.change(screen.getByPlaceholderText(doc.placeholder), { target: { value: "bar" } });
    await waitFor(() => {
      expect(rowTexts()).toHaveLength(1);
      expect(rowTexts()[0]).toContain("Bar");
    });
  });

  it("Add New is there only with the Add permission", async () => {
    show(doc.Page);
    await loaded();
    expect(screen.getByText("Add New")).toBeTruthy();
    cleanup();
    perms.denied.add("Add");
    show(doc.Page);
    await loaded();
    expect(screen.queryByText("Add New")).toBeNull();
  });

  it("Edit and Delete follow their permissions", async () => {
    perms.denied.add("Edit");
    show(doc.Page);
    await loaded();
    expect(firstRow().queryByLabelText("Edit Front")).toBeNull();
    expect(firstRow().getByLabelText("Delete Front")).toBeTruthy();
    cleanup();
    perms.denied.clear();
    perms.denied.add("Delete");
    show(doc.Page);
    await loaded();
    expect(firstRow().getByLabelText("Edit Front")).toBeTruthy();
    expect(firstRow().queryByLabelText("Delete Front")).toBeNull();
  });

  it("Edit loads the saved record", async () => {
    show(doc.Page);
    await loaded();
    fireEvent.click(firstRow().getByLabelText("Edit Front"));
    await waitFor(() => expect(http.get).toHaveBeenCalledWith(doc.detail));
  });

  it("deleting a row asks first, and Cancel keeps it", async () => {
    show(doc.Page);
    await loaded();
    fireEvent.click(firstRow().getByLabelText("Delete Front"));
    expect(screen.getByText(doc.message)).toBeTruthy();
    expect(screen.getByText(doc.dialogTitle)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^\s*Cancel\s*$/ }));
    await waitFor(() => expect(screen.queryByText(doc.message)).toBeNull());
    expect(http.delete).not.toHaveBeenCalled();
  });

  it("confirming deletes the row and reloads the list", async () => {
    show(doc.Page);
    await loaded();
    const before = http.get.mock.calls.filter(([u]) => u === doc.list).length;
    fireEvent.click(firstRow().getByLabelText("Delete Front"));
    fireEvent.click(plainDelete());
    await waitFor(() => expect(http.delete).toHaveBeenCalledWith(doc.remove));
    await waitFor(() => expect(http.get.mock.calls.filter(([u]) => u === doc.list).length).toBeGreaterThan(before));
    await waitFor(() => expect(screen.queryByText(doc.message)).toBeNull());
  });

  it("Delete inside the form closes it and asks first", async () => {
    show(doc.Page);
    await loaded();
    fireEvent.click(firstRow().getByLabelText("Edit Front"));
    await waitFor(() => expect(http.get).toHaveBeenCalledWith(doc.detail));
    await waitFor(() => expect(screen.getAllByRole("button", { name: /^\s*Delete\s*$/ }).length).toBeGreaterThan(0));
    fireEvent.click(plainDelete());
    await waitFor(() => expect(screen.getByText(doc.message)).toBeTruthy());
    expect(http.delete).not.toHaveBeenCalled();
  });
});

const MORE_DOCS: (Doc & { headers: string[]; firstCells: string[]; secondCells: string[] })[] = [
  {
    name: "Provider", Page: ProviderPage, module: "Provider Master", table: "Registered Provider List", placeholder: "Search providers...",
    list: "/provider/provider-list",
    rows: [{ sNo: 1, providerId: 1, providerName: "Front", paymode: "Cash", deliveryStatus: "Enable" }, { sNo: 2, providerId: 2, providerName: "Bar", paymode: "", deliveryStatus: "Disable" }],
    detail: "/provider/1/provider-data", detailData: { provider: { providerId: 1, providerName: "Front", paymodeId: 1, postAccountId: 0, deliveryStatus: "Enable", fileUrl: "" }, branch: [] },
    remove: "/provider/1", message: 'Are you sure you want to delete provider "Front"?', dialogTitle: "Confirm Delete",
    headers: ["Provider Info", "Paymode", "Delivery Status", "Actions"], firstCells: ["Front", "Cash", "Enable"], secondCells: ["Bar", "Standard", "Disable"],
  },
  {
    name: "Voucher Series", Page: VoucherSeriesPage, module: "Voucher Series Master", table: "Saved Voucher Series list", placeholder: "Search voucher series...",
    list: "/voucherseries/voucherseries-list",
    rows: [{ sNo: 1, voucherId: 1, voucherType: "Sale", voucherName: "Front", branch: "Main" }, { sNo: 2, voucherId: 2, voucherType: "Sale", voucherName: "Bar", branch: "Mall" }],
    detail: "/voucherseries/1/voucherid-data", detailData: { voucherId: 1, voucherType: "Sale", voucherName: "Front", prefix: "F", startNo: 1, branchId: 2 },
    remove: "/voucherseries/1", message: 'Are you sure you want to delete voucher series "Front"?', dialogTitle: "Confirm Delete",
    headers: ["S No", "Voucher Type", "Name", "Branch", "Actions"], firstCells: ["1", "Sale", "Front", "Main"], secondCells: ["2", "Sale", "Bar", "Mall"],
  },
];

describe.each(MORE_DOCS)("$name master list", (doc) => {
  const rowOf = (row: number) => Array.from(document.querySelectorAll("tbody tr")).find((tr) => tr.textContent?.includes(row === 0 ? "Front" : "Bar")) as HTMLElement;
  const icon = (row: number, name: string) => rowOf(row).querySelector(`svg[class*="${name}"]`)?.closest("button") as HTMLElement | undefined;
  const cells = (row: number) => Array.from(rowOf(row).querySelectorAll("td")).map((td) => td.textContent?.trim());

  beforeEach(() => {
    http.get.mockImplementation(async (url: string) => {
      if (url === doc.list) return ok(doc.rows);
      if (url === doc.detail) return ok(doc.detailData);
      return ok([]);
    });
  });

  it("shows its columns and the permission it checks", async () => {
    show(doc.Page);
    await loaded();
    expect(screen.getByText(doc.table)).toBeTruthy();
    expect(Array.from(document.querySelectorAll("th")).map((th) => th.textContent?.trim())).toEqual(doc.headers);
    expect(cells(0).slice(0, doc.firstCells.length)).toEqual(doc.firstCells);
    expect(cells(1).slice(0, doc.secondCells.length)).toEqual(doc.secondCells);
    expect([...perms.asked]).toEqual([doc.module]);
  });

  it("search narrows the list", async () => {
    show(doc.Page);
    await loaded();
    fireEvent.change(screen.getByPlaceholderText(doc.placeholder), { target: { value: "bar" } });
    await waitFor(() => {
      expect(rowTexts()).toHaveLength(1);
      expect(rowTexts()[0]).toContain("Bar");
    });
  });

  it("Add, Edit and Delete follow their permissions", async () => {
    perms.denied.add("Add");
    perms.denied.add("Edit");
    show(doc.Page);
    await loaded();
    expect(screen.queryByText("Add New")).toBeNull();
    expect(icon(0, "pencil")).toBeUndefined();
    expect(icon(0, "trash")).toBeTruthy();
    cleanup();
    perms.denied.clear();
    perms.denied.add("Delete");
    show(doc.Page);
    await loaded();
    expect(screen.getByText("Add New")).toBeTruthy();
    expect(icon(0, "pencil")).toBeTruthy();
    expect(icon(0, "trash")).toBeUndefined();
  });

  it("deleting a row asks first, Cancel keeps it, confirming deletes and reloads", async () => {
    show(doc.Page);
    await loaded();
    fireEvent.click(icon(0, "trash") as HTMLElement);
    expect(screen.getByText(doc.message)).toBeTruthy();
    expect(screen.getByText(doc.dialogTitle)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^\s*Cancel\s*$/ }));
    await waitFor(() => expect(screen.queryByText(doc.message)).toBeNull());
    expect(http.delete).not.toHaveBeenCalled();
    const before = http.get.mock.calls.filter(([u]) => u === doc.list).length;
    fireEvent.click(icon(0, "trash") as HTMLElement);
    fireEvent.click(plainDelete());
    await waitFor(() => expect(http.delete).toHaveBeenCalledWith(doc.remove));
    await waitFor(() => expect(http.get.mock.calls.filter(([u]) => u === doc.list).length).toBeGreaterThan(before));
  });

  it("Edit loads the saved record, and Delete in the form asks first", async () => {
    show(doc.Page);
    await loaded();
    fireEvent.click(icon(0, "pencil") as HTMLElement);
    await waitFor(() => expect(http.get).toHaveBeenCalledWith(doc.detail));
    await waitFor(() => expect(screen.getAllByRole("button", { name: /^\s*Delete\s*$/ }).length).toBeGreaterThan(0));
    fireEvent.click(plainDelete());
    await waitFor(() => expect(screen.getByText(doc.message)).toBeTruthy());
    expect(http.delete).not.toHaveBeenCalled();
  });
});

describe("Voucher Series form", () => {
  it("has no Delete button without the Delete permission", async () => {
    const doc = MORE_DOCS[1];
    http.get.mockImplementation(async (url: string) => {
      if (url === doc.list) return ok(doc.rows);
      if (url === doc.detail) return ok(doc.detailData);
      return ok([]);
    });
    perms.denied.add("Delete");
    show(doc.Page);
    await loaded();
    fireEvent.click(document.querySelectorAll("tbody tr")[0].querySelector('svg[class*="pencil"]')?.closest("button") as HTMLElement);
    await waitFor(() => expect(screen.getByRole("button", { name: /^\s*Clear\s*$/ })).toBeTruthy());
    expect(screen.queryByRole("button", { name: /^\s*Delete\s*$/ })).toBeNull();
  });
});

const message = 'Are you sure you want to delete "Front"? This action cannot be undone.';
const HOOK_DELETE_DOCS: (Doc & { headers: string[]; firstCells: string[]; secondCells: string[] })[] = [
  {
    name: "Unit", Page: UnitPage, module: "Unit Master", table: "Saved Unit List", placeholder: "Search units...",
    list: "/unit/unit-list",
    rows: [{ sNo: 1, unitId: 5, name: "Front", category: "Count", currentValue: 12 }, { sNo: 2, unitId: 6, name: "Bar", category: "Weight", currentValue: 0 }],
    detail: "/unit/5/unitid-data", detailData: { unitId: 5, name: "Front", category: "Count", conversion: 1, currentValue: 12, parentId: 0 },
    remove: "/unit/5", message, dialogTitle: "Delete Unit",
    headers: ["S.No", "Name", "Category", "Value", "Actions"], firstCells: ["1", "Front", "Count", "12"], secondCells: ["2", "Bar", "Weight", "0"],
  },
  {
    name: "Tax", Page: TaxPage, module: "Tax Master", table: "Saved Tax List", placeholder: "Search taxes...",
    list: "/vat/vat-list",
    rows: [{ sNo: 7, id: 5, name: "Front", value: 10 }, { sNo: 8, id: 6, name: "Bar", value: 5 }],
    detail: "/vat/5/vatid-data", detailData: { id: 5, name: "Front", value: 10, expireAt: "2099-01-01T00:00:00" },
    remove: "/vat/5", message, dialogTitle: "Delete Tax",
    headers: ["S.No", "Name", "Value (%)", "Actions"], firstCells: ["1", "Front", "10%"], secondCells: ["2", "Bar", "5%"],
  },
  {
    name: "Group", Page: GroupPage, module: "Group Master", table: "Saved Group List", placeholder: "Search groups...",
    list: "/group/group-list",
    rows: [{ sNo: 1, grpId: 5, code: "G5", name: "Front", isActive: "Active" }, { sNo: 2, grpId: 6, code: "G6", name: "Bar", isActive: "Inactive" }],
    detail: "/group/5/grpid-data", detailData: { grpId: 5, code: "G5", name: "Front", arabicName: "", isActive: true },
    remove: "/group/5", message, dialogTitle: "Delete Group",
    headers: ["S.No", "Code", "Name", "Status", "Actions"], firstCells: ["1", "G5", "Front", "Active"], secondCells: ["2", "G6", "Bar", "Inactive"],
  },
];

describe.each(HOOK_DELETE_DOCS)("$name master list", (doc) => {
  const rowOf = (row: number) => Array.from(document.querySelectorAll("tbody tr")).find((tr) => tr.textContent?.includes(row === 0 ? "Front" : "Bar")) as HTMLElement;
  const icon = (row: number, name: string) => rowOf(row).querySelector(`svg[class*="${name}"]`)?.closest("button") as HTMLElement | undefined;
  const cells = (row: number) => Array.from(rowOf(row).querySelectorAll("td")).map((td) => td.textContent?.trim());

  beforeEach(() => {
    http.get.mockImplementation(async (url: string) => {
      if (url === doc.list) return ok(doc.rows);
      if (url === doc.detail) return ok(doc.detailData);
      return ok([]);
    });
  });

  it("shows its columns and the permission it checks", async () => {
    show(doc.Page);
    await loaded();
    expect(screen.getByText(doc.table)).toBeTruthy();
    expect(Array.from(document.querySelectorAll("th")).map((th) => th.textContent?.trim().replace(/\s+/g, " "))).toEqual(doc.headers);
    expect(cells(0).slice(0, doc.firstCells.length)).toEqual(doc.firstCells);
    expect(cells(1).slice(0, doc.secondCells.length)).toEqual(doc.secondCells);
    expect([...perms.asked]).toEqual([doc.module]);
  });

  it("search narrows the list", async () => {
    show(doc.Page);
    await loaded();
    fireEvent.change(screen.getByPlaceholderText(doc.placeholder), { target: { value: "bar" } });
    await waitFor(() => {
      expect(rowTexts()).toHaveLength(1);
      expect(rowTexts()[0]).toContain("Bar");
    });
  });

  it("Add, Edit and Delete follow their permissions", async () => {
    perms.denied.add("Add");
    perms.denied.add("Edit");
    show(doc.Page);
    await loaded();
    expect(screen.queryByText("Add New")).toBeNull();
    expect(icon(0, "pencil")).toBeUndefined();
    expect(icon(0, "trash")).toBeTruthy();
    cleanup();
    perms.denied.clear();
    perms.denied.add("Delete");
    show(doc.Page);
    await loaded();
    expect(screen.getByText("Add New")).toBeTruthy();
    expect(icon(0, "pencil")).toBeTruthy();
    expect(icon(0, "trash")).toBeUndefined();
  });

  it("deleting asks first, Cancel keeps it, confirming deletes", async () => {
    show(doc.Page);
    await loaded();
    fireEvent.click(icon(0, "trash") as HTMLElement);
    expect(screen.getByText(doc.message)).toBeTruthy();
    expect(screen.getByText(doc.dialogTitle)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^\s*Cancel\s*$/ }));
    await waitFor(() => expect(screen.queryByText(doc.message)).toBeNull());
    expect(http.delete).not.toHaveBeenCalled();
    fireEvent.click(icon(0, "trash") as HTMLElement);
    fireEvent.click(plainDelete());
    await waitFor(() => expect(http.delete).toHaveBeenCalledWith(doc.remove));
    await waitFor(() => expect(screen.queryByText(doc.message)).toBeNull());
  });

  it("Edit loads the record, and Delete in the form asks first", async () => {
    show(doc.Page);
    await loaded();
    fireEvent.click(icon(0, "pencil") as HTMLElement);
    await waitFor(() => expect(http.get).toHaveBeenCalledWith(doc.detail));
    await waitFor(() => expect(screen.getAllByRole("button", { name: /^\s*Delete\s*$/ }).length).toBeGreaterThan(0));
    fireEvent.click(plainDelete());
    await waitFor(() => expect(screen.getByText(doc.message)).toBeTruthy());
    expect(http.delete).not.toHaveBeenCalled();
  });

  it("a failed load shows the reason and Retry loads again", async () => {
    http.get.mockImplementation(async (url: string) => (url === doc.list ? { data: { isSuccess: false, message: "Server said no" } } : ok([])));
    show(doc.Page);
    await waitFor(() => expect(screen.getByText("Retry")).toBeTruthy());
    expect(document.body.textContent).toContain("Server said no");
    http.get.mockImplementation(async (url: string) => (url === doc.list ? ok(doc.rows) : ok([])));
    fireEvent.click(screen.getByText("Retry"));
    await loaded();
    expect(screen.queryByText("Retry")).toBeNull();
  });
});

const TYPE_DOCS = [
  {
    name: "Stock Adjustment Type", Page: StockAdjustmentTypePage, module: null as string | null, table: "Stock Adjustment Types", placeholder: "Search adjustment types...",
    list: "/stock-adjustment-type/details", nameField: "typeName",
    rows: [{ sNo: 3, typeId: 5, typeName: "Front", effect: "+" }, { typeId: 6, typeName: "Bar", effect: "-" }],
    detail: null as string | null, detailData: null,
    remove: "/stock-adjustment-type/5", message: "Are you sure you want to delete this type? This action cannot be undone.", dialogTitle: "Delete Stock Adjustment Type",
    headers: ["S.No", "Type Name", "Effect", "Actions"], firstCells: ["3", "Front", "+"], secondCells: ["6", "Bar", "-"], formDelete: false,
  },
  {
    name: "Modifier Type", Page: ModifierTypePage, module: "Modifier Type" as string | null, table: "Saved Modifier Type List", placeholder: "Search modifier type...",
    list: "/modifiertype/modifiertype-list", nameField: "name",
    rows: [{ sNo: 1, typeId: 5, name: "Front", arabicName: "A" }, { sNo: 2, typeId: 6, name: "Bar", arabicName: "B" }],
    detail: "/modifiertype/5/typeid-data" as string | null, detailData: { typeId: 5, name: "Front", arabicName: "A", price: 0 },
    remove: "/modifiertype/5", message: 'Are you sure you want to delete "Front"?', dialogTitle: "Confirm Delete",
    headers: ["S.No", "Name", "Arabic", "Actions"], firstCells: ["1", "Front", "A"], secondCells: ["2", "Bar", "B"], formDelete: true,
  },
  {
    name: "Extras Type", Page: ExtrasTypePage, module: "Extras Type" as string | null, table: "Saved Extras Type List", placeholder: "Search extras type...",
    list: "/extrastype/modifiertype-list", nameField: "name",
    rows: [{ typeId: 5, name: "Front" }, { sNo: 9, typeId: 6, name: "Bar" }],
    detail: "/extrastype/5/typeid-data" as string | null, detailData: { typeId: 5, name: "Front", arabicName: "" },
    remove: "/extrastype/5", message: 'Are you sure you want to delete extras type "Front"?', dialogTitle: "Confirm Delete",
    headers: ["S.No", "Name", "Actions"], firstCells: ["1", "Front"], secondCells: ["9", "Bar"], formDelete: true,
  },
];

describe.each(TYPE_DOCS)("$name master list", (doc) => {
  const rowOf = (row: number) => Array.from(document.querySelectorAll("tbody tr")).find((tr) => tr.textContent?.includes(row === 0 ? "Front" : "Bar")) as HTMLElement;
  const icon = (row: number, name: string) => rowOf(row).querySelector(`svg[class*="${name}"]`)?.closest("button") as HTMLElement | undefined;
  const cells = (row: number) => Array.from(rowOf(row).querySelectorAll("td")).map((td) => td.textContent?.trim());

  beforeEach(() => {
    http.get.mockImplementation(async (url: string, config?: { params?: { typeName?: string } }) => {
      if (url.startsWith(doc.list)) {
        const query = decodeURIComponent(url.split("typeName=")[1] ?? config?.params?.typeName ?? "").toLowerCase();
        return ok(doc.rows.filter((row) => String((row as Record<string, unknown>)[doc.nameField]).toLowerCase().includes(query)));
      }
      if (url === doc.detail) return ok(doc.detailData);
      return ok([]);
    });
  });

  it("shows its columns and the permission it checks", async () => {
    show(doc.Page);
    await loaded();
    expect(screen.getByText(doc.table)).toBeTruthy();
    expect(Array.from(document.querySelectorAll("th")).map((th) => th.textContent?.trim())).toEqual(doc.headers);
    expect(cells(0).slice(0, doc.firstCells.length)).toEqual(doc.firstCells);
    expect(cells(1).slice(0, doc.secondCells.length)).toEqual(doc.secondCells);
    expect([...perms.asked]).toEqual(doc.module ? [doc.module] : []);
  });

  it("search narrows the list", async () => {
    show(doc.Page);
    await loaded();
    fireEvent.change(screen.getByPlaceholderText(doc.placeholder), { target: { value: "bar" } });
    await waitFor(() => {
      expect(rowTexts()).toHaveLength(1);
      expect(rowTexts()[0]).toContain("Bar");
    });
  });

  it("Add, Edit and Delete follow the permissions it has today", async () => {
    perms.denied.add("Add");
    perms.denied.add("Edit");
    perms.denied.add("Delete");
    show(doc.Page);
    await loaded();
    const shown = doc.module === null;
    expect(!!screen.queryByText("Add New")).toBe(shown);
    expect(!!icon(0, "pencil")).toBe(shown);
    expect(!!icon(0, "trash")).toBe(shown);
  });

  it("deleting asks first, Cancel keeps it, confirming deletes", async () => {
    show(doc.Page);
    await loaded();
    fireEvent.click(icon(0, "trash") as HTMLElement);
    expect(screen.getByText(doc.message)).toBeTruthy();
    expect(screen.getByText(doc.dialogTitle)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^\s*Cancel\s*$/ }));
    await waitFor(() => expect(screen.queryByText(doc.message)).toBeNull());
    expect(http.delete).not.toHaveBeenCalled();
    fireEvent.click(icon(0, "trash") as HTMLElement);
    fireEvent.click(plainDelete());
    await waitFor(() => expect(http.delete).toHaveBeenCalledWith(doc.remove));
    await waitFor(() => expect(screen.queryByText(doc.message)).toBeNull());
  });

  it("Edit opens the form, and Delete there asks first where it has one", async () => {
    show(doc.Page);
    await loaded();
    fireEvent.click(icon(0, "pencil") as HTMLElement);
    await waitFor(() => expect(screen.getByRole("button", { name: /^\s*Clear\s*$/ })).toBeTruthy());
    if (doc.detail) await waitFor(() => expect(http.get).toHaveBeenCalledWith(doc.detail));
    if (!doc.formDelete) {
      expect(screen.queryByRole("button", { name: /^\s*Delete\s*$/ })).toBeNull();
      return;
    }
    await waitFor(() => expect((plainDelete() as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(plainDelete());
    await waitFor(() => expect(screen.getByText(doc.message)).toBeTruthy());
    expect(http.delete).not.toHaveBeenCalled();
  });
});

describe("what only one of them does", () => {
  it("Unit locks its core rows with a reason", async () => {
    http.get.mockImplementation(async (url: string) => (url === "/unit/unit-list" ? ok([{ sNo: 1, unitId: 4, name: "Front", category: "Count", currentValue: 1 }]) : ok([])));
    show(UnitPage);
    await loaded();
    const button = (name: string) => document.querySelector(`tbody svg[class*="${name}"]`)?.closest("button") as HTMLButtonElement;
    expect(button("pencil").disabled).toBe(true);
    expect(button("pencil").title).toBe("Core system unit cannot be edited");
    expect(button("trash").disabled).toBe(true);
    expect(button("trash").title).toBe("Core system unit cannot be deleted");
  });

  it("a Group that cannot be deleted says why above the list", async () => {
    const doc = HOOK_DELETE_DOCS[2];
    http.get.mockImplementation(async (url: string) => (url === doc.list ? ok(doc.rows) : ok([])));
    http.delete.mockResolvedValue({ data: { isSuccess: false, message: "Group is in use" } });
    show(GroupPage);
    await loaded();
    fireEvent.click(Array.from(document.querySelectorAll("tbody tr")).find((tr) => tr.textContent?.includes("Front"))?.querySelector('svg[class*="trash"]')?.closest("button") as HTMLElement);
    fireEvent.click(plainDelete());
    await waitFor(() => expect(document.body.textContent).toContain("Group is in use"));
  });
});

describe("what differs between the lists", () => {
  it("Paymode numbers its rows and shows a status", async () => {
    http.get.mockImplementation(async (url: string) => (url === DOCS[2].list ? ok(DOCS[2].rows) : ok([])));
    show(PaymodePage);
    await loaded();
    const cells = (i: number) => Array.from(document.querySelectorAll("tbody tr")[i].querySelectorAll("td")).map((td) => td.textContent?.trim());
    expect(cells(0).slice(0, 4)).toEqual(["1", "10", "Front", "Active"]);
    expect(cells(1).slice(0, 4)).toEqual(["2", "20", "Bar", "Inactive"]);
  });

  it("Counter and Section show their second column", async () => {
    http.get.mockImplementation(async (url: string) => (url === DOCS[0].list ? ok(DOCS[0].rows) : ok([])));
    show(CounterPage);
    await loaded();
    expect(Array.from(document.querySelectorAll("th")).map((th) => th.textContent?.trim())).toEqual(["S No", "Name", "Branch", "Actions"]);
    cleanup();
    http.get.mockImplementation(async (url: string) => (url === DOCS[1].list ? ok(DOCS[1].rows) : ok([])));
    show(SectionPage);
    await loaded();
    expect(Array.from(document.querySelectorAll("th")).map((th) => th.textContent?.trim())).toEqual(["S No", "Name", "Counter", "Actions"]);
  });
});
