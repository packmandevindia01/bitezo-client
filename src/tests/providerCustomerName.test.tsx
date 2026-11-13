// @vitest-environment jsdom
/**
 * Provider order customer (2026-11-13): the provider's post account is the order's customer. The POS used to set only its
 * id, so the screen kept the previous name and the settle receipt printed "WALK IN". Now the account's NAME is set too
 * (from GET /provider/account-list), and the settle receipt uses the on-screen customer before "WALK IN"
 * (terminalSettleSnapshot: a cash sale prints "CASH CUSTOMER").
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const accounts = vi.hoisted(() => ({ fetchProviderAccounts: vi.fn() }));
vi.mock("../features/general/provider/services/providerService", () => accounts);

import { providerAccountName, resetProviderAccountNames } from "../features/pos/utils/providerAccountName";
import { usePosProviderTender } from "../features/pos/terminal/hooks/usePosProviderTender";
import { setCustomerId, setSelectedCustomer } from "../features/pos/terminal/store/posSlice";

beforeEach(() => {
  resetProviderAccountNames();
  accounts.fetchProviderAccounts.mockReset();
  accounts.fetchProviderAccounts.mockResolvedValue([
    { customerId: 1, code: "1", customerName: "CASH CUSTOMER" },
    { customerId: 5, code: "101", customerName: "Rahul" },
  ]);
});

describe("providerAccountName", () => {
  it("names a post account by id (as /provider/account-list returns them)", async () => {
    expect(await providerAccountName(1)).toBe("CASH CUSTOMER");
    expect(await providerAccountName(5)).toBe("Rahul");
    expect(await providerAccountName(99)).toBe("");
    expect(await providerAccountName(0)).toBe("");
  });

  it("loads the list once", async () => {
    await providerAccountName(1);
    await providerAccountName(5);
    expect(accounts.fetchProviderAccounts).toHaveBeenCalledTimes(1);
  });

  it("a failed load gives no name and is retried next time", async () => {
    accounts.fetchProviderAccounts.mockRejectedValueOnce(new Error("offline"));
    expect(await providerAccountName(5)).toBe("");
    expect(await providerAccountName(5)).toBe("Rahul");
  });
});

describe("picking a provider sets its post account as the customer, with the name", () => {
  const render = () => {
    const dispatch = vi.fn();
    const terminal = { tenderOptions: [], selectedCustomerId: 1 } as never;
    const hook = renderHook(() => usePosProviderTender({ terminal, dispatch }));
    return { dispatch, hook };
  };

  it("Swiggy (account 1): customer 1, named CASH CUSTOMER", async () => {
    const { dispatch, hook } = render();
    act(() => hook.result.current.setActiveProvider({ provider: { providerId: 5, providerName: "Swiggy", imageUrl: null, paymodeId: 1, postAccountId: 1 }, orderNo: "012" }));
    expect(dispatch).toHaveBeenCalledWith(setCustomerId(1));
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith(setSelectedCustomer({ id: 1, name: "CASH CUSTOMER" })));
  });

  it("Zomato (account 5): customer 5, named Rahul", async () => {
    const { dispatch, hook } = render();
    act(() => hook.result.current.setActiveProvider({ provider: { providerId: 6, providerName: "Zomato", imageUrl: null, paymodeId: 2, postAccountId: 5 }, orderNo: "013" }));
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith(setSelectedCustomer({ id: 5, name: "Rahul" })));
  });
});
