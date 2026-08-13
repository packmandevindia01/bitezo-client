import React, { Suspense } from 'react';
import type { MenuProvider } from '../../../types';
import { ConfirmDialog } from '../../../../../components/common';
import { PosDiscountChoiceModal } from './cart/PosDiscountChoiceModal';
import { PosDiscountKeypadModal } from './cart/PosDiscountKeypadModal';
import { PosPriceKeypadModal } from './cart/PosPriceKeypadModal';
import { PosQtyKeypadModal } from './cart/PosQtyKeypadModal';
import { PosExtrasModifierModal } from './product/PosExtrasModifierModal';
import { PosMessageModal } from './product/PosMessageModal';
import { PosMoreModal } from './system/PosMoreModal';
import { PosDeliveryChargeModal } from './payment/PosDeliveryChargeModal';
import { PosCashTenderModal } from './payment/PosCashTenderModal';
import { PosMultiPayModal } from './payment/PosMultiPayModal';
import { PosProviderOrderModal } from './providers/PosProviderOrderModal';
import { EmployeePasswordModal } from './system/EmployeePasswordModal';
import { PosCashierSessionModal } from './system/PosCashierSessionModal';

// Lazy loaded modals
const PosReportModal = React.lazy(() => import('./system/PosReportModal').then(m => ({ default: m.PosReportModal })));
const PosSettledModal = React.lazy(() => import('./system/PosSettledModal').then(m => ({ default: m.PosSettledModal })));
const PosCustomerModal = React.lazy(() => import('../../../customer/components/PosCustomerModal').then(m => ({ default: m.PosCustomerModal })));
const PosDeliveryModal = React.lazy(() => import('../../../customer/components/PosDeliveryModal').then(m => ({ default: m.PosDeliveryModal })));
const PosDriveThroughModal = React.lazy(() => import('../../../customer/components/PosDriveThroughModal').then(m => ({ default: m.PosDriveThroughModal })));
const PosRecallModal = React.lazy(() => import('./order/PosRecallModal').then(m => ({ default: m.PosRecallModal })));
const PosVoidModal = React.lazy(() => import('./order/PosVoidModal').then(m => ({ default: m.PosVoidModal })));
const PosCombineModal = React.lazy(() => import('./order/PosCombineModal').then(m => ({ default: m.PosCombineModal })));
const PosSplitModal = React.lazy(() => import('./order/PosSplitModal').then(m => ({ default: m.PosSplitModal })));
const PosProviderModal = React.lazy(() => import('./providers/PosProviderModal').then(m => ({ default: m.PosProviderModal })));
const LockItemModal = React.lazy(() => import('../../../lockItem/components/LockItemModal').then(m => ({ default: m.default })));

// Loading Fallback
const ModalLoader = () => (
  <div className="flex justify-center items-center p-4">
    <div className="w-6 h-6 border-2 border-[#49293e]/20 border-t-[#49293e] rounded-full animate-spin"></div>
  </div>
);

// We define a massive props interface to pass everything in for now.
// In later phases, this component could consume hooks directly.
interface PosTerminalModalsProps {
  modals: any; // Return type of usePosModals
  
  // App state
  dispatch: any;
  navigate: any;
  showToast: any;
  
  // Auth
  authorizationModalKey: string;
  authorizationModalProps: any;
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
  openDiscountInput: (type: 'bill'|'item') => void;
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
  discountStep: 'none' | 'choice' | 'value';
  setDiscountStep: (step: 'none' | 'choice' | 'value') => void;
  discountType: 'bill' | 'item';
  discountMode: 'percentage' | 'amount';
  setDiscountMode: (mode: 'percentage' | 'amount') => void;
  
  extrasModifierType: 'none' | 'extras' | 'modifiers';
  setExtrasModifierType: (type: 'none' | 'extras' | 'modifiers') => void;
  initialSelections: any[];
  
  voidConfirmState: { isOpen: boolean; uniqueId: string; productName: string; onConfirmed: () => void };
  setVoidConfirmState: React.Dispatch<React.SetStateAction<any>>;
  
  billDiscountConfirmState: { isOpen: boolean; value: number; mode: 'percentage' | 'amount' };
  setBillDiscountConfirmState: React.Dispatch<React.SetStateAction<any>>;
  setBillDiscount: (val: number, mode: 'percentage'|'amount') => void;
  clearAllItemDiscounts: () => any;
  setCustomDeliveryCharge: (val: number) => any;
  
  editingOrderId: number | null;
  selectedProviderForOrder: MenuProvider | null;
  setSelectedProviderForOrder: (p: MenuProvider | null) => void;
  
  orderLoading: boolean;
  tenderOptions: any[];
}

export const PosTerminalModals = React.memo(function PosTerminalModals(props: PosTerminalModalsProps) {
  const { modals } = props;

  return (
    <>
      {/* ── Cart & Pricing Modals (Eager) ── */}
      <PosDiscountChoiceModal
        isOpen={props.discountStep === 'choice'}
        onClose={() => props.setDiscountStep('none')}
        billDiscountValue={props.billDiscountValue}
        selectedKey={props.selectedKey}
        openDiscountInput={props.openDiscountInput}
        showToast={props.showToast}
      />
      <PosDiscountKeypadModal
        isOpen={props.discountStep === 'value'}
        onClose={() => props.setDiscountStep('none')}
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
        isOpen={props.extrasModifierType !== 'none'}
        onClose={() => props.setExtrasModifierType('none')}
        type={props.extrasModifierType === 'extras' ? 'extras' : 'modifiers'}
        cartItems={props.cartDetails}
        selectedKey={props.selectedKey}
        onSelectRow={props.setSelectedKey}
        initialSelections={props.initialSelections}
        onDone={(selections: any[]) => {
          if (!props.selectedKey) return;
          if (props.extrasModifierType === 'extras') {
            props.setItemCustomizations(props.selectedKey, selections, props.currentSelectedItem?.modifiers, props.currentSelectedItem?.messages);
          } else {
            props.setItemCustomizations(props.selectedKey, props.currentSelectedItem?.extras, selections, props.currentSelectedItem?.messages);
          }
          props.setExtrasModifierType('none');
        }}
      />
      <PosMessageModal
        isOpen={modals.isMessageModalOpen}
        onClose={() => modals.setIsMessageModalOpen(false)}
        cartItems={props.cartDetails}
        selectedKey={props.selectedKey}
        onSelectRow={props.setSelectedKey}
        initialSelections={props.currentSelectedItem?.messages || []}
        onDone={(selections: any[]) => {
          if (!props.selectedKey) return;
          props.setItemCustomizations(
            props.selectedKey, 
            props.currentSelectedItem?.extras, 
            props.currentSelectedItem?.modifiers, 
            selections
          );
          modals.setIsMessageModalOpen(false);
        }}
      />
      <PosMoreModal 
        isOpen={modals.isMoreModalOpen} 
        onClose={() => modals.setIsMoreModalOpen(false)} 
        onCashierOut={() => {
          modals.setIsMoreModalOpen(false);
          modals.setIsCashierSessionOpen(true);
        }}
        onCustomerMaster={() => modals.setIsCustomerModalOpen(true)}
        onItemComplimentary={props.handleItemComplimentary}
        onBillComplimentary={props.handleBillComplimentary}
        onSettledOrders={() => {
          props.requestAuthorization({
            actionLabel: "Settled order",
            permissionId: 20, // Settled order
            onAuthorized: () => modals.setIsSettledModalOpen(true),
          });
        }}
        onReport={() => {
          props.requestAuthorization({
            actionLabel: "Report",
            permissionId: 26, // Report
            onAuthorized: () => modals.setIsReportModalOpen(true),
          });
        }}
        requestAuthorization={props.requestAuthorization}
      />
      <PosDeliveryChargeModal
        isOpen={modals.isDeliveryChargeModalOpen}
        onClose={() => modals.setIsDeliveryChargeModalOpen(false)}
        currentCharge={props.deliveryCharge}
        onSelect={(charge) => props.dispatch(props.setCustomDeliveryCharge(charge))}
      />

      <PosProviderOrderModal
        isOpen={!!props.selectedProviderForOrder}
        onClose={() => props.setSelectedProviderForOrder(null)}
        provider={props.selectedProviderForOrder}
        onSubmit={(orderNo) => {
          if (props.selectedProviderForOrder) {
            props.resetTerminalState();
            props.setActiveProvider({ provider: props.selectedProviderForOrder, orderNo });
            props.showToast(`${props.selectedProviderForOrder.providerName} order #${orderNo} started`, 'success');
          }
          props.setSelectedProviderForOrder(null);
        }}
      />
      <EmployeePasswordModal key={props.authorizationModalKey} {...props.authorizationModalProps} />

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
          props.setBillDiscountConfirmState({ isOpen: false, value: 0, mode: 'percentage' });
        }}
        onCancel={() => props.setBillDiscountConfirmState({ isOpen: false, value: 0, mode: 'percentage' })}
        confirmLabel="Override"
        confirmVariant="danger"
      />

      {/* ── System / Heavy Modals (Lazy Loaded) ── */}
      <Suspense fallback={<ModalLoader />}>
        {modals.isReportModalOpen && (
          <PosReportModal isOpen={modals.isReportModalOpen} onClose={() => modals.setIsReportModalOpen(false)} />
        )}
        {modals.isSettledModalOpen && (
          <PosSettledModal isOpen={modals.isSettledModalOpen} onClose={() => modals.setIsSettledModalOpen(false)} onEditSuccess={() => modals.setIsSettledModalOpen(false)} />
        )}
        {modals.isCustomerModalOpen && (
          <PosCustomerModal isOpen={modals.isCustomerModalOpen} onClose={() => modals.setIsCustomerModalOpen(false)} />
        )}
        {modals.isDeliveryModalOpen && (
          <PosDeliveryModal isOpen={modals.isDeliveryModalOpen} onClose={() => modals.setIsDeliveryModalOpen(false)} />
        )}
        {modals.isDriveThroughModalOpen && (
          <PosDriveThroughModal isOpen={modals.isDriveThroughModalOpen} onClose={() => modals.setIsDriveThroughModalOpen(false)} />
        )}
        {modals.isRecallModalOpen && (
          <PosRecallModal
            isOpen={modals.isRecallModalOpen}
            onClose={() => modals.setIsRecallModalOpen(false)}
            onSettleSuccess={() => {
              modals.setReturnToRecallOnCancel(true);
              modals.setIsMultiPayModalOpen(true);
            }}
          />
        )}
        {modals.isVoidModalOpen && (
          <PosVoidModal isOpen={modals.isVoidModalOpen} onClose={() => modals.setIsVoidModalOpen(false)} />
        )}
        {modals.isCombineOpen && (
          <PosCombineModal isOpen={modals.isCombineOpen} onClose={() => modals.setIsCombineOpen(false)} />
        )}
        {modals.isSplitOpen && (
          <PosSplitModal
            isOpen={modals.isSplitOpen}
            onClose={() => modals.setIsSplitOpen(false)}
            orderId={props.editingOrderId || 0}
            onSuccess={() => {
              modals.setIsSplitOpen(false);
              props.handleClearCart();
            }}
          />
        )}
        {modals.isProviderModalOpen && (
          <PosProviderModal
            isOpen={modals.isProviderModalOpen}
            onClose={() => modals.setIsProviderModalOpen(false)}
            onSelect={(provider) => {
              modals.setIsProviderModalOpen(false);
              props.setSelectedProviderForOrder(provider);
            }}
            onClear={() => {
              props.setActiveProvider(null);
            }}
          />
        )}
        {modals.isLockItemModalOpen && (
          <LockItemModal
            isOpen={modals.isLockItemModalOpen}
            onClose={() => {
              modals.setIsLockItemModalOpen(false);
              props.refreshLockedProducts();
            }}
            initialProductId={modals.selectedProductToLock}
            onSuccess={() => props.refreshLockedProducts()}
          />
        )}
        <PosCashTenderModal
          isOpen={modals.isCashModalOpen}
          onClose={() => modals.setIsCashModalOpen(false)}
          totalDue={props.total}
          onSubmit={(_, changeAmount) => {
            modals.setIsCashModalOpen(false);
            const cashPaymodeId = props.tenderOptions.find(t => t.label.toLowerCase().includes('cash'))?.id || props.tenderOptions[0]?.id;
            props.handleCompleteSettlement([{ paymodeId: Number(cashPaymodeId), amount: props.total }], changeAmount);
          }}
          loading={props.orderLoading}
        />
        <PosMultiPayModal
          isOpen={modals.isMultiPayModalOpen}
          onClose={() => {
            modals.setIsMultiPayModalOpen(false);
            if (modals.returnToRecallOnCancel) {
              props.handleClearCart();
              modals.setReturnToRecallOnCancel(false);
            }
          }}
          totalDue={props.total}
          onSubmit={(payments, changeAmount) => {
            modals.setIsMultiPayModalOpen(false);
            if (modals.returnToRecallOnCancel) {
              modals.setIsRecallModalOpen(false);
              modals.setReturnToRecallOnCancel(false);
            }
            const mappedPayments = payments.map((p: any) => {
              const matchedTender = props.tenderOptions.find(t => t.label.toLowerCase().includes(p.mode.toLowerCase()));
              const id = matchedTender ? Number(matchedTender.id) : (p.mode === 'cash' ? 1 : p.mode === 'card' ? 2 : 3);
              return {
                paymodeId: id,
                amount: p.amount
              };
            });
            props.handleCompleteSettlement(mappedPayments, changeAmount);
          }}
          loading={props.orderLoading}
        />

        <PosCashierSessionModal
          isOpen={props.modals.isCashierSessionOpen}
          onClose={() => props.modals.closeModal('cashierSession')}
          onSessionReady={() => window.location.reload()}
        />
      </Suspense>
    </>
  );
});
