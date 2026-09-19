import React, { Suspense } from "react";
import type { MenuProvider } from "../../../types";
import { setCustomerId, setOrderType } from "../../store/posSlice";
import { PosProviderOrderModal } from "./providers/PosProviderOrderModal";

const PosCustomerModal = React.lazy(() =>
  import("../../../customer/components/PosCustomerModal").then((m) => ({ default: m.PosCustomerModal }))
);
const PosDeliveryModal = React.lazy(() =>
  import("../../../customer/components/PosDeliveryModal").then((m) => ({ default: m.PosDeliveryModal }))
);
const PosDriveThroughModal = React.lazy(() =>
  import("../../../customer/components/PosDriveThroughModal").then((m) => ({
    default: m.PosDriveThroughModal,
  }))
);
const PosRecallModal = React.lazy(() =>
  import("./order/PosRecallModal").then((m) => ({ default: m.PosRecallModal }))
);
const PosVoidModal = React.lazy(() =>
  import("./order/PosVoidModal").then((m) => ({ default: m.PosVoidModal }))
);
const PosCombineModal = React.lazy(() =>
  import("./order/PosCombineModal").then((m) => ({ default: m.PosCombineModal }))
);
const PosSplitModal = React.lazy(() =>
  import("./order/PosSplitModal").then((m) => ({ default: m.PosSplitModal }))
);
const PosProviderModal = React.lazy(() =>
  import("./providers/PosProviderModal").then((m) => ({ default: m.PosProviderModal }))
);

const ModalLoader = () => (
  <div className="flex justify-center items-center p-4">
    <div className="w-6 h-6 border-2 border-[#49293e]/20 border-t-[#49293e] rounded-full animate-spin"></div>
  </div>
);

export interface OrderModalsProps {
  modals: any;
  dispatch: any;
  showToast: any;
  editingOrderId: number | null;
  selectedProviderForOrder: MenuProvider | null;
  setSelectedProviderForOrder: (p: MenuProvider | null) => void;
  resetTerminalState: () => void;
  setActiveProvider: (data: any) => void;
  handleClearCart: () => void;
}

export const OrderModals: React.FC<OrderModalsProps> = React.memo((props) => {
  const { modals } = props;

  return (
    <>
      <PosProviderOrderModal
        isOpen={!!props.selectedProviderForOrder}
        onClose={() => props.setSelectedProviderForOrder(null)}
        provider={props.selectedProviderForOrder}
        onSubmit={(orderNo) => {
          if (props.selectedProviderForOrder) {
            const provider = props.selectedProviderForOrder;
            props.resetTerminalState();
            props.setActiveProvider({ provider, orderNo });
            props.dispatch(
              setOrderType({ orderTypeId: provider.providerId, orderType: provider.providerName })
            );
            props.showToast(`${provider.providerName} order #${orderNo} started`, "success");
          }
          props.setSelectedProviderForOrder(null);
        }}
      />

      <Suspense fallback={<ModalLoader />}>
        {modals.isCustomerModalOpen && (
          <PosCustomerModal
            isOpen={modals.isCustomerModalOpen}
            onClose={() => {
              modals.setIsCustomerModalOpen(false);
              modals.setIsMoreModalOpen(true);
            }}
          />
        )}
        {modals.isDeliveryModalOpen && (
          <PosDeliveryModal
            isOpen={modals.isDeliveryModalOpen}
            onClose={() => modals.setIsDeliveryModalOpen(false)}
          />
        )}
        {modals.isDriveThroughModalOpen && (
          <PosDriveThroughModal
            isOpen={modals.isDriveThroughModalOpen}
            onClose={() => modals.setIsDriveThroughModalOpen(false)}
          />
        )}
        {modals.isRecallModalOpen && (
          <PosRecallModal
            isOpen={modals.isRecallModalOpen}
            onClose={() => modals.setIsRecallModalOpen(false)}
            onSettleSuccess={() => {
              modals.setReturnToRecallOnCancel(true);
              // Close the recall modal first so the settle (MultiPay) modal
              // is not obscured behind it — both share z-50
              modals.setIsRecallModalOpen(false);
              modals.setIsMultiPayModalOpen(true);
            }}
          />
        )}
        {modals.isVoidModalOpen && (
          <PosVoidModal
            isOpen={modals.isVoidModalOpen}
            onClose={() => modals.setIsVoidModalOpen(false)}
          />
        )}
        {modals.isCombineOpen && (
          <PosCombineModal
            isOpen={modals.isCombineOpen}
            onClose={() => modals.setIsCombineOpen(false)}
          />
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
              props.dispatch(setCustomerId(1));
            }}
          />
        )}
      </Suspense>
    </>
  );
});
