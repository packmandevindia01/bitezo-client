import type { AppDispatch } from "../../../../app/store";
import { setWaiter } from "../store/posSlice";
import { disableDefaultEmployeeConfig, isDefaultEmployeeValidInCache } from "../../utils/defaultEmployee";
import { resolveActionEmployee } from "../../utils/actionEmployee";
import { clearSelectedWaiter } from "../utils/clearSelectedWaiter";
import type { RuntimePosConfig } from "../../services/posConfigApi";
import type { useToast } from "../../../../app/providers/useToast";
import type { usePosTerminal } from "./usePosTerminal";
import type { usePosCheckoutFlow } from "./usePosCheckoutFlow";
import type { usePosModals } from "./usePosModals";
import type { useEmployeeAuthorization } from "./useEmployeeAuthorization";

interface UsePosSettleActionProps {
  terminal: ReturnType<typeof usePosTerminal>;
  checkoutFlow: ReturnType<typeof usePosCheckoutFlow>;
  modals: ReturnType<typeof usePosModals>;
  isDelivery: boolean;
  selectedTender: string;
  getRuntimePosConfig: () => Promise<RuntimePosConfig | null>;
  requestAuthorization: ReturnType<typeof useEmployeeAuthorization>["requestAuthorization"];
  showToast: ReturnType<typeof useToast>["showToast"];
  dispatch: AppDispatch;
}

/**
 * The SETTLE key on the terminal (moved out of PosTerminalPage, 2026-11-13): checks the cart, delivery address
 * and payment method, picks the settling employee (see resolveActionEmployee) and opens the payment step for
 * the selected tender (multi-pay window, cash window, or straight card / credit settlement).
 */
export const usePosSettleAction = ({
  terminal,
  checkoutFlow,
  modals,
  isDelivery,
  selectedTender,
  getRuntimePosConfig,
  requestAuthorization,
  showToast,
  dispatch,
}: UsePosSettleActionProps) => {
  const { settleShouldPrintRef } = checkoutFlow;

  const handleSettle = async (shouldPrint: boolean) => {
    if (terminal.itemCount === 0) {
      showToast("Cart is empty", "warning");
      return;
    }

    if (isDelivery && (!terminal.selectedAddressId || Number(terminal.selectedAddressId) === 0)) {
      showToast("Please select a delivery address before settling.", "warning");
      return;
    }

    settleShouldPrintRef.current = shouldPrint;

    if (!selectedTender) {
      showToast("Please select a payment method", "warning");
      return;
    }

    const currentTenderObj = terminal.tenderOptions.find((t) => String(t.id) === String(selectedTender));
    const currentTenderLabel = (currentTenderObj?.label || "").toLowerCase();
    const isMultiPayTender = currentTenderLabel.includes("multi") || selectedTender === "3";
    const isCreditTender = currentTenderLabel.includes("credit") && !isMultiPayTender;
    const isCashTender = currentTenderLabel.includes("cash") || selectedTender === "1";

    if (isCreditTender && (!terminal.selectedCustomerId || Number(terminal.selectedCustomerId) === 1)) {
      showToast("Credit payment is not allowed for Cash Customer. Please select a customer first.", "warning");
      return;
    }

    let paymodeIdToSend = Number(selectedTender);
    if (!paymodeIdToSend || isNaN(paymodeIdToSend) || paymodeIdToSend <= 0) {
      const cashTender = terminal.tenderOptions.find((t) => t.label.toLowerCase().includes("cash"));
      paymodeIdToSend = cashTender ? Number(cashTender.id) : 1;
    }

    const openPaymentModal = (employeeId: number) => {
      checkoutFlow.setSettlementEmployeeId(employeeId);
      localStorage.setItem("authorizedEmployeeId", String(employeeId));
      if (isMultiPayTender) {
        modals.setIsMultiPayModalOpen(true);
      } else if (isCashTender) {
        modals.setIsCashModalOpen(true);
      } else {
        checkoutFlow.handleCardCreditSettlement(paymodeIdToSend, employeeId);
      }
    };

    const askForEmployee = () =>
      requestAuthorization({
        actionLabel: "Settlement",
        permissionId: 19, // Settle
        bypassDefaultEmployee: true,
        onAuthorized: (empId) => openPaymentModal(empId),
      });

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
        showToast("The selected waiter was not found in this branch and has been cleared. Please authorize settlement.", "warning");
        askForEmployee();
        return;
      case "waiter":
      case "default":
        openPaymentModal(employee.employeeId);
        return;
      case "defaultNotInBranch":
        disableDefaultEmployeeConfig("Default employee not found in branch employees cache");
        dispatch(setWaiter({ waiterId: null, waiterName: null }));
        showToast("Configured default employee was not found in this branch and has been disabled. Please authorize settlement.", "warning");
        askForEmployee();
        return;
      case "defaultInvalid":
        disableDefaultEmployeeConfig("Invalid default employee ID in configuration");
        dispatch(setWaiter({ waiterId: null, waiterName: null }));
        showToast("Default employee was not configured properly and has been disabled. Please authorize settlement.", "warning");
        askForEmployee();
        return;
      case "ask":
        // No default employee: ask for the employee code right when Settle is pressed.
        askForEmployee();
        return;
    }
  };

  return { handleSettle };
};
