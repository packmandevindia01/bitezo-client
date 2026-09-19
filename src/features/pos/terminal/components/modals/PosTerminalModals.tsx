import React from "react";
import type { MenuProvider } from "../../../types";
import { CartModals } from "./CartModals";
import { PaymentModals } from "./PaymentModals";
import { OrderModals } from "./OrderModals";
import { SystemModals } from "./SystemModals";

export interface PosTerminalModalsProps {
  modals: any;

  // App state
  dispatch: any;
  navigate: any;
  showToast: any;

  // Auth
  authorizationModalKey?: string;
  authorizationModalProps?: any;
  requestAuthorization: (options: any) => void;

  // Cart & Pricing
  cartDetails: any[];
  selectedKey: string | null;
  setSelectedKey: (k: string | null) => void;
  currentItem: any;
  currentSelectedItem: any;
  subtotal: number;
  total: number;
  deliveryCharge: number;
  billDiscountValue: number;

  // Handlers
  openDiscountInput: (type: "bill" | "item") => void;
  handleApplyDiscount: (value: string) => void;
  handlePriceModalClose: () => void;
  handleApplyPrice: (val: string) => void;
  handleApplyQty: (val: string) => void;
  setItemCustomizations: (id: string, extras?: any[], modifiers?: any[], messages?: any[]) => void;
  handleItemComplimentary: () => void;
  handleBillComplimentary: () => void;
  handleClearCart: () => void;
  handleCompleteSettlement: (payments: any[], change: number) => void;
  resetTerminalState: () => void;
  setActiveProvider: (data: any) => void;
  refreshLockedProducts: () => void;

  // Specific States
  discountStep: "none" | "choice" | "value";
  setDiscountStep: (step: "none" | "choice" | "value") => void;
  discountType: "bill" | "item";
  discountMode: "percentage" | "amount";
  setDiscountMode: (mode: "percentage" | "amount") => void;

  extrasModifierType: "none" | "extras" | "modifiers";
  setExtrasModifierType: (type: "none" | "extras" | "modifiers") => void;

  voidConfirmState: { isOpen: boolean; uniqueId: string; productName: string; onConfirmed: () => void };
  setVoidConfirmState: React.Dispatch<React.SetStateAction<any>>;

  billDiscountConfirmState: { isOpen: boolean; value: number; mode: "percentage" | "amount" };
  setBillDiscountConfirmState: React.Dispatch<React.SetStateAction<any>>;
  setBillDiscount: (val: number, mode: "percentage" | "amount") => void;
  clearAllItemDiscounts: () => any;
  setCustomDeliveryCharge: (val: number) => any;

  isClearConfirmOpen: boolean;
  setIsClearConfirmOpen: (open: boolean) => void;

  editingOrderId: number | null;
  selectedProviderForOrder: MenuProvider | null;
  setSelectedProviderForOrder: (p: MenuProvider | null) => void;

  orderLoading: boolean;
  tenderOptions: any[];
  selectedCustomerId?: number;
}

/**
 * Modular Sub-Domain Modal Orchestrator.
 * Delegates rendering to specialized sub-containers for cart, payment, order, and system modals.
 */
export const PosTerminalModals = React.memo(function PosTerminalModals(props: PosTerminalModalsProps) {
  const { modals } = props;

  return (
    <>
      <CartModals
        modals={modals}
        discountStep={props.discountStep}
        setDiscountStep={props.setDiscountStep}
        discountType={props.discountType}
        discountMode={props.discountMode}
        setDiscountMode={props.setDiscountMode}
        billDiscountValue={props.billDiscountValue}
        selectedKey={props.selectedKey}
        setSelectedKey={props.setSelectedKey}
        openDiscountInput={props.openDiscountInput}
        showToast={props.showToast}
        subtotal={props.subtotal}
        currentItem={props.currentItem}
        currentSelectedItem={props.currentSelectedItem}
        cartDetails={props.cartDetails}
        handleApplyDiscount={props.handleApplyDiscount}
        handlePriceModalClose={props.handlePriceModalClose}
        handleApplyPrice={props.handleApplyPrice}
        handleApplyQty={props.handleApplyQty}
        extrasModifierType={props.extrasModifierType}
        setExtrasModifierType={props.setExtrasModifierType}
        setItemCustomizations={props.setItemCustomizations}
        voidConfirmState={props.voidConfirmState}
        setVoidConfirmState={props.setVoidConfirmState}
        billDiscountConfirmState={props.billDiscountConfirmState}
        setBillDiscountConfirmState={props.setBillDiscountConfirmState}
        setBillDiscount={props.setBillDiscount}
        clearAllItemDiscounts={props.clearAllItemDiscounts}
        dispatch={props.dispatch}
        isClearConfirmOpen={props.isClearConfirmOpen}
        setIsClearConfirmOpen={props.setIsClearConfirmOpen}
        handleClearCart={props.handleClearCart}
      />

      <PaymentModals
        modals={modals}
        deliveryCharge={props.deliveryCharge}
        setCustomDeliveryCharge={props.setCustomDeliveryCharge}
        dispatch={props.dispatch}
        total={props.total}
        selectedCustomerId={props.selectedCustomerId}
        tenderOptions={props.tenderOptions}
        orderLoading={props.orderLoading}
        handleCompleteSettlement={props.handleCompleteSettlement}
        handleClearCart={props.handleClearCart}
      />

      <OrderModals
        modals={modals}
        dispatch={props.dispatch}
        showToast={props.showToast}
        editingOrderId={props.editingOrderId}
        selectedProviderForOrder={props.selectedProviderForOrder}
        setSelectedProviderForOrder={props.setSelectedProviderForOrder}
        resetTerminalState={props.resetTerminalState}
        setActiveProvider={props.setActiveProvider}
        handleClearCart={props.handleClearCart}
      />

      <SystemModals
        modals={modals}
        requestAuthorization={props.requestAuthorization}
        handleItemComplimentary={props.handleItemComplimentary}
        handleBillComplimentary={props.handleBillComplimentary}
        refreshLockedProducts={props.refreshLockedProducts}
      />
    </>
  );
});
