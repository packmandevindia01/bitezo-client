import React from "react";
import { ConfirmDialog } from "../../../../../components/common";
import { PosDiscountChoiceModal } from "./cart/PosDiscountChoiceModal";
import { PosDiscountKeypadModal } from "./cart/PosDiscountKeypadModal";
import { PosPriceKeypadModal } from "./cart/PosPriceKeypadModal";
import { PosQtyKeypadModal } from "./cart/PosQtyKeypadModal";
import { PosExtrasModifierModal } from "./product/PosExtrasModifierModal";
import { PosMessageModal } from "./product/PosMessageModal";

export interface CartModalsProps {
  modals: any;
  discountStep: "none" | "choice" | "value";
  setDiscountStep: (step: "none" | "choice" | "value") => void;
  discountType: "bill" | "item";
  discountMode: "percentage" | "amount";
  setDiscountMode: (mode: "percentage" | "amount") => void;
  billDiscountValue: number;
  selectedKey: string | null;
  setSelectedKey: (k: string | null) => void;
  openDiscountInput: (type: "bill" | "item") => void;
  showToast: any;
  subtotal: number;
  currentItem: any;
  currentSelectedItem: any;
  cartDetails: any[];
  handleApplyDiscount: (value: string) => void;
  handlePriceModalClose: () => void;
  handleApplyPrice: (val: string) => void;
  handleApplyQty: (val: string) => void;
  extrasModifierType: "none" | "extras" | "modifiers";
  setExtrasModifierType: (type: "none" | "extras" | "modifiers") => void;
  setItemCustomizations: (id: string, extras?: any[], modifiers?: any[], messages?: any[]) => void;

  voidConfirmState: { isOpen: boolean; uniqueId: string; productName: string; onConfirmed: () => void };
  setVoidConfirmState: React.Dispatch<React.SetStateAction<any>>;

  billDiscountConfirmState: { isOpen: boolean; value: number; mode: "percentage" | "amount" };
  setBillDiscountConfirmState: React.Dispatch<React.SetStateAction<any>>;
  setBillDiscount: (val: number, mode: "percentage" | "amount") => void;
  clearAllItemDiscounts: () => any;
  dispatch: any;

  isClearConfirmOpen: boolean;
  setIsClearConfirmOpen: (open: boolean) => void;
  handleClearCart: () => void;
}

export const CartModals: React.FC<CartModalsProps> = React.memo((props) => {
  const { modals } = props;

  return (
    <>
      <PosDiscountChoiceModal
        isOpen={props.discountStep === "choice"}
        onClose={() => props.setDiscountStep("none")}
        billDiscountValue={props.billDiscountValue}
        selectedKey={props.selectedKey}
        openDiscountInput={props.openDiscountInput}
        showToast={props.showToast}
      />
      <PosDiscountKeypadModal
        isOpen={props.discountStep === "value"}
        onClose={() => props.setDiscountStep("none")}
        discountType={props.discountType}
        discountMode={props.discountMode}
        setDiscountMode={props.setDiscountMode}
        subtotal={props.subtotal}
        currentItem={props.currentItem}
        handleApplyDiscount={props.handleApplyDiscount}
      />
      <PosPriceKeypadModal
        isOpen={modals.isPriceModalOpen}
        onClose={props.handlePriceModalClose}
        currentSelectedItem={props.currentSelectedItem}
        handleApplyPrice={props.handleApplyPrice}
      />
      <PosQtyKeypadModal
        isOpen={modals.isQtyModalOpen}
        onClose={() => modals.setIsQtyModalOpen(false)}
        currentSelectedItem={props.currentSelectedItem}
        handleApplyQty={props.handleApplyQty}
      />
      <PosExtrasModifierModal
        isOpen={props.extrasModifierType !== "none"}
        onClose={() => props.setExtrasModifierType("none")}
        type={props.extrasModifierType === "extras" ? "extras" : "modifiers"}
        cartItems={props.cartDetails}
        selectedKey={props.selectedKey}
        onSelectRow={props.setSelectedKey}
        initialExtras={props.currentSelectedItem?.extras || []}
        initialModifiers={props.currentSelectedItem?.modifiers || []}
        initialMessages={props.currentSelectedItem?.messages || []}
        onDone={(extras, modifiers, messages) => {
          if (!props.selectedKey) return;
          props.setItemCustomizations(props.selectedKey, extras, modifiers, messages);
          props.setExtrasModifierType("none");
        }}
      />
      <PosMessageModal
        isOpen={modals.isMessageModalOpen}
        onClose={() => modals.setIsMessageModalOpen(false)}
        cartItems={props.cartDetails}
        selectedKey={props.selectedKey}
        onSelectRow={props.setSelectedKey}
        initialExtras={props.currentSelectedItem?.extras || []}
        initialModifiers={props.currentSelectedItem?.modifiers || []}
        initialMessages={props.currentSelectedItem?.messages || []}
        onDone={(extras, modifiers, messages) => {
          if (!props.selectedKey) return;
          props.setItemCustomizations(props.selectedKey, extras, modifiers, messages);
          modals.setIsMessageModalOpen(false);
        }}
      />

      <ConfirmDialog
        isOpen={props.voidConfirmState.isOpen}
        onCancel={() => props.setVoidConfirmState((prev: any) => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          props.voidConfirmState.onConfirmed();
          props.setVoidConfirmState((prev: any) => ({ ...prev, isOpen: false }));
        }}
        title="Confirm Void"
        message={`Are you sure you want to void "${props.voidConfirmState.productName}"?`}
        confirmLabel="Void"
        confirmVariant="danger"
      />
      <ConfirmDialog
        isOpen={props.billDiscountConfirmState.isOpen}
        title="Override Item Discounts?"
        message="Applying a bill-level discount will remove all existing item-level discounts. Do you want to proceed?"
        onConfirm={() => {
          props.dispatch(props.clearAllItemDiscounts());
          props.setBillDiscount(props.billDiscountConfirmState.value, props.billDiscountConfirmState.mode);
          props.setBillDiscountConfirmState({ isOpen: false, value: 0, mode: "percentage" });
        }}
        onCancel={() => props.setBillDiscountConfirmState({ isOpen: false, value: 0, mode: "percentage" })}
        confirmLabel="Override"
        confirmVariant="danger"
      />
      <ConfirmDialog
        isOpen={props.isClearConfirmOpen}
        title="Clear Order Data?"
        message="Are you sure you want to clear all items from the current order? This action cannot be undone."
        confirmLabel="Clear"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={() => {
          props.handleClearCart();
          props.setIsClearConfirmOpen(false);
        }}
        onCancel={() => props.setIsClearConfirmOpen(false)}
      />
    </>
  );
});
