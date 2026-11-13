import { buildQtyReductionVoid } from "../utils/qtyReductionVoid";
import type { useToast } from "../../../../app/providers/useToast";
import type { usePosTerminal } from "./usePosTerminal";
import type { usePosModals } from "./usePosModals";
import type { useEmployeeAuthorization } from "./useEmployeeAuthorization";
import type { usePosVoidFlow } from "./usePosVoidFlow";

interface UsePosItemEditsProps {
  terminal: ReturnType<typeof usePosTerminal>;
  modals: ReturnType<typeof usePosModals>;
  selectedKey: string | null;
  setSelectedKey: (key: string | null) => void;
  priceVoidedUnits: ReturnType<typeof usePosVoidFlow>["priceVoidedUnits"];
  requestAuthorization: ReturnType<typeof useEmployeeAuthorization>["requestAuthorization"];
  showToast: ReturnType<typeof useToast>["showToast"];
}

/**
 * Price, Qty and complimentary keys for the cart (moved out of PosTerminalPage, 2026-11-13).
 */
export const usePosItemEdits = ({
  terminal,
  modals,
  selectedKey,
  setSelectedKey,
  priceVoidedUnits,
  requestAuthorization,
  showToast,
}: UsePosItemEditsProps) => {
  const handleApplyPrice = (val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num) && selectedKey) {
      if (num === 0) {
        showToast("Price cannot be zero. Use Item Complimentary.", "error");
        return;
      }
      const currentItem = terminal.cartDetails.find((item) => item.uniqueId === selectedKey);
      // Rule 4: If the product is configured as Inclusive, any price entered manually
      // from the menu must be treated as Inclusive. Otherwise, treat the entered price as Exclusive.
      const isProductConfiguredInclusive = Boolean(
        currentItem?.isIncl ??
        currentItem?.product?.isIncl ??
        (currentItem?.productId ? (terminal as any)?.productCache?.[currentItem.productId]?.isIncl : false)
      );
      terminal.updateItemPrice(selectedKey, num, isProductConfiguredInclusive);
      modals.setIsPriceModalOpen(false);
    }
  };

  /** Closing the price window without a price removes a line that still has no price (unless complimentary). */
  const handlePriceModalClose = () => {
    modals.setIsPriceModalOpen(false);
    if (selectedKey) {
      const currentItem = terminal.cartDetails.find((item) => item.uniqueId === selectedKey);
      if (
        currentItem &&
        (currentItem.price === 0 || currentItem.price === undefined) &&
        !(currentItem.discountType === "percentage" && currentItem.discountValue === 100)
      ) {
        terminal.removeItem(selectedKey);
        setSelectedKey(null);
      }
    }
  };

  const handleItemComplimentary = () => {
    if (!selectedKey) {
      showToast("Select an item first", "warning");
      return;
    }
    requestAuthorization({
      actionLabel: "Item Complimentary",
      permissionId: 13,
      onAuthorized: () => {
        terminal.setItemDiscount(selectedKey, 100, "percentage");
        showToast("Item marked as complimentary", "success");
      },
    });
  };

  const handleBillComplimentary = () => {
    if (terminal.cartDetails.length === 0) {
      showToast("Cart is empty", "warning");
      return;
    }
    requestAuthorization({
      actionLabel: "Bill Complimentary",
      permissionId: 12,
      onAuthorized: () => {
        terminal.setBillDiscount(100, "percentage");
        showToast("Bill marked as complimentary", "success");
      },
    });
  };

  /** Lowering the qty of a saved line below its saved qty needs Void permission and writes void records. */
  const handleApplyQty = (value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 1) return;

    if (selectedKey) {
      const item = terminal.cartDetails.find((i) => i.uniqueId === selectedKey);
      if (item && terminal.editingOrderId && item.isExisting) {
        if (numValue < item.quantity) {
          const origQty = item.originalQty ?? item.quantity;
          const effectiveSavedQty = Math.min(item.quantity, origQty);
          const voidDiff = Math.max(0, effectiveSavedQty - numValue);

          if (voidDiff > 0) {
            requestAuthorization({
              actionLabel: "Void Item Qty",
              permissionId: 8,
              onAuthorized: () => {
                const voids = buildQtyReductionVoid(item, voidDiff, priceVoidedUnits);
                terminal.addVoidProduct(voids.product as Parameters<typeof terminal.addVoidProduct>[0]);
                voids.modifiers.forEach((mod) => terminal.addVoidModifier(mod as Parameters<typeof terminal.addVoidModifier>[0]));

                terminal.updateItemQty(selectedKey, numValue);
                showToast(
                  `Reduced quantity for ${item.product?.name || `Product #${item.productId}`} by ${voidDiff}`,
                  "success"
                );
              },
            });
            modals.setIsQtyModalOpen(false);
            return;
          }
        }
      }
      terminal.updateItemQty(selectedKey, numValue);
    }
    modals.setIsQtyModalOpen(false);
  };

  const openPriceModal = () => {
    if (!selectedKey) return;
    requestAuthorization({
      actionLabel: "Price Change",
      permissionId: 9,
      onAuthorized: () => modals.setIsPriceModalOpen(true),
    });
  };

  const openQtyModal = () => {
    if (!selectedKey) return;
    modals.setIsQtyModalOpen(true);
  };

  return {
    handleApplyPrice,
    handlePriceModalClose,
    handleItemComplimentary,
    handleBillComplimentary,
    handleApplyQty,
    openPriceModal,
    openQtyModal,
  };
};
