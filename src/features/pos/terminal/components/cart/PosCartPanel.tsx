import React from "react";
import ErrorBoundary from "../../../../../components/common/ErrorBoundary";
import { PosOrderPanel } from "./PosOrderPanel";
import { POS_CART_ACTIONS, POS_MORE_ACTIONS } from "../../../constants";

interface PosCartPanelProps {
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  // Order Panel props
  cartDetails: any;
  subtotal: number;
  discount: number;
  tax: number;
  charges: number;
  total: number;
  totalExtras: number;
  baseSubtotal: number;
  deliveryCharge: number;
  isDelivery: boolean;
  isSettling: boolean;
  selectedKey: string | null;
  setSelectedKey: (key: string | null) => void;
  incrementItem: (key: string) => void;
  handleDecrementItem: (key: string) => void;
  handleRemoveItem: (key: string) => void;
  setExtrasModifierType: (type: 'none' | 'extras' | 'modifiers') => void;
  showToast: (msg: string, type: "success" | "error" | "warning") => void;
  openQtyModal: (key: string, qty: number) => void;
  handleOrder: (print: boolean) => void;
  handleSettle: (shouldPrint: boolean) => void;
  orderLoading: boolean;
  isSettledEdit: boolean;
  selectedTender: string;
  setSelectedTender: (tender: string) => void;
  setIsMultiPayModalOpen: (open: boolean) => void;
  setIsCashModalOpen: (open: boolean) => void;
  setIsDeliveryChargeModalOpen: (open: boolean) => void;
  tenderOptions: { id: string; label: string }[];
  onPrice?: () => void;
  onDiscount?: () => void;
  onVoidOrder?: () => void;
  onMessage?: () => void;
  onCom?: () => void;
}

const PosCartPanelComponent: React.FC<PosCartPanelProps> = ({
  isCartOpen,
  setIsCartOpen,
  cartDetails,
  subtotal,
  discount,
  tax,
  charges,
  total,
  totalExtras,
  baseSubtotal,
  deliveryCharge,
  isDelivery,
  isSettling,
  selectedKey,
  setSelectedKey,
  incrementItem,
  handleDecrementItem,
  handleRemoveItem,
  setExtrasModifierType,
  showToast,
  openQtyModal,
  handleOrder,
  handleSettle,
  orderLoading,
  isSettledEdit,
  selectedTender,
  setSelectedTender,
  setIsMultiPayModalOpen,
  setIsCashModalOpen,
  setIsDeliveryChargeModalOpen,
  tenderOptions,
  onPrice,
  onDiscount,
  onVoidOrder,
  onMessage,
  onCom
}) => {
  return (
    <>
      {/* Mobile/Tablet Backdrop Overlay */}
      {isCartOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm xl:hidden transition-opacity" 
          onClick={() => setIsCartOpen(false)}
        />
      )}

      {/* Right Column: Order Panel */}
      <div className={`
        fixed inset-y-0 right-0 z-50 w-[85%] max-w-[460px] transform transition-transform duration-300 ease-in-out bg-white shadow-2xl
        xl:static xl:w-[450px] xl:translate-x-0 xl:shadow-none xl:z-auto xl:h-full xl:overflow-hidden
        ${isCartOpen ? "translate-x-0" : "translate-x-full"}
      `}>
        <ErrorBoundary name="Order Panel">
          <PosOrderPanel
            cartActions={POS_CART_ACTIONS}
            extraActions={POS_MORE_ACTIONS}
            cartDetails={cartDetails}
            subtotal={subtotal}
            discount={discount}
            tax={tax}
            charges={charges}
            total={total}
            totalExtras={totalExtras}
            baseSubtotal={baseSubtotal}
            deliveryCharge={deliveryCharge}
            isDelivery={isDelivery}
            isSettling={isSettling}
            selectedKey={selectedKey}
            onSelectRow={setSelectedKey}
            onIncrement={incrementItem}
            onDecrement={handleDecrementItem}
            onRemove={handleRemoveItem}
            onMod={() => setExtrasModifierType('modifiers')}
            onExtras={() => {
              if (!selectedKey) {
                showToast("Please select an item in the cart first", "warning");
                return;
              }
              setExtrasModifierType('extras');
            }}
            onQty={() => {
              if (!selectedKey) {
                showToast("Please select an item in the cart first", "warning");
                return;
              }
              const item = cartDetails.find((i: any) => i.uniqueId === selectedKey);
              if (item) {
                openQtyModal(item.uniqueId, item.quantity);
              }
            }}
            onPrice={onPrice}
            onDiscount={onDiscount}
            onVoidOrder={onVoidOrder}
            onMessage={onMessage}
            onCom={onCom}
            onOrder={handleOrder}
            onSettle={handleSettle}
            orderLoading={orderLoading}
            isSettledEdit={isSettledEdit}
            selectedTender={selectedTender}
            tenderOptions={tenderOptions}
            onSelectTender={(tenderId) => {
              setSelectedTender(tenderId);
              if (total > 0) {
                if (tenderId === '3') {
                  setIsMultiPayModalOpen(true);
                }
              }
            }}
            onClose={() => setIsCartOpen(false)}
            onDeliveryChargeDoubleClick={isDelivery ? () => setIsDeliveryChargeModalOpen(true) : undefined}
          />
        </ErrorBoundary>
      </div>
    </>
  );
};

export const PosCartPanel = React.memo(PosCartPanelComponent);
