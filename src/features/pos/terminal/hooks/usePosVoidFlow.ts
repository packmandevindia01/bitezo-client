import { useState } from 'react';
import { useEvent } from '../../../../hooks/useEvent';
import { roundCalc, getBillingConfigForOrder, toPricingSettings } from '../utils/billing';
import { getModifierTypeNameById } from '../../services/menuApi';
import { useAppSelector } from '../../../../app/hooks';
import { priceVoidedPortion } from '../../pricing';
import type { PricedLine } from '../../pricing';

/**
 * Void amounts for `voidQty` units of a saved cart line (+ the voided extras), from the pricing engine.
 * - `amount` (backend voidProducts.amount) = EXCLUSIVE product amount (R9), whatever the Price View.
 * - `extraAmounts[i]` (backend voidModifiers.amount) = EXCLUSIVE amount of voided extra i.
 * - `pricedLine` travels with the void so the VOID print follows Print Price like a normal KOT.
 * Falls back to the old display-price amount only for a line without an engine result.
 */
const priceVoid = (
  item: any,
  voidQty: number,
  voidExtras: { price: number; qty: number }[],
  orderType: string,
  editingOrderRates: { serviceCharge: number; levy: number } | null | undefined
): { amount: number; extraAmounts: number[]; pricedLine?: PricedLine } => {
  const line: PricedLine | undefined = item?.pricedLine;
  if (!line) {
    return {
      amount: roundCalc((item?.price || 0) * voidQty),
      extraAmounts: voidExtras.map((e) => roundCalc((e.price || 0) * (e.qty || 1))),
    };
  }
  const settings = toPricingSettings(getBillingConfigForOrder(orderType || "DineIn", editingOrderRates));
  const priced = priceVoidedPortion(line, voidQty, voidExtras, settings);
  return {
    amount: priced.productBase,
    extraAmounts: priced.extras.map((e) => e.baseAmount),
    pricedLine: priced,
  };
};

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
  // Same order type / saved rates the cart is priced with (posSelectors.selectCartCalculation).
  const orderTypeName = useAppSelector((state) => state.pos.selectedOrderTypeName);
  const editingOrderRates = useAppSelector((state) => state.pos.editingOrderRates);
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
              const mapId = Number(item.mapId || 0);
              const origQty = item.originalQty ?? item.quantity;
              const voidQty = Math.max(1, Math.min(item.quantity, origQty));

              const voidExtras = (item.extras || []).map((ex: any) => ({
                id: ex.id || ex.modifierId,
                name: (ex.name && ex.name !== "Extra") ? ex.name : (ex.modifierName || ex.name || "Extra"),
                arabicName: ex.arabicName || ex.arabic,
                price: ex.price || 0,
                qty: ex.qty || 1,
                typeId: ex.typeId || 2,
              }));

              const voidModifiers = (item.modifiers || []).map((mod: any) => {
                const typeId = Number(mod.typeId ?? 1);
                const typeName = mod.typeName || mod.modifierTypeName || (typeId ? getModifierTypeNameById(typeId) : "") || "";
                const name = (mod.name && mod.name !== "Modifier") ? mod.name : (mod.modifierName || mod.name || "Modifier");
                return {
                  id: mod.id || mod.modifierId,
                  name,
                  arabicName: mod.arabicName || mod.arabic,
                  qty: mod.qty || 1,
                  typeId,
                  typeName,
                };
              });

              const voidMessages = (item.messages || []).map((msg: any) => ({
                id: msg.id,
                name: msg.name,
              }));

              const voidPricing = priceVoid(item, voidQty, voidExtras, orderTypeName, editingOrderRates);

              addVoidProduct({
                productId: item.productId,
                productName: item.product?.name || `Product #${item.productId}`,
                unitId,
                qty: voidQty,
                amount: voidPricing.amount,
                pricedLine: voidPricing.pricedLine,
                mapId,
                variantName: item.variantName,
                variantArabic: item.variantArabic,
                categoryId: item.product?.categoryId || item.categoryId,
                extras: voidExtras,
                modifiers: voidModifiers,
                messages: voidMessages,
              });

              // Add modifiers/extras to voidModifiers (extras first → their exclusive engine amounts)
              const allModifiers = [
                ...voidExtras,
                ...voidModifiers,
              ];

              allModifiers.forEach((mod: any, modIdx: number) => {
                addVoidModifier({
                  mapId,
                  modifierId: mod.id,
                  qty: mod.qty || 1,
                  amount: modIdx < voidExtras.length ? (voidPricing.extraAmounts[modIdx] ?? 0) : 0,
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
          const mapId = Number(item.mapId || 0);
          const ratio = item.quantity > 0 ? 1 / item.quantity : 1;

          // Extras are per line (R2): they stay on the line and stay charged until its last unit is voided.
          const voidExtras: any[] = [];

          const voidModifiers = (item.modifiers || []).map((mod: any) => {
            const typeId = Number(mod.typeId ?? 1);
            const typeName = mod.typeName || mod.modifierTypeName || (typeId ? getModifierTypeNameById(typeId) : "") || "";
            const name = (mod.name && mod.name !== "Modifier") ? mod.name : (mod.modifierName || mod.name || "Modifier");
            return {
              id: mod.id || mod.modifierId,
              name,
              arabicName: mod.arabicName || mod.arabic,
              qty: Math.max(1, Math.round((mod.qty || 1) * ratio)),
              typeId,
              typeName,
            };
          });

          const voidMessages = (item.messages || []).map((msg: any) => ({
            id: msg.id,
            name: msg.name,
          }));
          
          const voidPricing = priceVoid(item, 1, voidExtras, orderTypeName, editingOrderRates);

          addVoidProduct({
            productId: item.productId,
            productName: item.product?.name || `Product #${item.productId}`,
            unitId,
            qty: 1,
            amount: voidPricing.amount,
            pricedLine: voidPricing.pricedLine,
            mapId,
            variantName: item.variantName,
            variantArabic: item.variantArabic,
            categoryId: item.product?.categoryId || item.categoryId,
            extras: voidExtras,
            modifiers: voidModifiers,
            messages: voidMessages,
          });

          // extras first → their exclusive engine amounts
          const allModifiers = [
            ...voidExtras,
            ...voidModifiers,
          ];

          allModifiers.forEach((mod: any, modIdx: number) => {
            addVoidModifier({
              mapId,
              modifierId: mod.id,
              qty: mod.qty || 1,
              amount: modIdx < voidExtras.length ? (voidPricing.extraAmounts[modIdx] ?? 0) : 0,
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

  // The engine result of voided units, for a void started outside this hook (Qty keypad), so its print follows Print Price.
  const priceVoidedUnits = (item: any, voidQty: number, voidExtras: { price: number; qty: number }[]) =>
    priceVoid(item, voidQty, voidExtras, orderTypeName, editingOrderRates).pricedLine;

  return {
    voidConfirmState,
    setVoidConfirmState,
    handleRemoveItem,
    handleDecrementItem,
    priceVoidedUnits,
  };
};
