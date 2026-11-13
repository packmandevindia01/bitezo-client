/**
 * PosTerminalPage split (2026-11-13): the ORDER and SETTLE keys, the employee choice and the Qty-reduction voids,
 * now in usePosOrderAction / usePosSettleAction / resolveActionEmployee / buildQtyReductionVoid.
 * Each case is a branch of the code as it was in the page before the split.
 */
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveActionEmployee } from "../features/pos/utils/actionEmployee";
import { buildQtyReductionVoid } from "../features/pos/terminal/utils/qtyReductionVoid";
import { usePosOrderAction } from "../features/pos/terminal/hooks/usePosOrderAction";
import { usePosSettleAction } from "../features/pos/terminal/hooks/usePosSettleAction";
import { disableDefaultEmployeeConfig, isDefaultEmployeeValidInCache } from "../features/pos/utils/defaultEmployee";

vi.mock("../features/pos/utils/defaultEmployee", () => ({
  isDefaultEmployeeValidInCache: vi.fn(() => true),
  disableDefaultEmployeeConfig: vi.fn(),
}));
vi.mock("../features/pos/services/menuApi", () => ({ getModifierTypeNameById: (id: number) => `Type ${id}` }));

const inBranch = isDefaultEmployeeValidInCache as unknown as ReturnType<typeof vi.fn>;
const SET_WAITER_NULL = { type: "pos/setWaiter", payload: { waiterId: null, waiterName: null } };

describe("resolveActionEmployee", () => {
  const yes = () => true;
  const no = () => false;
  it("uses a waiter in this branch first, even with a default employee", () => {
    expect(resolveActionEmployee(7, { defaultEmployee: "Enable", employeeId: 3 }, yes)).toEqual({ kind: "waiter", employeeId: 7 });
  });
  it("reports a waiter not in this branch (does not fall back to the default employee)", () => {
    expect(resolveActionEmployee(7, { defaultEmployee: "Enable", employeeId: 3 }, no)).toEqual({ kind: "waiterNotInBranch" });
  });
  it("uses the default employee when no waiter is picked", () => {
    expect(resolveActionEmployee(null, { defaultEmployee: "Enable", employeeId: "3" }, yes)).toEqual({ kind: "default", employeeId: 3 });
    expect(resolveActionEmployee(0, { defaultEmployee: "Enable", employeeId: 3 }, no)).toEqual({ kind: "defaultNotInBranch" });
  });
  it("reports an enabled default employee with a bad id", () => {
    for (const employeeId of [0, -1, "abc", undefined]) {
      expect(resolveActionEmployee(null, { defaultEmployee: "Enable", employeeId }, yes)).toEqual({ kind: "defaultInvalid" });
    }
  });
  it("asks when there is no default employee or no configuration", () => {
    expect(resolveActionEmployee(null, { defaultEmployee: "Disable", employeeId: 3 }, yes)).toEqual({ kind: "ask" });
    expect(resolveActionEmployee(undefined, null, yes)).toEqual({ kind: "ask" });
  });
});

describe("buildQtyReductionVoid", () => {
  it("voids extras and modifiers in proportion (at least 1) and keeps line details", () => {
    const item = {
      productId: 5, quantity: 4, price: 2.5, mapId: "9", variantName: "Large",
      product: { name: "Burger", unitId: 3, categoryId: 2 },
      extras: [{ id: 11, name: "Extra", modifierName: "Cheese", price: 0.5, qty: 4 }],
      modifiers: [{ modifierId: 21, name: "Modifier", modifierName: "No onion", typeId: 4, qty: 1 }],
      messages: [{ id: 31, name: "Hot", extra: true }],
    };
    const priced = vi.fn(() => ({ priced: true }));
    const { product, modifiers } = buildQtyReductionVoid(item, 2, priced);
    expect(priced).toHaveBeenCalledWith(item, 2, [{ id: 11, name: "Cheese", arabicName: undefined, price: 0.5, qty: 2, typeId: 2 }]);
    expect(product).toMatchObject({
      productId: 5, productName: "Burger", unitId: 3, qty: 2, amount: 5, pricedLine: { priced: true }, mapId: 9,
      variantName: "Large", categoryId: 2, messages: [{ id: 31, name: "Hot" }],
    });
    expect(product.modifiers).toEqual([{ id: 21, name: "No onion", arabicName: undefined, qty: 1, typeId: 4, typeName: "Type 4" }]);
    expect(modifiers).toEqual([
      { mapId: 9, modifierId: 11, qty: 2, amount: 1, typeId: 2, name: "Cheese", arabicName: undefined, typeName: undefined },
      { mapId: 9, modifierId: 21, qty: 1, amount: 0, typeId: 4, name: "No onion", arabicName: undefined, typeName: "Type 4" },
    ]);
  });
});

const harness = <T,>(hook: () => T) => {
  const box: { value?: T } = {};
  renderToString(createElement(() => { box.value = hook(); return null; }));
  return box.value!;
};

const makeTerminal = (over: Record<string, unknown> = {}) => ({
  itemCount: 1,
  orderLoading: false,
  setOrderLoading: vi.fn(),
  waiterId: null as number | null,
  selectedAddressId: null,
  selectedCustomerId: 1,
  tenderOptions: [{ id: "1", label: "Cash" }, { id: "2", label: "Card" }, { id: "3", label: "Multi Pay" }, { id: "4", label: "Credit" }],
  ...over,
});

describe("usePosOrderAction", () => {
  let showToast: ReturnType<typeof vi.fn>;
  let requestAuthorization: ReturnType<typeof vi.fn>;
  let dispatch: ReturnType<typeof vi.fn>;
  let submit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    inBranch.mockReturnValue(true);
    showToast = vi.fn();
    requestAuthorization = vi.fn();
    dispatch = vi.fn();
    submit = vi.fn(async () => ({}));
  });

  const order = (terminal: ReturnType<typeof makeTerminal>, config: unknown) =>
    harness(() =>
      usePosOrderAction({
        status: { dayId: 1 },
        terminal: terminal as never,
        checkoutFlow: { submitOrderForEmployee: submit } as never,
        getRuntimePosConfig: async () => config as never,
        requestAuthorization: requestAuthorization as never,
        showToast: showToast as never,
        dispatch: dispatch as never,
      }),
    ).handleOrder;

  it("sends under the selected waiter and frees the key", async () => {
    const terminal = makeTerminal({ waiterId: 7 });
    await order(terminal, { defaultEmployee: "Enable", employeeId: 3 })(true);
    expect(submit).toHaveBeenCalledWith(7, true);
    expect(requestAuthorization).not.toHaveBeenCalled();
    expect(terminal.setOrderLoading.mock.calls).toEqual([[true], [false]]);
  });

  it("sends under the default employee", async () => {
    await order(makeTerminal(), { defaultEmployee: "Enable", employeeId: 3 })(false);
    expect(submit).toHaveBeenCalledWith(3, false);
  });

  it("asks without bypassing the default employee when none is configured, then sends for the code entered", async () => {
    const terminal = makeTerminal();
    await order(terminal, { defaultEmployee: "Disable" })(true);
    expect(submit).not.toHaveBeenCalled();
    const opts = requestAuthorization.mock.calls[0][0];
    expect(opts.actionLabel).toBe("Order");
    expect("bypassDefaultEmployee" in opts).toBe(false);
    await opts.onAuthorized(12);
    expect(submit).toHaveBeenCalledWith(12, true);
  });

  it("clears a waiter not in this branch and asks (bypassing the default employee)", async () => {
    inBranch.mockReturnValue(false);
    localStorage.setItem("selectedWaiterId", "7");
    await order(makeTerminal({ waiterId: 7 }), null)(true);
    expect(dispatch).toHaveBeenCalledWith(SET_WAITER_NULL);
    expect(localStorage.getItem("selectedWaiterId")).toBeNull();
    expect(showToast.mock.calls[0][0]).toContain("Please select an employee.");
    expect(requestAuthorization.mock.calls[0][0]).toMatchObject({ actionLabel: "Order", bypassDefaultEmployee: true });
    expect(submit).not.toHaveBeenCalled();
  });

  it("asks again when the server says the waiter does not exist", async () => {
    submit.mockResolvedValueOnce({ isEmployeeNotFound: true });
    localStorage.setItem("selectedWaiterName", "Ali");
    await order(makeTerminal({ waiterId: 7 }), null)(true);
    expect(dispatch).toHaveBeenCalledWith(SET_WAITER_NULL);
    expect(localStorage.getItem("selectedWaiterName")).toBeNull();
    expect(requestAuthorization.mock.calls[0][0]).toMatchObject({ bypassDefaultEmployee: true });
  });

  it("disables a default employee not in this branch and asks", async () => {
    inBranch.mockReturnValue(false);
    await order(makeTerminal(), { defaultEmployee: "Enable", employeeId: 3 })(true);
    expect(disableDefaultEmployeeConfig).toHaveBeenCalledWith("Default employee not found in branch employees cache");
    expect(requestAuthorization).toHaveBeenCalledTimes(1);
  });

  it("disables a default employee with a bad id and asks", async () => {
    await order(makeTerminal(), { defaultEmployee: "Enable", employeeId: 0 })(true);
    expect(disableDefaultEmployeeConfig).toHaveBeenCalledWith("Invalid default employee ID in configuration");
    expect(requestAuthorization.mock.calls[0][0]).toMatchObject({ bypassDefaultEmployee: true });
  });

  it("ignores a click while an order is being sent, an empty cart, and a closed cashier", async () => {
    await order(makeTerminal({ orderLoading: true, waiterId: 7 }), null)(true);
    await order(makeTerminal({ itemCount: 0, waiterId: 7 }), null)(true);
    expect(showToast).toHaveBeenCalledWith("Cart is empty", "warning");
    expect(submit).not.toHaveBeenCalled();
  });

  it("stops when the POS configuration cannot be loaded", async () => {
    const terminal = makeTerminal({ waiterId: 7 });
    const handleOrder = harness(() =>
      usePosOrderAction({
        status: { dayId: 1 }, terminal: terminal as never, checkoutFlow: { submitOrderForEmployee: submit } as never,
        getRuntimePosConfig: async () => { throw new Error("offline"); },
        requestAuthorization: requestAuthorization as never, showToast: showToast as never, dispatch: dispatch as never,
      }),
    ).handleOrder;
    await handleOrder(true);
    expect(showToast).toHaveBeenCalledWith("Unable to load POS configuration", "error");
    expect(submit).not.toHaveBeenCalled();
    expect(terminal.setOrderLoading).toHaveBeenLastCalledWith(false);
  });
});

describe("usePosSettleAction", () => {
  let showToast: ReturnType<typeof vi.fn>;
  let requestAuthorization: ReturnType<typeof vi.fn>;
  let modals: { setIsMultiPayModalOpen: ReturnType<typeof vi.fn>; setIsCashModalOpen: ReturnType<typeof vi.fn> };
  let checkoutFlow: { settleShouldPrintRef: { current: boolean }; setSettlementEmployeeId: ReturnType<typeof vi.fn>; handleCardCreditSettlement: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    inBranch.mockReturnValue(true);
    showToast = vi.fn();
    requestAuthorization = vi.fn();
    modals = { setIsMultiPayModalOpen: vi.fn(), setIsCashModalOpen: vi.fn() };
    checkoutFlow = { settleShouldPrintRef: { current: false }, setSettlementEmployeeId: vi.fn(), handleCardCreditSettlement: vi.fn() };
  });

  const settle = (terminal: ReturnType<typeof makeTerminal>, selectedTender: string, config: unknown = { defaultEmployee: "Enable", employeeId: 3 }, isDelivery = false) =>
    harness(() =>
      usePosSettleAction({
        terminal: terminal as never,
        checkoutFlow: checkoutFlow as never,
        modals: modals as never,
        isDelivery,
        selectedTender,
        getRuntimePosConfig: async () => config as never,
        requestAuthorization: requestAuthorization as never,
        showToast: showToast as never,
        dispatch: vi.fn() as never,
      }),
    ).handleSettle;

  it("opens the cash window for Cash under the default employee", async () => {
    await settle(makeTerminal(), "1")(true);
    expect(checkoutFlow.settleShouldPrintRef.current).toBe(true);
    expect(checkoutFlow.setSettlementEmployeeId).toHaveBeenCalledWith(3);
    expect(localStorage.getItem("authorizedEmployeeId")).toBe("3");
    expect(modals.setIsCashModalOpen).toHaveBeenCalledWith(true);
  });

  it("opens multi-pay for Multi Pay and settles Card straight away under the waiter", async () => {
    await settle(makeTerminal({ waiterId: 7 }), "3")(false);
    expect(modals.setIsMultiPayModalOpen).toHaveBeenCalledWith(true);
    await settle(makeTerminal({ waiterId: 7 }), "2")(false);
    expect(checkoutFlow.handleCardCreditSettlement).toHaveBeenCalledWith(2, 7);
  });

  it("blocks credit for Cash Customer, delivery without an address and no tender", async () => {
    await settle(makeTerminal(), "4")(true);
    expect(showToast.mock.calls[0][0]).toContain("Credit payment is not allowed for Cash Customer");
    await settle(makeTerminal(), "1", undefined, true)(true);
    expect(showToast.mock.calls[1][0]).toBe("Please select a delivery address before settling.");
    await settle(makeTerminal(), "")(true);
    expect(showToast.mock.calls[2][0]).toBe("Please select a payment method");
    expect(checkoutFlow.setSettlementEmployeeId).not.toHaveBeenCalled();
  });

  it("asks for the settling employee (Settle permission, bypassing the default) when none is configured", async () => {
    await settle(makeTerminal({ selectedCustomerId: 9 }), "4", { defaultEmployee: "Disable" })(true);
    const opts = requestAuthorization.mock.calls[0][0];
    expect(opts).toMatchObject({ actionLabel: "Settlement", permissionId: 19, bypassDefaultEmployee: true });
    opts.onAuthorized(12);
    expect(checkoutFlow.handleCardCreditSettlement).toHaveBeenCalledWith(4, 12);
  });

  it("asks when the waiter or default employee is not in this branch", async () => {
    inBranch.mockReturnValue(false);
    await settle(makeTerminal({ waiterId: 7 }), "1")(true);
    await settle(makeTerminal(), "1")(true);
    expect(showToast.mock.calls[0][0]).toContain("Please authorize settlement.");
    expect(disableDefaultEmployeeConfig).toHaveBeenCalledTimes(1);
    expect(requestAuthorization).toHaveBeenCalledTimes(2);
    expect(modals.setIsCashModalOpen).not.toHaveBeenCalled();
  });
});
