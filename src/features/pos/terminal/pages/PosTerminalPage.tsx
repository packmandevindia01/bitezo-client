import { useState, useEffect, useMemo } from "react";
import { Capacitor } from "@capacitor/core";
import { useEvent } from "../../../../hooks/useEvent";
import { useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../../../app/hooks";
import PosTopNav from "../components/layout/PosTopNav";
import PosCategoryRail from "../components/menu/PosCategoryRail";
import PosGroupTabs from "../components/layout/PosGroupTabs";
import { PosCartPanel } from "../components/cart/PosCartPanel";
import PosProductGrid from "../components/menu/PosProductGrid";
import { usePosTerminal } from "../hooks/usePosTerminal";
import { usePosModals } from "../hooks/usePosModals";
import { usePosCheckoutFlow } from "../hooks/usePosCheckoutFlow";
import { usePosDiscountFlow } from "../hooks/usePosDiscountFlow";
import { usePosVoidFlow } from "../hooks/usePosVoidFlow";
import { usePosProviderTender } from "../hooks/usePosProviderTender";
import { usePosItemEdits } from "../hooks/usePosItemEdits";
import { usePosSettleAction } from "../hooks/usePosSettleAction";
import { usePosOrderAction } from "../hooks/usePosOrderAction";
import { PosActionButtons } from "../components/layout/PosActionButtons";
import { PosMobileCartButton } from "../components/layout/PosMobileCartButton";
import { PosTerminalModals } from "../components/modals/PosTerminalModals";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import { SettlePrintPrompt } from "../components/modals/payment/SettlePrintPrompt";
import { usePosShortcuts } from "../hooks/usePosShortcuts";
import { clearAllItemDiscounts, setCustomerId, setCustomDeliveryCharge } from "../store/posSlice";
import { selectDeliveryCharge, selectMenuOrderTypeId } from "../store/posSelectors";
import { PosProductSearchDropdown } from "../components/menu/PosProductSearchDropdown";
import type { PosProductSearchResult } from "../../types";
import ErrorBoundary from "../../../../components/common/ErrorBoundary";
import { useCashierLog } from "../../cashier";
import type { MenuProvider } from "../../types";
import { useToast } from "../../../../app/providers/useToast";
import { useEmployeeAuthorization } from "../hooks/useEmployeeAuthorization";
import { useCurrency } from "../../../../hooks/useCurrency";
import { clearAllPosCache } from "../hooks/usePosProducts";
import { useTerminalInit } from "../hooks/system/useTerminalInit";
import { useProductSelection } from "../hooks/menu/useProductSelection";
import { EmployeePasswordModal } from "../components/modals/system/EmployeePasswordModal";
import { SubscriptionBanner } from "../../../company/components/SubscriptionBanner";

/**
 * The POS terminal screen. Its actions live in hooks (split 2026-11-13): usePosProviderTender (provider order,
 * payment method), usePosItemEdits (price, qty, complimentary), usePosOrderAction (ORDER), usePosSettleAction
 * (SETTLE), next to the checkout, discount and void flows.
 */
export const PosTerminalPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const modals = usePosModals();
  const { showToast } = useToast();
  const { authorizationModalKey, authorizationModalProps, requestAuthorization } = useEmployeeAuthorization();
  const { decimalPart } = useCurrency();
  const { status, isLoading } = useCashierLog();

  const [selectedProviderForOrder, setSelectedProviderForOrder] = useState<MenuProvider | null>(null);
  const menuOrderTypeId = useAppSelector(selectMenuOrderTypeId);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [extrasModifierType, setExtrasModifierType] = useState<"none" | "extras" | "modifiers">("none");
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  const terminal = usePosTerminal();

  // Initialize terminal routing, branch print caching, and auto-dine-in
  const { getRuntimePosConfig, applyDefaultOrderType } = useTerminalInit({
    status,
    isLoading,
    orderTypes: terminal.orderTypes,
    cartItemCount: terminal.itemCount,
    editingOrderId: terminal.editingOrderId,
    selectedTableId: terminal.selectedTableId,
    setIsMoreModalOpen: modals.setIsMoreModalOpen,
    setIsCashModalOpen: modals.setIsCashModalOpen,
  });

  const {
    activeProvider,
    setActiveProvider,
    selectedTender,
    setSelectedTender,
    isCreditProviderActive,
    selectCashTender,
  } = usePosProviderTender({ terminal, dispatch });

  const billDiscountValue = useAppSelector((state) => state.pos.billDiscountValue);
  const billDiscountType = useAppSelector((state) => state.pos.billDiscountType);
  /**
   * Item complimentary: split / combine are not allowed. Bill complimentary (a 100 % bill discount) is
   * allowed like any bill discount — the split / combine window warns and removes it. A recalled
   * bill-complimentary order shows its lines as complimentary too; that is the bill, not items.
   */
  const cartIsComplimentary = () =>
    !(billDiscountType === "percentage" && Number(billDiscountValue) === 100) &&
    terminal.cartDetails.some((i) =>
      Boolean((i as any).complimentaryStatus || (i.discountType === 'percentage' && Number(i.discountValue) === 100))
    );
  const { productCache } = useAppSelector((state) => state.pos);
  const isSettling = useAppSelector((state) => state.pos.isSettling);
  const deliveryCharge = useAppSelector(selectDeliveryCharge);
  const selectedOrderTypeName = useAppSelector((state) => state.pos.selectedOrderTypeName);
  const isDelivery =
    terminal.selectedOrderTypeId === 4 ||
    (selectedOrderTypeName || "").toLowerCase().replace(/[\s_-]/g, "").includes("delivery");
  const isSettledEdit = useAppSelector((state) => state.pos.isSettledEdit);
  const isCartModified = useAppSelector((state) => state.pos.isCartModified);
  const editingSaleId = useAppSelector((state) => state.pos.editingSaleId);
  const selectedCustomerName = useAppSelector((state) => state.pos.selectedCustomerName);

  const activeCategory = terminal.categories.find((c) => String(c.id) === String(terminal.activeCategoryId));
  const activeSubCategory = terminal.subCategories.find(
    (s: any) => String(s.subCategoryId) === String(terminal.activeSubCategoryId)
  );

  const currentSelectedItem = useMemo(() => {
    if (!selectedKey) return null;
    return terminal.cartDetails.find((item) => item.uniqueId === selectedKey);
  }, [selectedKey, terminal.cartDetails]);

  // Product, variation, and search selection handling
  const productSelection = useProductSelection({
    visibleProducts: terminal.visibleProducts,
    selectedOrderTypeId: menuOrderTypeId,
    addProduct: terminal.addProduct,
    setSelectedKey,
    openPriceModal: () => modals.setIsPriceModalOpen(true),
  });

  useEffect(() => {
    productSelection.setAlternatives([]);
    productSelection.setSelectedProduct(null);
  }, [terminal.activeGroupId, terminal.activeCategoryId, terminal.activeSubCategoryId, terminal.search]);

  const resetTerminalState = () => {
    terminal.clearCart();
    setSelectedKey(null);
    productSelection.setSelectedProduct(null);
    productSelection.setAlternatives([]);
    if (terminal.groups && terminal.groups.length > 0) {
      terminal.setGroup(terminal.groups[0].groupId);
    }
    terminal.setSearch("");
  };

  const handleClearCart = () => {
    clearAllPosCache();
    resetTerminalState();
    setActiveProvider(null);
    dispatch(setCustomerId(1));
    selectCashTender();
    void applyDefaultOrderType(true);
  };

  const handleRequestClearCart = () => {
    const hasData = terminal.cartDetails.length > 0 || !!terminal.editingOrderId || !!activeProvider;
    if (hasData) {
      setIsClearConfirmOpen(true);
    } else {
      handleClearCart();
    }
  };

  const voidFlow = usePosVoidFlow({
    cartDetails: terminal.cartDetails,
    editingOrderId: terminal.editingOrderId,
    requestAuthorization,
    addVoidProduct: terminal.addVoidProduct,
    addVoidModifier: terminal.addVoidModifier,
    removeItem: terminal.removeItem,
    decrementItem: terminal.decrementItem,
    selectedKey,
    setSelectedKey,
    showToast,
    decimalPart,
  });

  const checkoutFlow = usePosCheckoutFlow({
    status,
    cartDetails: terminal.cartDetails,
    activeProvider,
    editingOrderId: terminal.editingOrderId,
    editingSaleId,
    isCartModified,
    subtotal: terminal.subtotal,
    totalDiscountAmount: terminal.discount,
    totalServiceCharge: terminal.totalServiceCharge,
    totalLevy: terminal.totalLevy,
    totalVat: terminal.tax,
    total: terminal.total,
    deliveryCharge,
    tenderOptions: terminal.tenderOptions,
    decimalPart,
    waiterName: terminal.waiterName,
    waiterId: terminal.waiterId,
    submitOrder: terminal.submitOrder,
    getDirectSettleOrderPayload: terminal.getDirectSettleOrderPayload,
    requestAuthorization,
    showToast,
    handleClearCart,
    setIsCashModalOpen: modals.setIsCashModalOpen,
    setIsMultiPayModalOpen: modals.setIsMultiPayModalOpen,
    setSelectedKey,
    setSelectedProduct: productSelection.setSelectedProduct,
    setAlternatives: productSelection.setAlternatives,
    setActiveProvider,
    setChange: terminal.setChange,
    getRuntimePosConfig,
  });

  const discountFlow = usePosDiscountFlow({
    cartDetails: terminal.cartDetails,
    subtotal: terminal.subtotal,
    billDiscountValue,
    itemCount: terminal.itemCount,
    selectedKey,
    setBillDiscount: terminal.setBillDiscount,
    setItemDiscount: terminal.setItemDiscount,
    showToast,
    requestAuthorization,
  });

  const {
    handleApplyPrice,
    handlePriceModalClose,
    handleItemComplimentary,
    handleBillComplimentary,
    handleApplyQty,
    openPriceModal,
    openQtyModal,
  } = usePosItemEdits({
    terminal,
    modals,
    selectedKey,
    setSelectedKey,
    priceVoidedUnits: voidFlow.priceVoidedUnits,
    requestAuthorization,
    showToast,
  });

  const stableSetCategory = useEvent((id: string) => {
    const parsedId = parseInt(id, 10);
    if (parsedId !== terminal.activeCategoryId) {
      terminal.setCategory(parsedId);
    } else {
      terminal.setSubCategory(null);
      productSelection.setAlternatives([]);
      productSelection.setSelectedProduct(null);
    }
  });

  const stableOnLongPress = useEvent((id: number) => {
    requestAuthorization({
      actionLabel: "Lock Products",
      permissionId: 18,
      onAuthorized: () => {
        modals.setSelectedProductToLock(String(id));
        modals.setIsLockItemModalOpen(true);
      },
    });
  });

  const { settleShouldPrintRef } = checkoutFlow;

  const { handleSettle } = usePosSettleAction({
    terminal,
    checkoutFlow,
    modals,
    isDelivery,
    selectedTender,
    getRuntimePosConfig,
    requestAuthorization,
    showToast,
    dispatch,
  });

  const { handleOrder } = usePosOrderAction({
    status,
    terminal,
    checkoutFlow,
    getRuntimePosConfig,
    requestAuthorization,
    showToast,
    dispatch,
  });

  const stableHandleOrder = useEvent((print: boolean) => handleOrder(print));
  const stableHandleSettle = useEvent((print: boolean) => handleSettle(print));

  const handleGridBack = () => {
    if (productSelection.alternatives.length > 0) {
      productSelection.setAlternatives([]);
      productSelection.setSelectedProduct(null);
    } else {
      terminal.setSubCategory(null);
    }
  };

  useBarcodeScanner(async (barcode) => {
    const cachedProducts = Object.values(productCache || {});
    const product = cachedProducts.find((p: any) => p.sku?.toLowerCase() === barcode.toLowerCase());

    if (!product) return;

    if (product.hasAlternatives) {
      await productSelection.handleProductSelect(product.id);
    } else {
      setSelectedKey(null); // nothing selected during the wait (see useProductSelection)
      const newKey = await terminal.addProductBySku(barcode, menuOrderTypeId);
      if (newKey) {
        setSelectedKey(newKey);
      }
    }
  });

  usePosShortcuts({
    // Esc used to wipe the cart instantly (even while another popup was open). It now only opens the
    // "Clear Order Data?" confirmation, so a stray Esc can never lose an order.
    onClearCart: () => {
      if (terminal.cartDetails.length === 0 || isClearConfirmOpen) return;
      setIsClearConfirmOpen(true);
    },
    onHoldTicket: () => {},
    onCheckout: () => {},
  });

  useEffect(() => {
    if (status && (status.isDayClosed || status.isShiftClosed)) {
      if (!modals.isCashierSessionOpen && !modals.isReportModalOpen) {
        modals.setIsCashierSessionOpen(true);
      }
    }
  }, [status, modals.isCashierSessionOpen, modals.isReportModalOpen, modals.setIsCashierSessionOpen]);

  if (isLoading && !status) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#ebe6e8]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#49293e]/20 border-t-[#49293e] rounded-full animate-spin" />
          <p className="text-sm font-bold text-[#49293e] uppercase tracking-widest">Checking Cashier Status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-[#ebe6e8] font-sans text-slate-900 overflow-hidden relative">
      <SubscriptionBanner />
      <PosTopNav
        onDelivery={() => modals.setIsDeliveryModalOpen(true)}
        onDriveThrough={() => modals.setIsDriveThroughModalOpen(true)}
        onProvider={() => {
          requestAuthorization({
            actionLabel: "Provider",
            permissionId: 5,
            onAuthorized: () => modals.setIsProviderModalOpen(true),
          });
        }}
        onCustomer={() => modals.setIsCustomerModalOpen(true)}
        onLogout={() => modals.setIsLogoutChoiceOpen(true)}
        onCashierOut={() => modals.setIsLogoutChoiceOpen(true)}
        status={status}
        orderTypes={terminal.orderTypes}
        selectedOrderTypeId={terminal.selectedOrderTypeId}
        onSelectOrderType={(type) => {
          setActiveProvider(null);
          terminal.setSelectedOrderType(type.orderTypeId, type.orderType);
        }}
        activeProvider={activeProvider}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 relative">
          <div className="flex flex-row items-center bg-white border-b border-slate-100 relative z-30 shrink-0 pl-2 md:pl-3 lg:pl-4 xl:pl-6 pr-2 md:pr-3">
            <div className="shrink-0">
              <PosGroupTabs
                menuTimes={terminal.menuTimes}
                groups={terminal.groups}
                activeGroupId={terminal.activeGroupId}
                onSelect={(id) => {
                  if (id !== terminal.activeGroupId) {
                    terminal.setGroup(id);
                  }
                }}
              />
            </div>

            <div className="flex-1 flex items-center justify-end py-1">
              <PosProductSearchDropdown
                orderTypeId={menuOrderTypeId}
                onSelectProduct={(item: PosProductSearchResult) =>
                  productSelection.handleSearchProductSelect(item)
                }
                onSelectAlternative={(product, variant) =>
                  productSelection.handleSearchAltSelect(product, variant)
                }
                autoFocus={window.innerWidth >= 600 && !Capacitor.isNativePlatform()}
                className="max-w-[200px] md:max-w-xs"
              />
            </div>
          </div>

          {productSelection.fetchingAlts && (
            <div className="absolute inset-0 z-[60] flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-[#49293e]/20 border-t-[#49293e] rounded-full animate-spin" />
                <p className="text-xs font-bold text-[#49293e] uppercase tracking-widest">
                  Fetching Variations...
                </p>
              </div>
            </div>
          )}

          <main className="flex-1 overflow-hidden grid grid-cols-[130px_minmax(0,1fr)] md:grid-cols-[150px_minmax(0,1fr)] lg:grid-cols-[160px_minmax(0,1fr)] xl:grid-cols-[200px_minmax(0,1fr)]">
            <PosCategoryRail
              categories={terminal.categories}
              activeCategoryId={terminal.activeCategoryId ? terminal.activeCategoryId.toString() : ""}
              onSelect={stableSetCategory}
            />

            <div className="flex flex-col flex-1 overflow-hidden bg-[#f4f5f7] relative">
              <div className="flex-1 flex flex-col overflow-hidden relative">
                <ErrorBoundary name="Product Grid">
                  <PosProductGrid
                    products={terminal.visibleProducts}
                    subCategories={terminal.subCategories}
                    alternatives={productSelection.alternatives}
                    activeSubCategoryId={terminal.activeSubCategoryId}
                    onSelectSubCategory={terminal.setSubCategory}
                    onBack={handleGridBack}
                    onAdd={productSelection.handleProductSelect}
                    onSelectAlt={productSelection.handleAltSelect}
                    onLongPress={stableOnLongPress}
                    categoryName={activeCategory?.name}
                    subCategoryName={activeSubCategory?.subCategoryName}
                    selectedProduct={productSelection.selectedProduct}
                    isLoading={terminal.loading}
                  />
                </ErrorBoundary>

                {!modals.isCartOpen && (
                  <PosMobileCartButton itemCount={terminal.itemCount} onOpen={() => modals.setIsCartOpen(true)} />
                )}
              </div>

              <PosActionButtons
                onClearCart={handleRequestClearCart}
                onCustomer={() => {
                  if (isCreditProviderActive) {
                    showToast(
                      "Customer is locked to configured Post Account for Credit Provider orders",
                      "warning"
                    );
                    return;
                  }
                  modals.setIsCustomerModalOpen(true);
                }}
                onWaiter={() => modals.setIsWaiterModalOpen(true)}
                selectedWaiterName={terminal.waiterName}
                // Complimentary orders cannot be split / combined. A bill discount is allowed: the split /
                // combine window warns that it will be removed and goes ahead on Yes.
                onSplit={() => {
                  const hasComp = cartIsComplimentary();
                  if (hasComp) {
                    showToast("Split is not allowed for orders with item complimentary.", "error");
                    return;
                  }
                  modals.setIsSplitOpen(true);
                }}
                onCombine={() => {
                  const hasComp = cartIsComplimentary();
                  if (hasComp) {
                    showToast("Combine is not allowed for orders with item complimentary.", "error");
                    return;
                  }
                  modals.setIsCombineOpen(true);
                }}
                onRecall={() => {
                  requestAuthorization({
                    actionLabel: "Recall",
                    permissionId: 6,
                    onAuthorized: (authEmpId: number) => {
                      modals.setRecallEmployeeId(authEmpId || null);
                      modals.setIsRecallModalOpen(true);
                    },
                  });
                }}
                onMore={() => modals.setIsMoreModalOpen(true)}
                isOrderEditing={!!terminal.editingOrderId}
                isCustomerLocked={isCreditProviderActive}
                selectedCustomerName={selectedCustomerName}
                selectedCustomerId={terminal.selectedCustomerId}
              />
            </div>
          </main>
        </div>

        <PosCartPanel
          isCartOpen={modals.isCartOpen}
          setIsCartOpen={modals.setIsCartOpen}
          selectedKey={selectedKey}
          cartDetails={terminal.cartDetails}
          subtotal={terminal.subtotal}
          discount={terminal.discount}
          netValue={terminal.netValue}
          tax={terminal.tax}
          charges={terminal.charges}
          total={terminal.total}
          totalExtras={terminal.totalExtras}
          baseSubtotal={terminal.baseSubtotal}
          deliveryCharge={deliveryCharge}
          isDelivery={isDelivery}
          isSettling={isSettling}
          setSelectedKey={setSelectedKey}
          incrementItem={terminal.incrementItem}
          handleDecrementItem={voidFlow.handleDecrementItem}
          handleRemoveItem={voidFlow.handleRemoveItem}
          setExtrasModifierType={setExtrasModifierType}
          showToast={showToast}
          openQtyModal={openQtyModal}
          handleOrder={stableHandleOrder}
          handleSettle={stableHandleSettle}
          orderLoading={terminal.orderLoading}
          isSettledEdit={isSettledEdit}
          editingSaleId={editingSaleId}
          onCancelSettledEdit={handleClearCart}
          selectedTender={selectedTender}
          setSelectedTender={setSelectedTender}
          setIsMultiPayModalOpen={modals.setIsMultiPayModalOpen}
          setIsCashModalOpen={modals.setIsCashModalOpen}
          setIsDeliveryChargeModalOpen={modals.setIsDeliveryChargeModalOpen}
          tenderOptions={terminal.tenderOptions}
          selectedCustomerId={terminal.selectedCustomerId}
          selectedAddressId={terminal.selectedAddressId}
          onPrice={openPriceModal}
          onDiscount={discountFlow.openDiscountChoice}
          onMessage={() => {
            if (!selectedKey) {
              showToast("Please select an item in the cart first", "warning");
              return;
            }
            modals.setIsMessageModalOpen(true);
          }}
          onCom={handleItemComplimentary}
        />
      </div>

      <PosTerminalModals
        modals={modals}
        dispatch={dispatch}
        navigate={navigate}
        showToast={showToast}
        requestAuthorization={requestAuthorization}
        cartDetails={terminal.cartDetails}
        selectedKey={selectedKey}
        setSelectedKey={setSelectedKey}
        currentItem={currentSelectedItem}
        currentSelectedItem={currentSelectedItem}
        subtotal={terminal.subtotal}
        total={terminal.total}
        deliveryCharge={deliveryCharge}
        billDiscountValue={billDiscountValue}
        openDiscountInput={discountFlow.openDiscountInput}
        handleApplyDiscount={discountFlow.handleApplyDiscount}
        handlePriceModalClose={handlePriceModalClose}
        handleApplyPrice={handleApplyPrice as any}
        handleApplyQty={handleApplyQty as any}
        setItemCustomizations={terminal.setItemCustomizations}
        splitCartLine={terminal.splitCartLine}
        handleItemComplimentary={handleItemComplimentary}
        handleBillComplimentary={handleBillComplimentary}
        handleClearCart={handleClearCart}
        handleCompleteSettlement={checkoutFlow.handleCompleteSettlement}
        resetTerminalState={resetTerminalState}
        setActiveProvider={setActiveProvider}
        activeProviderId={activeProvider?.provider?.providerId ?? null}
        refreshLockedProducts={terminal.refreshLockedProducts}
        discountStep={discountFlow.discountStep}
        setDiscountStep={discountFlow.setDiscountStep}
        discountType={discountFlow.discountType}
        discountMode={discountFlow.discountMode}
        setDiscountMode={discountFlow.setDiscountMode}
        extrasModifierType={extrasModifierType}
        setExtrasModifierType={setExtrasModifierType}
        voidConfirmState={voidFlow.voidConfirmState}
        setVoidConfirmState={voidFlow.setVoidConfirmState}
        billDiscountConfirmState={discountFlow.billDiscountConfirmState}
        setBillDiscountConfirmState={discountFlow.setBillDiscountConfirmState}
        setBillDiscount={terminal.setBillDiscount}
        clearAllItemDiscounts={() => dispatch(clearAllItemDiscounts())}
        setCustomDeliveryCharge={(val) => dispatch(setCustomDeliveryCharge(val))}
        isClearConfirmOpen={isClearConfirmOpen}
        setIsClearConfirmOpen={setIsClearConfirmOpen}
        editingOrderId={terminal.editingOrderId}
        selectedProviderForOrder={selectedProviderForOrder}
        setSelectedProviderForOrder={setSelectedProviderForOrder}
        orderLoading={terminal.orderLoading}
        tenderOptions={terminal.tenderOptions}
        selectedCustomerId={terminal.selectedCustomerId}
        onBeforeSettle={() => {
          settleShouldPrintRef.current = true;
        }}
        onCancelSettle={() => {
          checkoutFlow.setSettlementEmployeeId(null);
          settleShouldPrintRef.current = false;
        }}
      />

      <SettlePrintPrompt {...checkoutFlow.settlePrintPromptProps} />

      <EmployeePasswordModal
        key={authorizationModalKey}
        {...authorizationModalProps}
      />
    </div>
  );
};
