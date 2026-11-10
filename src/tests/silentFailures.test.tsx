// @vitest-environment jsdom
/** A failed safety check must be visible: the day-close pending check, and the POS locked items list. */
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkPendingOrders } from "../features/pos/terminal/utils/pendingDayCheck";
import { useLockedProducts } from "../features/pos/terminal/hooks/useLockedProducts";
import { lockProductService } from "../features/pos/lockItem/services/lockProductService";

const showToast = vi.hoisted(() => vi.fn());
vi.mock("../app/providers/useToast", () => ({ useToast: () => ({ showToast }) }));
vi.mock("../features/pos/lockItem/services/lockProductService", () => ({ lockProductService: { list: vi.fn() } }));

const list = vi.mocked(lockProductService.list);
const WARNING = "Could not refresh locked items. Using the last list saved on this device.";
const reply = (ids: number[]) => ids.map((productId) => ({ productId })) as never;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => cleanup());

describe("pending orders check before closing the day", () => {
  it("no pending orders is clear", async () => {
    await expect(checkPendingOrders(async () => ({ hasPendingOrder: false }), 7)).resolves.toBe("clear");
  });

  it("pending orders are reported, for that day", async () => {
    const check = vi.fn(async () => ({ hasPendingOrder: true }));
    await expect(checkPendingOrders(check, 7)).resolves.toBe("pending");
    expect(check).toHaveBeenCalledWith(7);
  });

  it("a failed check is not treated as clear", async () => {
    await expect(checkPendingOrders(async () => { throw new Error("network"); }, 7)).resolves.toBe("failed");
  });
});

describe("POS locked items", () => {
  it("uses the server list and saves it on this device", async () => {
    list.mockResolvedValue(reply([5, 6]));
    const { result } = renderHook(() => useLockedProducts());
    await waitFor(() => expect([...result.current.lockedIds]).toEqual([5, 6]));
    expect(localStorage.getItem("posLockedProductIds")).toBe("[5,6]");
    expect(showToast).not.toHaveBeenCalled();
  });

  it("a failed first load keeps the saved list and warns", async () => {
    localStorage.setItem("posLockedProductIds", "[9]");
    list.mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useLockedProducts());
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(WARNING, "warning"));
    expect([...result.current.lockedIds]).toEqual([9]);
  });

  it("a later failure keeps the current list", async () => {
    list.mockResolvedValueOnce(reply([5]));
    const { result } = renderHook(() => useLockedProducts());
    await waitFor(() => expect([...result.current.lockedIds]).toEqual([5]));
    list.mockRejectedValue(new Error("down"));
    await act(async () => { await result.current.refreshLockedProducts(); });
    expect([...result.current.lockedIds]).toEqual([5]);
  });

  it("repeated failures warn once, and a recovery allows the next warning", async () => {
    list.mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useLockedProducts());
    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(1));
    await act(async () => { await result.current.refreshLockedProducts(); });
    expect(showToast).toHaveBeenCalledTimes(1);
    list.mockResolvedValueOnce(reply([]));
    await act(async () => { await result.current.refreshLockedProducts(); });
    await act(async () => { await result.current.refreshLockedProducts(); });
    expect(showToast).toHaveBeenCalledTimes(2);
  });

  it("a damaged saved list counts as empty", async () => {
    localStorage.setItem("posLockedProductIds", "not json");
    list.mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useLockedProducts());
    await waitFor(() => expect(showToast).toHaveBeenCalled());
    expect(result.current.lockedIds.size).toBe(0);
  });
});
