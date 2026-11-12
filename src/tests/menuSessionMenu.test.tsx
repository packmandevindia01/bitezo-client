// @vitest-environment jsdom
/**
 * Menu sessions (Menu Time Settings) on the POS (2026-11-12). Categories are allocated to sessions in Category Master;
 * the server returns a session's categories for /menu/{menuId}/categories and lists only the sessions running now in
 * master data. The POS used to pad that list with every category (master data + Category Master), so a session showed
 * all categories; it also kept an ended session selected.
 */
import { createElement, type ReactNode } from "react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import posReducer, { setGroup } from "../features/pos/terminal/store/posSlice";

const ALL = [
  { id: 1, name: "General" }, { id: 2, name: "Juice" }, { id: 3, name: "Rice" }, { id: 4, name: "aaaa" }, { id: 5, name: "Shirt" },
];
const server = vi.hoisted(() => ({
  menu: [] as { menuId: number; menuName: string }[],
  /** What /menu/{menuId}/categories returns per menu id. */
  byMenu: {} as Record<number, { id: number; name: string }[]>,
  requested: [] as number[],
}));

vi.mock("../features/pos/terminal/hooks/usePosQueries", () => ({
  POS_QUERY_KEYS: { all: ["pos"] },
  usePosMasterData: () => ({ data: { menu: server.menu, group: [], category: ALL, orderTypes: [], paymodes: [] }, isLoading: false, refetch: vi.fn() }),
  usePosCategories: (groupId: number | null | undefined) => {
    if (groupId === null || groupId === undefined) return { data: [], isLoading: false };
    server.requested.push(groupId);
    return { data: server.byMenu[groupId] ?? [], isLoading: false };
  },
  usePosSubCategories: () => ({ data: [], isLoading: false }),
  usePosProductsList: () => ({ data: [], isLoading: false }),
}));
vi.mock("../features/inventory/category/hooks/useCategoryQueries", () => ({ useCategories: () => ({ data: ALL.map((c) => ({ ...c, isActive: true, posStatus: true })), refetch: vi.fn() }) }));
vi.mock("../features/inventory/category/utils/categorySync", () => ({ subscribeToCategoryUpdates: () => () => {} }));
vi.mock("../features/pos/terminal/hooks/useLockedProducts", () => ({ useLockedProducts: () => ({ lockedIds: new Set(), refreshLockedProducts: vi.fn() }) }));
vi.mock("../hooks/usePermissions", () => ({ usePermissions: () => ({ hasPermission: () => true }) }));
vi.mock("../utils/authUtils", () => ({ isBackofficeMode: () => true }));
vi.mock("@tanstack/react-query", async (orig) => ({ ...(await orig<object>()), useQueryClient: () => ({ invalidateQueries: vi.fn(), refetchQueries: vi.fn() }) }));

import { usePosProducts } from "../features/pos/terminal/hooks/usePosProducts";
import { isMenuSessionRunning } from "../features/pos/services/menuApi";

const setup = () => {
  const store = configureStore({ reducer: { pos: posReducer } });
  const wrapper = ({ children }: { children: ReactNode }) => createElement(Provider, { store, children });
  const hook = renderHook(() => usePosProducts(), { wrapper });
  return { store, ...hook };
};
const names = (cats: { name: string }[]) => cats.map((c) => c.name);

beforeEach(() => {
  server.requested = [];
  server.menu = [{ menuId: 1, menuName: "Breakfast" }, { menuId: 2, menuName: "Lunch" }];
  server.byMenu = { 0: ALL, 1: [ALL[0], ALL[1]], 2: [ALL[2]] };
});

describe("menu session categories", () => {
  it("a running session shows only its allocated categories (no padding with every category)", async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.activeGroupId).toBe(1));
    expect(names(result.current.categories)).toEqual(["General", "Juice"]);
  });

  it("switching session shows that session's categories", async () => {
    const { result, store } = setup();
    await waitFor(() => expect(result.current.activeGroupId).toBe(1));
    store.dispatch(setGroup(2));
    await waitFor(() => expect(names(result.current.categories)).toEqual(["Rice"]));
  });

  it("when the selected session ends, the POS moves to the session running now", async () => {
    const { result, rerender } = setup();
    await waitFor(() => expect(result.current.activeGroupId).toBe(1));
    server.menu = [{ menuId: 2, menuName: "Lunch" }]; // Breakfast ended (master data refresh)
    rerender();
    await waitFor(() => expect(result.current.activeGroupId).toBe(2));
    expect(names(result.current.categories)).toEqual(["Rice"]);
  });

  it("no session running: menu 0, every category, as for shops without sessions", async () => {
    server.menu = [];
    const { result } = setup();
    await waitFor(() => expect(result.current.activeGroupId).toBe(0));
    expect(server.requested).toContain(0);
    expect(names(result.current.categories)).toEqual(names(ALL));
  });
});


describe("isMenuSessionRunning (used once master data sends each session's times)", () => {
  // The sessions set up on 8060, 2026-11-12.
  const breakfast = ["06:00:00", "23:59:00"], lunch = ["12:00:00", "03:00:00"], snacks = ["15:00:00", "19:00:00"], dinner = ["19:00:00", "00:00:00"];
  const running = (now: string) =>
    Object.entries({ breakfast, lunch, snacks, dinner }).filter(([, [s, e]]) => isMenuSessionRunning(s, e, now)).map(([n]) => n);

  it("16:35: Breakfast, Lunch, Evening Snacks — not Dinner", () => {
    expect(running("16:35:00")).toEqual(["breakfast", "lunch", "snacks"]);
  });
  it("19:00: Evening Snacks has ended (end is exclusive), Dinner has started", () => {
    expect(running("19:00:00")).toEqual(["breakfast", "lunch", "dinner"]);
  });
  it("windows over midnight: 02:00 is still Lunch (12:00–03:00); 05:00 nothing", () => {
    expect(running("02:00:00")).toEqual(["lunch"]);
    expect(running("05:00:00")).toEqual([]);
  });
  it("Dinner 19:00–00:00 runs until midnight", () => {
    expect(isMenuSessionRunning(dinner[0], dinner[1], "23:59:59")).toBe(true);
    expect(isMenuSessionRunning(dinner[0], dinner[1], "00:00:00")).toBe(false);
  });
  it("same start and end = all day; no times = the server decides", () => {
    expect(isMenuSessionRunning("00:00:00", "00:00:00", "04:00:00")).toBe(true);
    expect(isMenuSessionRunning(undefined, undefined, "04:00:00")).toBe(true);
  });
});
