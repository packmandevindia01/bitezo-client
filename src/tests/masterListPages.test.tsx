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
