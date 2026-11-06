import { createElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, beforeEach, vi } from "vitest";
import axiosInstance from "../api/axiosInstance";
import { menuApi, getCachedExtras, setCachedExtras } from "../features/pos/services/menuApi";
import { SkipPermissionsContext, usePermissions } from "../hooks/usePermissions";
import { posBranchIds } from "../features/inventory/shared/posAllocationScope";

vi.mock("../api/axiosInstance", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock("../app/hooks", () => ({
  useAppSelector: (select: (state: unknown) => unknown) => select({ auth: { isMaster: false, userRoles: [] } }),
}));

const get = axiosInstance.get as unknown as ReturnType<typeof vi.fn>;
const serverExtras = (extras: unknown[] | null) => ({
  data: { isSuccess: true, status: 200, data: { extras }, errors: [] },
});

const CanAddExtras = () => String(usePermissions().hasPermission("Extras Master", "Add"));
const render = (node: ReactNode) => renderToString(node);

describe("POS Extras & Modifiers: no permission checks in the POS", () => {
  it("a user with no roles can add inside the POS screen", () => {
    const html = render(
      createElement(SkipPermissionsContext.Provider, { value: true }, createElement(CanAddExtras))
    );
    expect(html).toBe("true");
  });

  it("the same user is still refused outside it (Back Office)", () => {
    expect(render(createElement(CanAddExtras))).toBe("false");
  });
});

describe("POS Extras & Modifiers: branches saved from the POS", () => {
  it("a new record goes to the logged-in branch", () => {
    expect(posBranchIds(2)).toEqual([2]);
  });

  it("an edited record keeps its other branches and gains the logged-in branch", () => {
    expect(posBranchIds(2, [1, 3])).toEqual([1, 3, 2]);
  });

  it("does not repeat the logged-in branch", () => {
    expect(posBranchIds(2, [1, 2])).toEqual([1, 2]);
  });
});

describe("POS Extras & Modifiers: extras cache after leaving the screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setCachedExtras([{ id: 1, name: "Old Mayo", price: 1 }]);
  });

  it("replaces the cached name and price with the edited values", async () => {
    get.mockResolvedValue(serverExtras([{ extrasId: 1, extraName: "New Mayo", price: 2.5 }]));
    await menuApi.refreshAllExtras();
    expect(getCachedExtras()).toEqual([{ id: 1, name: "New Mayo", price: 2.5, typeId: 2 }]);
  });

  it("keeps the old list when the request fails, so saved orders still recognise extras", async () => {
    get.mockRejectedValue(new Error("offline"));
    await menuApi.refreshAllExtras();
    expect(getCachedExtras()).toEqual([{ id: 1, name: "Old Mayo", price: 1, typeId: 2 }]);
  });

  it("getAllExtras still answers from the cache without a request", async () => {
    expect(await menuApi.getAllExtras()).toEqual([{ id: 1, name: "Old Mayo", price: 1, typeId: 2 }]);
    expect(get).not.toHaveBeenCalled();
  });
});
