// @vitest-environment jsdom
/** Back Office Day End and Shift End reports: "All" in the branch list, and what is requested for it. */
import { createElement, type ReactNode } from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { store } from "../app/store";
import DayEndReportPage from "../features/reports/dayEndReport/pages/DayEndReportPage";
import ShiftEndReportPage from "../features/reports/shiftEndReport/pages/ShiftEndReportPage";
import { getDayEndReport } from "../features/reports/dayEndReport/services/dayEndReportApi";
import { getShiftEndReport, getCounterList, getUserList } from "../features/reports/shiftEndReport/services/shiftEndReportApi";
import { branchApi } from "../features/inventory/branches/services/branchApi";

vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
vi.mock("../features/reports/dayEndReport/services/dayEndReportApi", () => ({
  getDayEndReport: vi.fn(), getDayEndCashierLogDetail: vi.fn(async () => null),
}));
vi.mock("../features/reports/shiftEndReport/services/shiftEndReportApi", () => ({
  getShiftEndReport: vi.fn(), getUserList: vi.fn(), getCounterList: vi.fn(), getShiftEndCashierLogDetail: vi.fn(async () => null),
}));

vi.mock("../features/inventory/branches/services/branchApi", () => ({ branchApi: { fetchBranchNames: vi.fn() } }));

const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;
const NAVBAR_BRANCHES = [{ id: 1, branchName: "All" }, { id: 2, branchName: "Main" }, { id: 3, branchName: "Mall" }];

const show = (page: ReactNode) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(createElement(Provider, {
    store,
    children: createElement(QueryClientProvider, {
      client,
      children: createElement(MemoryRouter, null, page),
    }),
  }));
};
const branchInput = () => document.getElementById(document.getElementById("der-branch") ? "der-branch" : "ser-branch") as HTMLElement;
const lastBranchId = (fn: unknown) => mock(fn).mock.calls.at(-1)?.[0]?.BranchId;

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  localStorage.clear();
  sessionStorage.setItem("tempSystemType", "backoffice");
  mock(branchApi.fetchBranchNames).mockResolvedValue(NAVBAR_BRANCHES);
  mock(getDayEndReport).mockResolvedValue({ columns: [], rows: [] });
  mock(getShiftEndReport).mockResolvedValue({ columns: [], rows: [] });
  mock(getUserList).mockResolvedValue([]);
  mock(getCounterList).mockResolvedValue([]);
});
afterEach(() => cleanup());

describe.each([
  ["Day End", DayEndReportPage, getDayEndReport],
  ["Shift End", ShiftEndReportPage, getShiftEndReport],
] as const)("%s report", (_name, Page, load) => {
  it("takes its branch list from the navbar API", async () => {
    show(createElement(Page));
    await waitFor(() => expect(branchApi.fetchBranchNames).toHaveBeenCalledWith(true));
  });

  it("adds nothing of its own: no All unless the API sends it", async () => {
    mock(branchApi.fetchBranchNames).mockResolvedValue(NAVBAR_BRANCHES.slice(1));
    show(createElement(Page));
    await waitFor(() => expect(load).toHaveBeenCalled());
    await waitFor(() => expect(branchApi.fetchBranchNames).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect((branchInput().textContent || (branchInput() as HTMLInputElement).value)).not.toContain("All");
  });

  it("opens on All and asks the server for branch 1, never 0", async () => {
    show(createElement(Page));
    await waitFor(() => expect(load).toHaveBeenCalled());
    expect(lastBranchId(load)).toBe(1);
    await waitFor(() => expect(branchInput().textContent || (branchInput() as HTMLInputElement).value).toContain("All"));
  });

  it("a user locked to a branch stays on it", async () => {
    sessionStorage.setItem("backoffice_activeBranchId", "3");
    show(createElement(Page));
    await waitFor(() => expect(load).toHaveBeenCalled());
    expect(lastBranchId(load)).toBe(3);
  });
});

describe("Shift End counters", () => {
  it("are not loaded for All, which has none", async () => {
    show(createElement(ShiftEndReportPage));
    await waitFor(() => expect(getShiftEndReport).toHaveBeenCalled());
    expect(getCounterList).not.toHaveBeenCalled();
  });

  it("are loaded for a real branch", async () => {
    sessionStorage.setItem("backoffice_activeBranchId", "3");
    show(createElement(ShiftEndReportPage));
    await waitFor(() => expect(getCounterList).toHaveBeenCalledWith(3));
  });
});
