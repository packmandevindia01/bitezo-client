import { useState } from 'react';
import { useEvent } from '../../../../hooks/useEvent';

interface UsePosVoidFlowProps {
  cartDetails: any[];
  editingOrderId: number | null;
  requestAuthorization: (options: any) => void;
  addVoidProduct: (payload: any) => void;
  addVoidModifier: (payload: any) => void;
  removeItem: (uniqueId: string) => void;
  decrementItem: (uniqueId: string) => void;
  selectedKey: string | null;
  setSelectedKey: (key: string | null) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  decimalPart: number;
}

export const usePosVoidFlow = ({
  cartDetails,
  editingOrderId,
  requestAuthorization,
  addVoidProduct,
  addVoidModifier,
  removeItem,
  decrementItem,
  selectedKey,
  setSelectedKey,
  showToast,
  decimalPart,
}: UsePosVoidFlowProps) => {
  const [voidConfirmState, setVoidConfirmState] = useState<{
    isOpen: boolean;
    uniqueId: string;
    productName: string;
    onConfirmed: () => void;
  }>({
    isOpen: false,
    uniqueId: "",
    productName: "",
    onConfirmed: () => {},
  });

  const handleRemoveItem = useEvent((uniqueId: string) => {
    const item = cartDetails.find((i) => i.uniqueId === uniqueId);
    if (!item) return;

    if (editingOrderId && item.isExisting) {
      requestAuthorization({
        actionLabel: "Void Item",
        permissionId: 8, // Product Void
        onAuthorized: () => {
          setVoidConfirmState({
            isOpen: true,
            uniqueId,
            productName: item.product?.name || `Product #${item.productId}`,
            onConfirmed: () => {
              const unitId = item.product?.unitId || 1;
              const mapId = item.mapId || 0;
              addVoidProduct({
                productId: item.productId,
                productName: item.product?.name || `Product #${item.productId}`,
                unitId,
                qty: item.quantity,
                amount: Number(((item.price || 0) * item.quantity).toFixed(decimalPart)),
                mapId,
              });

              // Add modifiers/extras to voidModifiers
              const allModifiers = [
                ...(item.extras || []),
                ...(item.modifiers || [])
              ];

              allModifiers.forEach((mod: any) => {
                const modPrice = mod.price || 0;
                addVoidModifier({
                  mapId,
                  modifierId: mod.id,
                  qty: mod.qty,
                  amount: Number((modPrice * mod.qty).toFixed(decimalPart)),
                  typeId: mod.typeId || 1
                });
              });

              removeItem(uniqueId);
              if (selectedKey === uniqueId) {
                setSelectedKey(null);
              }
              showToast(`Voided ${item.product?.name || `Product #${item.productId}`}`, "success");
            }
          });
        },
      });
    } else {
      removeItem(uniqueId);
      if (selectedKey === uniqueId) {
        setSelectedKey(null);
      }
    }
  });

  const handleDecrementItem = useEvent((uniqueId: string) => {
    const item = cartDetails.find((i) => i.uniqueId === uniqueId);
    if (!item) return;

    if (editingOrderId && item.isExisting) {
      if (item.quantity === 1) {
        handleRemoveItem(uniqueId);
        return;
      }

      requestAuthorization({
        actionLabel: "Void Item",
        permissionId: 8, // Product Void
        onAuthorized: () => {
          const unitId = item.product?.unitId || 1;
          const mapId = item.mapId || 0;
          
          addVoidProduct({
            productId: item.productId,
            productName: item.product?.name || `Product #${item.productId}`,
            unitId,
            qty: 1,
            amount: Number((item.price || 0).toFixed(decimalPart)),
            mapId,
          });

          decrementItem(uniqueId);
          showToast(`Decremented quantity for ${item.product?.name || `Product #${item.productId}`}`, "success");
        },
      });
    } else {
      decrementItem(uniqueId);
    }
  });

  return {
    voidConfirmState,
    setVoidConfirmState,
    handleRemoveItem,
    handleDecrementItem,
  };
};
