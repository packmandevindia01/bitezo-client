import React, { Suspense } from "react";
import { PosMoreModal } from "./system/PosMoreModal";

const PosReportModal = React.lazy(() =>
  import("./system/PosReportModal").then((m) => ({ default: m.PosReportModal }))
);
const PosSettledModal = React.lazy(() =>
  import("./system/PosSettledModal").then((m) => ({ default: m.PosSettledModal }))
);
const PosCashierSessionModal = React.lazy(() =>
  import("./system/PosCashierSessionModal").then((m) => ({ default: m.PosCashierSessionModal }))
);
const LockItemModal = React.lazy(() =>
  import("../../../lockItem/components/LockItemModal").then((m) => ({ default: m.default }))
);

const ModalLoader = () => (
  <div className="flex justify-center items-center p-4">
    <div className="w-6 h-6 border-2 border-[#49293e]/20 border-t-[#49293e] rounded-full animate-spin"></div>
  </div>
);

export interface SystemModalsProps {
  modals: any;
  authorizationModalKey?: string;
  authorizationModalProps?: any;
  requestAuthorization: (options: any) => void;
  handleItemComplimentary: () => void;
  handleBillComplimentary: () => void;
  refreshLockedProducts: () => void;
}

export const SystemModals: React.FC<SystemModalsProps> = React.memo((props) => {
  const { modals } = props;

  return (
    <>
      <PosMoreModal
        isOpen={modals.isMoreModalOpen}
        onClose={() => modals.setIsMoreModalOpen(false)}
        onCashierOut={() => {
          modals.setIsMoreModalOpen(false);
          modals.setIsCashierSessionOpen(true);
        }}
        onCustomerMaster={() => {
          modals.setIsMoreModalOpen(false);
          modals.setIsCustomerModalOpen(true);
        }}
        onItemComplimentary={props.handleItemComplimentary}
        onBillComplimentary={props.handleBillComplimentary}
        onSettledOrders={() => {
          props.requestAuthorization({
            actionLabel: "Settled order",
            permissionId: 20, // Settled order
            onAuthorized: () => {
              modals.setIsMoreModalOpen(false);
              modals.setIsSettledModalOpen(true);
            },
          });
        }}
        onReport={() => {
          props.requestAuthorization({
            actionLabel: "Report",
            permissionId: 26, // Report
            onAuthorized: () => {
              modals.setIsMoreModalOpen(false);
              modals.setIsReportModalOpen(true);
            },
          });
        }}
        onVoidOrder={() => {
          props.requestAuthorization({
            actionLabel: "Order Void",
            permissionId: 17, // Order Void
            onAuthorized: () => {
              modals.setIsMoreModalOpen(false);
              modals.setIsVoidModalOpen(true);
            },
          });
        }}
        requestAuthorization={props.requestAuthorization}
      />

      <Suspense fallback={<ModalLoader />}>
        {modals.isReportModalOpen && (
          <PosReportModal
            isOpen={modals.isReportModalOpen}
            onClose={() => {
              modals.setIsReportModalOpen(false);
              modals.setIsMoreModalOpen(true);
            }}
          />
        )}
        {modals.isSettledModalOpen && (
          <PosSettledModal
            isOpen={modals.isSettledModalOpen}
            onClose={() => {
              modals.setIsSettledModalOpen(false);
              modals.setIsMoreModalOpen(true);
            }}
            onEditSuccess={() => {
              modals.setIsSettledModalOpen(false);
              modals.setIsMoreModalOpen(true);
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
        <PosCashierSessionModal
          isOpen={modals.isCashierSessionOpen}
          onClose={() => modals.closeModal("cashierSession")}
          onSessionReady={() => modals.closeModal("cashierSession")}
        />
      </Suspense>
    </>
  );
});
