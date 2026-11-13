import { useEffect, useMemo, useState } from "react";
import type { AppDispatch } from "../../../../app/store";
import { setCustomerId, setMenuProviderId, setSelectedCustomer } from "../store/posSlice";
import { providerAccountName } from "../../utils/providerAccountName";
import type { MenuProvider } from "../../types";
import type { usePosTerminal } from "./usePosTerminal";

interface UsePosProviderTenderProps {
  terminal: ReturnType<typeof usePosTerminal>;
  dispatch: AppDispatch;
}

/**
 * The provider order in progress and the selected payment method (moved out of PosTerminalPage, 2026-11-13).
 * - A provider order switches the menu to the provider's products and prices (see selectMenuOrderTypeId),
 *   selects the provider's paymode and its post account as the customer.
 * - The payment method starts on Cash, and falls back to Cash when a credit tender is left on Cash Customer.
 */
export const usePosProviderTender = ({ terminal, dispatch }: UsePosProviderTenderProps) => {
  const [activeProvider, setActiveProvider] = useState<{ provider: MenuProvider; orderNo: string } | null>(null);
  const [selectedTender, setSelectedTender] = useState<string>("");

  // The menu follows the provider of a provider order (its own products and prices): see selectMenuOrderTypeId.
  // Set when a provider order starts (a new object every time, so picking the same provider again still sets it).
  // Cleared by clearCart; a recalled provider order sets its own provider in loadRecalledOrder.
  useEffect(() => {
    if (activeProvider?.provider?.providerId) dispatch(setMenuProviderId(activeProvider.provider.providerId));
  }, [activeProvider, dispatch]);

  const isCreditProviderActive = useMemo(() => {
    if (!activeProvider?.provider) return false;
    const { paymodeId, paymode, paymodeName } = activeProvider.provider;
    if (paymodeId === 2) return true;
    if (paymode && paymode.toLowerCase().includes("credit")) return true;
    if (paymodeName && paymodeName.toLowerCase().includes("credit")) return true;
    const matchTender = terminal.tenderOptions.find((t) => t.id === String(paymodeId));
    if (matchTender && matchTender.label.toLowerCase().includes("credit")) return true;
    return false;
  }, [activeProvider, terminal.tenderOptions]);

  useEffect(() => {
    if (activeProvider?.provider) {
      if (activeProvider.provider.paymodeId) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- moved unchanged from PosTerminalPage; follows the provider picked
        setSelectedTender(String(activeProvider.provider.paymodeId));
      }
      const accountId = activeProvider.provider.postAccountId;
      if (accountId) {
        dispatch(setCustomerId(accountId));
        // The provider's post account is the order's customer: set its NAME too, so the screen and the settle
        // receipt show it (setCustomerId alone kept the previous name, and the receipt fell back to "WALK IN").
        let cancelled = false;
        const known = activeProvider.provider.postAccountName;
        void (known ? Promise.resolve(known) : providerAccountName(accountId)).then((name) => {
          if (!cancelled && name) dispatch(setSelectedCustomer({ id: accountId, name }));
        });
        return () => {
          cancelled = true;
        };
      }
    }
  }, [activeProvider, dispatch]);

  useEffect(() => {
    if (terminal.tenderOptions.length > 0) {
      const cashTender =
        terminal.tenderOptions.find((t) => String(t.id) === "1") ||
        terminal.tenderOptions.find((t) => t.label.toLowerCase().includes("cash")) ||
        terminal.tenderOptions[0];

      if (!selectedTender) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- moved unchanged from PosTerminalPage; follows the tender list
        setSelectedTender(cashTender.id);
      } else {
        const currentTenderObj = terminal.tenderOptions.find((t) => String(t.id) === String(selectedTender));
        const isCredit =
          (currentTenderObj?.label || "").toLowerCase().includes("credit") &&
          !(currentTenderObj?.label || "").toLowerCase().includes("multi");
        if (isCredit && (!terminal.selectedCustomerId || Number(terminal.selectedCustomerId) === 1)) {
          setSelectedTender(cashTender.id);
        }
      }
    }
  }, [terminal.tenderOptions, selectedTender, terminal.selectedCustomerId]);

  /** After a clear: back to Cash, if this terminal has a Cash tender. */
  const selectCashTender = () => {
    const cashTender =
      terminal.tenderOptions.find((t) => String(t.id) === "1") ||
      terminal.tenderOptions.find((t) => t.label.toLowerCase().includes("cash"));
    if (cashTender) {
      setSelectedTender(cashTender.id);
    }
  };

  return { activeProvider, setActiveProvider, selectedTender, setSelectedTender, isCreditProviderActive, selectCashTender };
};
