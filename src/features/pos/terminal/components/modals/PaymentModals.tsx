import React from "react";
import { PosDeliveryChargeModal } from "./payment/PosDeliveryChargeModal";
import { PosCashTenderModal } from "./payment/PosCashTenderModal";
import { PosMultiPayModal } from "./payment/PosMultiPayModal";
import { roundCalc } from "../../utils/billing";

export interface PaymentModalsProps {
  modals: any;
  deliveryCharge: number;
  setCustomDeliveryCharge: (val: number) => any;
  dispatch: any;
  total: number;
  selectedCustomerId?: number;
  tenderOptions: any[];
  orderLoading: boolean;
  handleCompleteSettlement: (payments: any[], change: number) => void;
  handleClearCart: () => void;
}

export const PaymentModals: React.FC<PaymentModalsProps> = React.memo((props) => {
  const { modals } = props;

  return (
    <>
      <PosDeliveryChargeModal
        isOpen={modals.isDeliveryChargeModalOpen}
        onClose={() => modals.setIsDeliveryChargeModalOpen(false)}
        currentCharge={props.deliveryCharge}
        onSelect={(charge) => props.dispatch(props.setCustomDeliveryCharge(charge))}
      />

      <PosCashTenderModal
        isOpen={modals.isCashModalOpen}
        onClose={() => modals.setIsCashModalOpen(false)}
        totalDue={props.total}
        onSubmit={(_, changeAmount) => {
          modals.setIsCashModalOpen(false);
          const cashPaymodeId =
            props.tenderOptions.find((t) => t.label.toLowerCase().includes("cash"))?.id ||
            props.tenderOptions[0]?.id;
          props.handleCompleteSettlement(
            [{ paymodeId: Number(cashPaymodeId), amount: props.total }],
            changeAmount
          );
        }}
        loading={props.orderLoading}
      />

      <PosMultiPayModal
        isOpen={modals.isMultiPayModalOpen}
        customerId={props.selectedCustomerId}
        tenderOptions={props.tenderOptions}
        onClose={() => {
          modals.setIsMultiPayModalOpen(false);
          if (modals.returnToRecallOnCancel) {
            props.handleClearCart();
            modals.setReturnToRecallOnCancel(false);
            // Re-open the Recall modal so the user can go back to it
            modals.setIsRecallModalOpen(true);
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
            const isCash = (p.label || "").toLowerCase().includes("cash");
            const finalAmount = isCash ? Math.max(0, p.amount - changeAmount) : p.amount;
            return {
              paymodeId: Number(p.paymodeId),
              amount: roundCalc(finalAmount),
            };
          });
          props.handleCompleteSettlement(mappedPayments, changeAmount);
        }}
        loading={props.orderLoading}
      />
    </>
  );
});
