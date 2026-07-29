import { useState, useCallback } from "react";

export const usePosModals = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMoreModalOpen, setIsMoreModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isDriveThroughModalOpen, setIsDriveThroughModalOpen] = useState(false);
  const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);
  const [returnToRecallOnCancel, setReturnToRecallOnCancel] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [isCombineOpen, setIsCombineOpen] = useState(false);
  const [isLockItemModalOpen, setIsLockItemModalOpen] = useState(false);
  const [selectedProductToLock, setSelectedProductToLock] = useState<string | undefined>(undefined);
  const [isSplitOpen, setIsSplitOpen] = useState(false);
  const [isDeliveryChargeModalOpen, setIsDeliveryChargeModalOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isQtyModalOpen, setIsQtyModalOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isMultiPayModalOpen, setIsMultiPayModalOpen] = useState(false);
  const [isSettledModalOpen, setIsSettledModalOpen] = useState(false);
  const [isSettledAuthOpen, setIsSettledAuthOpen] = useState(false);
  const [isCashierSessionOpen, setIsCashierSessionOpen] = useState(false);

  const openModal = useCallback((modalName: string) => {
    switch (modalName) {
      case 'cart': setIsCartOpen(true); break;
      case 'more': setIsMoreModalOpen(true); break;
      case 'report': setIsReportModalOpen(true); break;
      case 'customer': setIsCustomerModalOpen(true); break;
      case 'delivery': setIsDeliveryModalOpen(true); break;
      case 'driveThrough': setIsDriveThroughModalOpen(true); break;
      case 'recall': setIsRecallModalOpen(true); break;
      case 'void': setIsVoidModalOpen(true); break;
      case 'provider': setIsProviderModalOpen(true); break;
      case 'combine': setIsCombineOpen(true); break;
      case 'lockItem': setIsLockItemModalOpen(true); break;
      case 'split': setIsSplitOpen(true); break;
      case 'deliveryCharge': setIsDeliveryChargeModalOpen(true); break;
      case 'logoutConfirm': setIsLogoutConfirmOpen(true); break;
      case 'price': setIsPriceModalOpen(true); break;
      case 'qty': setIsQtyModalOpen(true); break;
      case 'cash': setIsCashModalOpen(true); break;
      case 'multiPay': setIsMultiPayModalOpen(true); break;
      case 'settled': setIsSettledModalOpen(true); break;
      case 'settledAuth': setIsSettledAuthOpen(true); break;
      case 'cashierSession': setIsCashierSessionOpen(true); break;
    }
  }, []);

  const closeModal = useCallback((modalName: string) => {
    switch (modalName) {
      case 'cart': setIsCartOpen(false); break;
      case 'more': setIsMoreModalOpen(false); break;
      case 'report': setIsReportModalOpen(false); break;
      case 'customer': setIsCustomerModalOpen(false); break;
      case 'delivery': setIsDeliveryModalOpen(false); break;
      case 'driveThrough': setIsDriveThroughModalOpen(false); break;
      case 'recall': setIsRecallModalOpen(false); break;
      case 'void': setIsVoidModalOpen(false); break;
      case 'provider': setIsProviderModalOpen(false); break;
      case 'combine': setIsCombineOpen(false); break;
      case 'lockItem': setIsLockItemModalOpen(false); break;
      case 'split': setIsSplitOpen(false); break;
      case 'deliveryCharge': setIsDeliveryChargeModalOpen(false); break;
      case 'logoutConfirm': setIsLogoutConfirmOpen(false); break;
      case 'price': setIsPriceModalOpen(false); break;
      case 'qty': setIsQtyModalOpen(false); break;
      case 'cash': setIsCashModalOpen(false); break;
      case 'multiPay': setIsMultiPayModalOpen(false); break;
      case 'settled': setIsSettledModalOpen(false); break;
      case 'settledAuth': setIsSettledAuthOpen(false); break;
      case 'cashierSession': setIsCashierSessionOpen(false); break;
    }
  }, []);

  return {
    isCartOpen, setIsCartOpen,
    isMoreModalOpen, setIsMoreModalOpen,
    isReportModalOpen, setIsReportModalOpen,
    isCustomerModalOpen, setIsCustomerModalOpen,
    isDeliveryModalOpen, setIsDeliveryModalOpen,
    isDriveThroughModalOpen, setIsDriveThroughModalOpen,
    isRecallModalOpen, setIsRecallModalOpen,
    returnToRecallOnCancel, setReturnToRecallOnCancel,
    isVoidModalOpen, setIsVoidModalOpen,
    isProviderModalOpen, setIsProviderModalOpen,
    isCombineOpen, setIsCombineOpen,
    isLockItemModalOpen, setIsLockItemModalOpen,
    selectedProductToLock, setSelectedProductToLock,
    isSplitOpen, setIsSplitOpen,
    isDeliveryChargeModalOpen, setIsDeliveryChargeModalOpen,
    isLogoutConfirmOpen, setIsLogoutConfirmOpen,
    isPriceModalOpen, setIsPriceModalOpen,
    isQtyModalOpen, setIsQtyModalOpen,
    isCashModalOpen, setIsCashModalOpen,
    isMultiPayModalOpen, setIsMultiPayModalOpen,
    isSettledModalOpen, setIsSettledModalOpen,
    isSettledAuthOpen, setIsSettledAuthOpen,
    isCashierSessionOpen, setIsCashierSessionOpen,
    openModal,
    closeModal,
  };
};
