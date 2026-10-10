import { useState } from 'react';
import { useEvent } from '../../../../hooks/useEvent';
import { roundCalc } from '../utils/billing';

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
  decimalPart?: number;
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
              const origQty = item.originalQty ?? item.quantity;
              const voidQty = Math.max(1, Math.min(item.quantity, origQty));

              const voidExtras = (item.extras || []).map((ex: any) => ({
                id: ex.id || ex.modifierId,
                name: ex.name || ex.modifierName || "Extra",
                arabicName: ex.arabicName || ex.arabic,
                price: ex.price || 0,
                qty: ex.qty || 1,
                typeId: ex.typeId || 2,
              }));

              const voidModifiers = (item.modifiers || []).map((mod: any) => ({
                id: mod.id || mod.modifierId,
                name: mod.name || mod.modifierName || "Modifier",
                arabicName: mod.arabicName || mod.arabic,
                qty: mod.qty || 1,
                typeId: mod.typeId || 1,
                typeName: mod.typeName,
              }));

              const voidMessages = (item.messages || []).map((msg: any) => ({
                id: msg.id,
                name: msg.name,
              }));

              addVoidProduct({
                productId: item.productId,
                productName: item.product?.name || `Product #${item.productId}`,
                unitId,
                qty: voidQty,
                amount: roundCalc((item.price || 0) * voidQty),
                mapId,
                variantName: item.variantName,
                variantArabic: item.variantArabic,
                categoryId: item.product?.categoryId || item.categoryId,
                extras: voidExtras,
                modifiers: voidModifiers,
                messages: voidMessages,
              });

              // Add modifiers/extras to voidModifiers
              const allModifiers = [
                ...voidExtras,
                ...voidModifiers,
              ];

              allModifiers.forEach((mod: any) => {
                const modPrice = mod.price || 0;
                addVoidModifier({
                  mapId,
                  modifierId: mod.id,
                  qty: mod.qty || 1,
                  amount: roundCalc(modPrice * (mod.qty || 1)),
                  typeId: mod.typeId || 1,
                  name: mod.name,
                  arabicName: mod.arabicName || mod.arabic,
                  typeName: mod.typeName,
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
      const origQty = item.originalQty ?? 0;
      // If quantity is higher than originalQty, decrementing only reverses an unsaved increase
      if (item.quantity > origQty) {
        decrementItem(uniqueId);
        return;
      }

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
          const ratio = item.quantity > 0 ? 1 / item.quantity : 1;

          const voidExtras = (item.extras || []).map((ex: any) => ({
            id: ex.id || ex.modifierId,
            name: ex.name || ex.modifierName || "Extra",
            arabicName: ex.arabicName || ex.arabic,
            price: ex.price || 0,
            qty: Math.max(1, Math.round((ex.qty || 1) * ratio)),
            typeId: ex.typeId || 2,
          }));

          const voidModifiers = (item.modifiers || []).map((mod: any) => ({
            id: mod.id || mod.modifierId,
            name: mod.name || mod.modifierName || "Modifier",
            arabicName: mod.arabicName || mod.arabic,
            qty: Math.max(1, Math.round((mod.qty || 1) * ratio)),
            typeId: mod.typeId || 1,
            typeName: mod.typeName,
          }));

          const voidMessages = (item.messages || []).map((msg: any) => ({
            id: msg.id,
            name: msg.name,
          }));
          
          addVoidProduct({
            productId: item.productId,
            productName: item.product?.name || `Product #${item.productId}`,
            unitId,
            qty: 1,
            amount: roundCalc(item.price || 0),
            mapId,
            variantName: item.variantName,
            variantArabic: item.variantArabic,
            categoryId: item.product?.categoryId || item.categoryId,
            extras: voidExtras,
            modifiers: voidModifiers,
            messages: voidMessages,
          });

          const allModifiers = [
            ...voidExtras,
            ...voidModifiers,
          ];

          allModifiers.forEach((mod: any) => {
            const modPrice = mod.price || 0;
            addVoidModifier({
              mapId,
              modifierId: mod.id,
              qty: mod.qty || 1,
              amount: roundCalc(modPrice * (mod.qty || 1)),
              typeId: mod.typeId || 1,
              name: mod.name,
              arabicName: mod.arabicName || mod.arabic,
              typeName: mod.typeName,
            });
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
