import { useState } from 'react';
import { useEvent } from '../../../../hooks/useEvent';

interface UsePosDiscountFlowProps {
  cartDetails: any[];
  subtotal: number;
  billDiscountValue: number;
  itemCount: number;
  selectedKey: string | null;
  setBillDiscount: (value: number, mode: 'percentage' | 'amount') => void;
  setItemDiscount: (id: string, value: number, mode: 'percentage' | 'amount') => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const usePosDiscountFlow = ({
  cartDetails,
  subtotal,
  billDiscountValue,
  itemCount,
  selectedKey,
  setBillDiscount,
  setItemDiscount,
  showToast,
}: UsePosDiscountFlowProps) => {
  const [discountStep, setDiscountStep] = useState<'none' | 'choice' | 'value'>('none');
  const [discountType, setDiscountType] = useState<'bill' | 'item'>('bill');
  const [discountMode, setDiscountMode] = useState<'percentage' | 'amount'>('percentage');
  const [billDiscountConfirmState, setBillDiscountConfirmState] = useState<{
    isOpen: boolean;
    value: number;
    mode: 'percentage' | 'amount';
  }>({ isOpen: false, value: 0, mode: 'percentage' });

  const openDiscountChoice = useEvent(() => {
    if (itemCount === 0) return;
    setDiscountStep('choice');
  });

  const openDiscountInput = useEvent((type: 'bill' | 'item') => {
    if (type === 'item' && billDiscountValue > 0) {
      showToast("Cannot apply item discounts while a bill discount is active", "warning");
      return;
    }
    setDiscountType(type);
    setDiscountStep('value');
  });

  const handleApplyDiscount = useEvent((value: string) => {
    const numValue = parseFloat(value);
    const finalValue = isNaN(numValue) ? 0 : numValue;

    const itemTotalDiscount = cartDetails.reduce((sum, item) => sum + (item.itemDiscount || 0), 0);
    const remainingSubtotal = Math.max(0, subtotal - itemTotalDiscount);

    if (discountType === 'bill') {
      let proposedBillDiscount = 0;
      if (discountMode === 'percentage') {
        if (finalValue > 100) {
          showToast("Discount percentage cannot exceed 100%", "error");
          return;
        }
        proposedBillDiscount = (subtotal * finalValue) / 100;
      } else {
        proposedBillDiscount = finalValue;
      }

      if (proposedBillDiscount > remainingSubtotal) {
        const limitMsg = discountMode === 'percentage'
          ? `Discount percentage would exceed the remaining bill subtotal`
          : `Discount amount cannot exceed the remaining bill subtotal`;
        showToast(limitMsg, "error");
        return;
      }
      
      if (itemTotalDiscount > 0) {
        setBillDiscountConfirmState({ isOpen: true, value: finalValue, mode: discountMode });
        setDiscountStep('none');
        return;
      }
      setBillDiscount(finalValue, discountMode);
    } else if (selectedKey) {
      const currentItem = cartDetails.find((item) => item.uniqueId === selectedKey);
      if (currentItem) {
        if (discountMode === 'percentage') {
          if (finalValue > 100) {
            showToast("Discount percentage cannot exceed 100%", "error");
            return;
          }
        } else {
          const itemTotal = (currentItem.price || 0) * currentItem.quantity;
          if (finalValue > itemTotal) {
            showToast(`Discount amount cannot exceed item total`, "error");
            return;
          }
        }
        setItemDiscount(selectedKey, finalValue, discountMode);
      }
    }
    setDiscountStep('none');
  });

  return {
    discountStep,
    setDiscountStep,
    discountType,
    setDiscountType,
    discountMode,
    setDiscountMode,
    billDiscountConfirmState,
    setBillDiscountConfirmState,
    openDiscountChoice,
    openDiscountInput,
    handleApplyDiscount,
  };
};
