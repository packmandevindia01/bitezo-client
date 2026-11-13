// @vitest-environment jsdom
/**
 * Safety net for moving seven more list screens onto MasterListPage (2026-11-13): each page rendered with one saved
 * row (real hooks, pages and API layers; only HTTP and permissions mocked), then with its delete question open.
 */
import { createElement, type ComponentType } from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { store } from "../app/store";
import CustomerList from "../features/company/customer/pages/CustomerList";
import UserList from "../features/general/user/pages/UserList";
import SupplierList from "../features/general/supplier/pages/SupplierList";
import EmployeeRolePage from "../features/general/employeeRole/pages/EmployeeRolePage";
import ExtrasMasterPage from "../features/inventory/extrasMaster/pages/ExtrasMasterPage";
import ModifierPage from "../features/inventory/modifier/pages/ModifierPage";
import MenuSettingsPage from "../features/general/menuSettings/pages/MenuSettingsPage";

vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }));
vi.mock("../api/axiosInstance", () => ({ default: http }));
vi.mock("../app/providers/useToast", () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock("../hooks/usePermissions", async (original) => ({
  ...(await original<object>()),
  usePermissions: () => ({ hasPermission: () => true }),
}));

/** One saved row with the field names any of the seven lists may read. */
const ROW = {
  id: 1, sNo: 1, customerId: 1, userId: 1, supplierId: 1, roleId: 1, menuId: 1, extraId: 1, modifierId: 1,
  customerCode: "C1", supplierCode: "S1", menuCode: "M1", code: "K1",
  customerName: "Acme", userName: "Acme", supplierName: "Acme", roleName: "Acme", menuName: "Acme", name: "Acme",
  mobileNo: "555", phone: "555", openingBalance: 5, isActive: true, status: true,
  branch: "Main", branchName: "Main", branchId: 2, employeeName: "Ali",
  fromTime: "08:00", toTime: "12:00", startTime: "08:00", endTime: "12:00", price: 1.5, typeName: "Hot",
};

const PAGES: [string, ComponentType][] = [
  ["Customer", CustomerList],
  ["User", UserList],
  ["Supplier", SupplierList],
  ["Employee Role", EmployeeRolePage],
  ["Extras Master", ExtrasMasterPage],
  ["Modifier", ModifierPage],
  ["Menu Settings", MenuSettingsPage],
];

const renderPage = (Page: ComponentType) =>
  render(
    createElement(Provider, { store, children:
      createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }), children:
        createElement(MemoryRouter, null, createElement(Page)) }) }),
  );

const html = () => document.body.innerHTML.replace(/«r[0-9a-z]+»|:r[0-9a-z]+:/g, "ID");

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem("decimalPart", "3");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  http.get.mockImplementation(async (url: string) => {
    const ok = (data: unknown) => ({ data: { isSuccess: true, data } });
    if (/list/i.test(url)) return ok([ROW]);
    return ok(null);
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe.each(PAGES)("%s list", (_name, Page) => {
  it("with one saved row, and with its delete question open", async () => {
    renderPage(Page);
    await waitFor(() => expect(screen.getAllByText("Acme").length).toBeGreaterThan(0));
    await new Promise((r) => setTimeout(r, 100));
    expect(html()).toMatchSnapshot("list");
    fireEvent.click(screen.getByRole("button", { name: /^Delete Acme$/ }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeTruthy());
    expect(html()).toMatchSnapshot("delete question");
  });
});
