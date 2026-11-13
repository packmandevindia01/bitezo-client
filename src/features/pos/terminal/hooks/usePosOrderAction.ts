import { useRef } from "react";
import type { AppDispatch } from "../../../../app/store";
import { setWaiter } from "../store/posSlice";
import { disableDefaultEmployeeConfig, isDefaultEmployeeValidInCache } from "../../utils/defaultEmployee";
import { resolveActionEmployee } from "../../utils/actionEmployee";
import { clearSelectedWaiter } from "../utils/clearSelectedWaiter";
import type { RuntimePosConfig } from "../../services/posConfigApi";
import type { useToast } from "../../../../app/providers/useToast";
import type { usePosTerminal } from "./usePosTerminal";
import type { usePosCheckoutFlow } from "./usePosCheckoutFlow";
import type { useEmployeeAuthorization } from "./useEmployeeAuthorization";

interface UsePosOrderActionProps {
  status: unknown;
  terminal: ReturnType<typeof usePosTerminal>;
  checkoutFlow: ReturnType<typeof usePosCheckoutFlow>;
  getRuntimePosConfig: () => Promise<RuntimePosConfig | null>;
  requestAuthorization: ReturnType<typeof useEmployeeAuthorization>["requestAuthorization"];
  showToast: ReturnType<typeof useToast>["showToast"];
  dispatch: AppDispatch;
}

/**
 * The ORDER key on the terminal (moved out of PosTerminalPage, 2026-11-13). Sends the order under the waiter,
 * the default employee or an employee code (see resolveActionEmployee). One order at a time: extra clicks while
 * an order is being sent are ignored.
 */
export const usePosOrderAction = ({
  status,
  terminal,
  checkoutFlow,
  getRuntimePosConfig,
  requestAuthorization,
  showToast,
  dispatch,
}: UsePosOrderActionProps) => {
  const isOrderingRef = useRef<boolean>(false);

  const handleOrder = async (shouldPrint: boolean) => {
    if (isOrderingRef.current || terminal.orderLoading) {
      console.warn("[PosTerminalPage] Order already in progress, ignoring extra click.");
      return;
    }
    if (terminal.itemCount === 0) {
      showToast("Cart is empty", "warning");
      return;
    }
    if (!status) return;

    isOrderingRef.current = true;
    terminal.setOrderLoading(true);

    /** Sends the order under the employee whose code was entered. */
    const submitForAuthorizedEmployee = async (empId: number) => {
      if (isOrderingRef.current || terminal.orderLoading) return;
      isOrderingRef.current = true;
      terminal.setOrderLoading(true);
      try {
        await checkoutFlow.submitOrderForEmployee(empId, shouldPrint);
      } finally {
        terminal.setOrderLoading(false);
        isOrderingRef.current = false;
      }
    };

    /** Frees the ORDER key and asks for an employee code. */
    const askForEmployee = (bypassDefaultEmployee: boolean) => {
      terminal.setOrderLoading(false);
      isOrderingRef.current = false;
      requestAuthorization({
        actionLabel: "Order",
        ...(bypassDefaultEmployee ? { bypassDefaultEmployee: true } : {}),
        onAuthorized: submitForAuthorizedEmployee,
      });
    };

    try {
      let config: RuntimePosConfig | null = null;
      try {
        config = await getRuntimePosConfig();
      } catch {
        showToast("Unable to load POS configuration", "error");
        return;
      }

      const employee = resolveActionEmployee(terminal.waiterId, config, isDefaultEmployeeValidInCache);
      switch (employee.kind) {
        case "waiterNotInBranch":
          clearSelectedWaiter(dispatch);
          showToast("The selected waiter was not found in this branch and has been cleared. Please select an employee.", "warning");
          askForEmployee(true);
          return;
        case "waiter": {
          const waiterRes = await checkoutFlow.submitOrderForEmployee(employee.employeeId, shouldPrint);
          if (waiterRes && (waiterRes as { isEmployeeNotFound?: boolean }).isEmployeeNotFound) {
            clearSelectedWaiter(dispatch);
            askForEmployee(true);
          }
          return;
        }
        case "defaultNotInBranch":
          disableDefaultEmployeeConfig("Default employee not found in branch employees cache");
          dispatch(setWaiter({ waiterId: null, waiterName: null }));
          showToast("Configured default employee was not found in this branch and has been disabled. Please select an employee.", "warning");
          askForEmployee(true);
          return;
        case "default": {
          const res = await checkoutFlow.submitOrderForEmployee(employee.employeeId, shouldPrint);
          if (res && (res as { isEmployeeNotFound?: boolean }).isEmployeeNotFound) {
            dispatch(setWaiter({ waiterId: null, waiterName: null }));
            askForEmployee(true);
          }
          return;
        }
        case "defaultInvalid":
          disableDefaultEmployeeConfig("Invalid default employee ID in configuration");
          dispatch(setWaiter({ waiterId: null, waiterName: null }));
          showToast("Default employee was not configured properly and has been disabled. Please select an employee.", "warning");
          askForEmployee(true);
          return;
        case "ask":
          // No default employee: ask for an employee code (the default employee is not bypassed here).
          askForEmployee(false);
          return;
      }
    } finally {
      terminal.setOrderLoading(false);
      isOrderingRef.current = false;
    }
  };

  return { handleOrder };
};
