import { useState, useEffect, useMemo, useRef } from "react";
import { useEvent } from "../../../../hooks/useEvent";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../../../app/hooks";
import PosTopNav from "../components/layout/PosTopNav";
import PosCategoryRail from "../components/menu/PosCategoryRail";
import PosGroupTabs from "../components/layout/PosGroupTabs";
import { PosCartPanel } from "../components/cart/PosCartPanel";

import PosProductGrid from "../components/menu/PosProductGrid";
import { usePosTerminal } from "../hooks/usePosTerminal";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import { usePosShortcuts } from "../hooks/usePosShortcuts";
import { salesInvoiceApi } from "../../services/salesInvoiceApi";
import { PosDiscountChoiceModal } from "../components/modals/cart/PosDiscountChoiceModal";
import { PosDiscountKeypadModal } from "../components/modals/cart/PosDiscountKeypadModal";
import { PosPriceKeypadModal } from "../components/modals/cart/PosPriceKeypadModal";
import { PosQtyKeypadModal } from "../components/modals/cart/PosQtyKeypadModal";
import { clearAllItemDiscounts, setCustomDeliveryCharge } from "../store/posSlice";
import { selectDeliveryCharge } from "../store/posSelectors";
import { PosDeliveryChargeModal } from "../components/modals/payment/PosDeliveryChargeModal";
import { formatCurrency } from "../../../../utils/formatters";
import type { PosProduct, PosAlternative } from "../../types";
import { ConfirmDialog } from "../../../../components/common";
import ErrorBoundary from "../../../../components/common/ErrorBoundary";
import { menuApi } from "../../services/menuApi";
import { PosMoreModal } from "../components/modals/system/PosMoreModal";
import { PosReportModal } from "../components/modals/system/PosReportModal";
import { PosSettledModal } from "../components/modals/system/PosSettledModal";
import { PosCashTenderModal } from "../components/modals/payment/PosCashTenderModal";
import { PosMultiPayModal } from "../components/modals/payment/PosMultiPayModal";
import { PosCustomerModal } from "../../customer/components/PosCustomerModal";
import { PosExtrasModifierModal } from "../components/modals/product/PosExtrasModifierModal";
import { PosDeliveryModal } from "../../customer/components/PosDeliveryModal";
import { PosDriveThroughModal } from "../../customer/components/PosDriveThroughModal";
import { PosRecallModal } from "../components/modals/order/PosRecallModal";
import { PosVoidModal } from "../components/modals/order/PosVoidModal";
import { EmployeePasswordModal } from "../components/modals/system/EmployeePasswordModal";
import LockItemModal from "../../lockItem/components/LockItemModal";
import { PosProviderModal } from "../components/modals/providers/PosProviderModal";
import { PosProviderOrderModal } from "../components/modals/providers/PosProviderOrderModal";
import { PosCombineModal } from "../components/modals/order/PosCombineModal";
import { PosSplitModal } from "../components/modals/order/PosSplitModal";
import { useCashierLog } from "../../cashier";
import type { MenuProvider } from "../../types";
import { useToast } from "../../../../app/providers/useToast";
import { POS_CONFIGS_STORAGE_KEY, posConfigApi, type RuntimePosConfig } from "../../services/posConfigApi";
import { useEmployeeAuthorization } from "../hooks/useEmployeeAuthorization";
import { useCurrency } from "../../../../hooks/useCurrency";
import { clearAllPosCache, alternativesCache, productDataCache } from "../hooks/usePosProducts";

export const PosTerminalPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
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
  const [selectedProviderForOrder, setSelectedProviderForOrder] = useState<MenuProvider | null>(null);
  const [activeProvider, setActiveProvider] = useState<{ provider: MenuProvider; orderNo: string } | null>(null);
  const { status, isLoading } = useCashierLog();
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const { showToast } = useToast();
  const { authorizationModalKey, authorizationModalProps, requestAuthorization } = useEmployeeAuthorization();
  const { decimalPart } = useCurrency();

  // Alternative selection state
  const [selectedProduct, setSelectedProduct] = useState<PosProduct | null>(null);
  const [alternatives, setAlternatives] = useState<PosAlternative[]>([]);
  const [fetchingAlts, setFetchingAlts] = useState(false);

  // Row selection state
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Discount Flow States
  const [discountStep, setDiscountStep] = useState<'none' | 'choice' | 'value'>('none');
  const [discountType, setDiscountType] = useState<'bill' | 'item'>('bill');
  const [discountMode, setDiscountMode] = useState<'percentage' | 'amount'>('percentage');
  const [billDiscountConfirmState, setBillDiscountConfirmState] = useState<{
    isOpen: boolean;
    value: number;
    mode: 'percentage' | 'amount';
  }>({ isOpen: false, value: 0, mode: 'percentage' });

  // Price Flow States
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);

  // Quantity Flow States
  const [isQtyModalOpen, setIsQtyModalOpen] = useState(false);

  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isMultiPayModalOpen, setIsMultiPayModalOpen] = useState(false);
  const [selectedTender, setSelectedTender] = useState<string>("");
  const [settledPrintPayload, setSettledPrintPayload] = useState<{ mappedItems: any[], printData: any } | null>(null);
  const [isSettledModalOpen, setIsSettledModalOpen] = useState(false);
  const [isSettledAuthOpen, setIsSettledAuthOpen] = useState(false);

  // Extras & Modifiers Flow States
  const [extrasModifierType, setExtrasModifierType] = useState<'none' | 'extras' | 'modifiers'>('none');

  // Void Confirmation Modal State
  const [voidConfirmState, setVoidConfirmState] = useState<{
    isOpen: boolean;
    uniqueId: string;
    productName: string;
    onConfirmed: () => void;
  }>({
    isOpen: false,
    uniqueId: "",
    productName: "",
    onConfirmed: () => {},
  });

  useEffect(() => {
    const state = location.state as { openMoreModal?: boolean; openCashModal?: boolean };
    
    if (state?.openMoreModal) {
      setIsMoreModalOpen(true);
      window.history.replaceState({}, document.title);
    }
    
    if (state?.openCashModal) {
      setIsCashModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);



  // Keep POS config loaded in background
  const {
    groups,
    categories,
    subCategories,
    activeGroupId,
    activeCategoryId,
    activeSubCategoryId,
    cartDetails,
    itemCount,
    search,
    subtotal,
    discount,
    tax,
    charges,
    total,
    totalExtras,
    baseSubtotal,
    orderTypes,
    selectedOrderTypeId,
    setSelectedOrderType,
    visibleProducts,
    setGroup,
    setCategory,
    setSubCategory,
    setSearch,
    addProduct,
    addProductBySku,
    clearCart,
    decrementItem,
    incrementItem,
    removeItem,
    setBillDiscount,
    setItemDiscount,
    updateItemPrice,
    updateItemQty,
    setItemCustomizations,
    orderLoading,
    submitOrder,
    setChange,
    editingOrderId,
    addVoidProduct,
    addVoidModifier,
    getDirectSettleOrderPayload,
    refreshLockedProducts,
    tenderOptions,
  } = usePosTerminal();

  useEffect(() => {
    if (tenderOptions.length > 0 && !selectedTender) {
      setSelectedTender(tenderOptions[0].id);
    }
  }, [tenderOptions, selectedTender]);

  const billDiscountValue = useAppSelector((state) => state.pos.billDiscountValue);
  const { productCache } = useAppSelector((state) => state.pos);

  const isSettling = useAppSelector((state) => state.pos.isSettling);
  const deliveryCharge = useAppSelector(selectDeliveryCharge);
  const selectedOrderTypeName = useAppSelector((state) => state.pos.selectedOrderTypeName);
  const isDelivery = selectedOrderTypeId === 4 || (selectedOrderTypeName || "").toLowerCase().replace(/[\s_-]/g, "").includes("delivery");
  const isSettledEdit = useAppSelector((state) => state.pos.isSettledEdit);
  const isCartModified = useAppSelector((state) => state.pos.isCartModified);
  const editingSaleId = useAppSelector((state) => state.pos.editingSaleId);

  const activeCategory = categories.find(c => c.id === activeCategoryId);
  const activeSubCategory = subCategories.find(s => s.subCategoryId === activeSubCategoryId);
  const currentItem = selectedKey ? cartDetails.find((item) => item.uniqueId === selectedKey) : null;

  const settleShouldPrintRef = useRef(false);

  const readStoredPosConfig = (): RuntimePosConfig | null => {
    const savedConfig = localStorage.getItem(POS_CONFIGS_STORAGE_KEY);
    if (!savedConfig) return null;
  
    try {
      const parsed = JSON.parse(savedConfig) as { configs?: RuntimePosConfig };
      return parsed.configs ?? null;
    } catch {
      localStorage.removeItem(POS_CONFIGS_STORAGE_KEY);
      return null;
    }
  };

  const getRuntimePosConfig = async (): Promise<RuntimePosConfig | null> => {
    const storedConfig = readStoredPosConfig();
    if (storedConfig?.defaultEmployee !== undefined && storedConfig.employeeId !== undefined) {
      return storedConfig;
    }

    const branchId = Number(localStorage.getItem("systemBranchId")) || 0;
    if (!branchId) return storedConfig;

    const response = await posConfigApi.getPosConfig(branchId);
    if (response.isSuccess && response.data) {
      localStorage.setItem(POS_CONFIGS_STORAGE_KEY, JSON.stringify(response.data));
      return response.data.configs;
    }

    return storedConfig;
  };

  // Reset alternatives and selectedProduct when activeGroupId, activeCategoryId, activeSubCategoryId, or search changes
  useEffect(() => {
    setAlternatives([]);
    setSelectedProduct(null);
  }, [activeGroupId, activeCategoryId, activeSubCategoryId, search]);

  const resetTerminalState = () => {
    clearCart();
    setSelectedKey(null);
    setSelectedProduct(null);
    setAlternatives([]);
    if (groups && groups.length > 0) {
      setGroup(groups[0].groupId);
    }
    setSearch("");
  };

  const handleClearCart = () => {
    clearAllPosCache(); // wipe all product/alt caches so next load gets fresh data from API
    resetTerminalState();
    setActiveProvider(null);
  };

  const handleRemoveItem = (uniqueId: string) => {
    const item = cartDetails.find((i) => i.uniqueId === uniqueId);
    if (!item) return;

    if (editingOrderId && item.isExisting) {
      requestAuthorization({
        actionLabel: "Void Item",
        onAuthorized: () => {
          setVoidConfirmState({
            isOpen: true,
            uniqueId,
            productName: item.product?.name || `Product #${item.productId}`,
            onConfirmed: () => {
              const unitId = item.product?.unitId || 1;
              const mapId = item.mapId || 0;
              addVoidProduct({
                productId: item.productId,
                productName: item.product?.name || `Product #${item.productId}`,
                unitId,
                qty: item.quantity,
                amount: Number(((item.price || 0) * item.quantity).toFixed(decimalPart)),
                mapId,
              });

              // Add modifiers/extras to voidModifiers
              const allModifiers = [
                ...(item.extras || []),
                ...(item.modifiers || [])
              ];

              allModifiers.forEach((mod) => {
                const modPrice = (mod as any).price || 0;
                addVoidModifier({
                  mapId,
                  modifierId: mod.id,
                  qty: mod.qty,
                  amount: Number((modPrice * mod.qty).toFixed(decimalPart)),
                  typeId: (mod as any).typeId || 1
                });
              });

              removeItem(uniqueId);
              if (selectedKey === uniqueId) {
                setSelectedKey(null);
              }
              showToast(`Voided ${item.product?.name || `Product #${item.productId}`}`, "success");
            }
          });
        },
      });
    } else {
      removeItem(uniqueId);
      if (selectedKey === uniqueId) {
        setSelectedKey(null);
      }
    }
  };

  const handleDecrementItem = (uniqueId: string) => {
    const item = cartDetails.find((i) => i.uniqueId === uniqueId);
    if (!item) return;

    if (editingOrderId && item.isExisting) {
      if (item.quantity === 1) {
        handleRemoveItem(uniqueId);
        return;
      }

      requestAuthorization({
        actionLabel: "Void Item",
        onAuthorized: () => {
          const unitId = item.product?.unitId || 1;
          const mapId = item.mapId || 0;
          
          addVoidProduct({
            productId: item.productId,
            productName: item.product?.name || `Product #${item.productId}`,
            unitId,
            qty: 1,
            amount: Number((item.price || 0).toFixed(decimalPart)),
            mapId,
          });

          decrementItem(uniqueId);
          showToast(`Decremented quantity for ${item.product?.name || `Product #${item.productId}`}`, "success");
        },
      });
    } else {
      decrementItem(uniqueId);
    }
  };

  // Handle Order Submission
  const submitOrderForEmployee = async (employeeId: number, shouldPrint: boolean = true) => {
    if (!status) return;
    const orderId = await submitOrder({
      dayId: status.dayId,
      shiftId: status.shiftId,
      userId: status.userId,
      employeeId,
      providerId: activeProvider?.provider.providerId,
      providerOrderNo: activeProvider?.orderNo,
    }, shouldPrint);
    if (orderId) {
      setSelectedKey(null);
      setSelectedProduct(null);
      setAlternatives([]);
      setActiveProvider(null);
      setIsCashModalOpen(false);
      setIsMultiPayModalOpen(false);
    }
  };

  // Handle Settlement Completion (Actual Flow - DIRECT SETTLE)
  const submitSettlementForEmployee = async (employeeId: number, payments: { paymodeId: number, amount: number }[]) => {
    if (!status) return;
    
    const orderPayload = getDirectSettleOrderPayload({
      employeeId,
      providerOrderNo: activeProvider?.orderNo,
    });

    const isOrderEdited = !editingOrderId || isCartModified;

    try {
      const salesPayload: any = {
        seriesId: 1,
        prefix: "",
        customerId: orderPayload.customerId,
        paymodeId: payments.length > 1 ? 3 : (payments.length > 0 ? payments[0].paymodeId : 1),
        employeeId: orderPayload.employeeId,
        dayId: status.dayId,
        shiftId: status.shiftId,
        orderTypeId: orderPayload.orderTypeId,
        androidStatus: false,
        saleId: editingSaleId || 0,
        orderId: orderPayload.orderId,
        orderMaster: {
          isOrderEdited,
          sectionId: orderPayload.sectionId,
          tableId: orderPayload.tableId,
          guestNo: orderPayload.guestNo,
          vehicleCustomerName: orderPayload.vehicleCustomerName,
          vehicleNo: orderPayload.vehicleNo,
          addressId: orderPayload.addressId,
          missedCall: orderPayload.missedCall,
          contactNo: orderPayload.contactNo,
          note: orderPayload.note,
          change: orderPayload.change,
          isComing: orderPayload.isComing,
          comingTime: orderPayload.comingTime,
          providerNo: orderPayload.providerNo,
        },
        combinedOrderIds: orderPayload.combinedOrderIds,
        modifiers: orderPayload.modifiers,
        voidProducts: orderPayload.voidProducts,
        voidModifiers: orderPayload.voidModifiers,
        voucherDate: new Date().toISOString(),
        discAmount: orderPayload.discAmount,
        discPer: orderPayload.discPer,
        serviceCharge: orderPayload.serviceCharge,
        levy: orderPayload.levy,
        vatExclAmount: orderPayload.vatExclAmount,
        vatAmount: orderPayload.vatAmount,
        netAmount: orderPayload.netAmount,
        deliveryCharge: orderPayload.deliveryCharge,
        createdAt: new Date().toISOString(),
        details: orderPayload.details.map((d: any) => ({
          productId: d.productId,
          unitId: d.unitId,
          vatId: d.vatId,
          qty: d.qty,
          price: d.price,
          discPer: d.discPer,
          discAmount: d.discAmount,
          serviceCharge: d.serviceCharge,
          levy: d.levy,
          vatAmount: d.vatAmount,
          netAmount: d.netAmount,
          baseQty: d.baseQty,
          mapId: d.mapId,
          complimentaryStatus: d.complimentaryStatus || false
        })),
        paymodes: payments
      };

      let success = false;
      let newSaleId: number | null = null;
      if (editingSaleId) {
        success = await salesInvoiceApi.updateSalesInvoice(editingSaleId, salesPayload);
      } else {
        newSaleId = await salesInvoiceApi.createSalesInvoice(salesPayload);
        success = !!newSaleId;
      }

      if (success) {
        setIsCashModalOpen(false);
        setIsMultiPayModalOpen(false);
        
        // Prepare print payload from frontend state
        const finalSaleId = newSaleId || editingSaleId || 0;
        const now = new Date();
        const paymentNames: Record<number, string> = { 1: "Cash", 2: "Card", 3: "Credit" };
        const orderTypesMap: Record<number, string> = {
          1: "DINE IN", 2: "TAKE OUT", 3: "DRIVE THRU", 4: "DELIVERY", 5: "PROVIDERS", 6: "COMING"
        };
        const mappedOrderType = orderTypesMap[orderPayload.orderTypeId] || "DINE IN";
        
        const printPayloadObj = {
          mappedItems: cartDetails,
          printData: {
            orderNo: finalSaleId.toString(),
            ticketNo: finalSaleId.toString(),
            waiter: String(employeeId),
            counter: "Main",
            section: orderPayload.sectionId ? String(orderPayload.sectionId) : mappedOrderType,
            table: orderPayload.tableId ? String(orderPayload.tableId) : "",
            orderType: mappedOrderType,
            date: now.toLocaleDateString('en-GB'),
            time: now.toLocaleTimeString('en-US'),
            customerName: orderPayload.vehicleCustomerName || "",
            vehicleNo: orderPayload.vehicleNo || "",
            contactNo: orderPayload.contactNo || "",
            flatNo: orderPayload.addressId ? "" : "", // we might not have detailed address flatNo in local state if it's just addressId, but we can try
            subTotal: orderPayload.vatExclAmount,
            deliveryCharge: orderPayload.deliveryCharge || 0,
            serviceCharge: orderPayload.serviceCharge || 0,
            levy: orderPayload.levy || 0,
            vatAmount: orderPayload.vatAmount || 0,
            netAmount: orderPayload.netAmount || 0,
            enableVat: (readStoredPosConfig() as any)?.enableVat === true,
            payments: payments.map(p => ({ name: paymentNames[p.paymodeId] || "Payment", amount: p.amount })),
            changeAmount: Number(orderPayload.change) || 0,
            isSettlement: true
          }
        };

        setSettledPrintPayload(printPayloadObj);
        finalizeSettlement(settleShouldPrintRef.current, printPayloadObj);
      } else {
        throw new Error("Invalid sales response");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save sales invoice", "error");
    }
  };

  const finalizeSettlement = async (shouldPrint: boolean, payloadToPrint?: any) => {
    const payload = payloadToPrint || settledPrintPayload;
    if (shouldPrint && payload) {
      showToast("Printing receipt...", "info");
      try {
        const { printerSettingsApi } = await import("../../services/printerSettingsApi");
        const { printHtmlReceipt } = await import("../../services/qzService");
        const { generateGuestPrintHtml } = await import("../../utils/guestPrintTemplate");
        
        let targetPrinter: string | undefined;
        try {
          const printerSettingsResponse = await printerSettingsApi.getGeneral();
          targetPrinter = printerSettingsResponse?.data?.billPrinter;
        } catch {}

        // Determine enableVat dynamically based on configs
        const getVatStatus = (): boolean => {
          try {
            const saved = localStorage.getItem('posConfigs');
            const full = saved ? JSON.parse(saved) : {};
            return full?.configs?.VatStatus === true;
          } catch {
            return false;
          }
        };
        const enableVat = getVatStatus();
        payload.printData.enableVat = enableVat;

        const html = generateGuestPrintHtml(payload.mappedItems, payload.printData);
        await printHtmlReceipt(html, targetPrinter);
      } catch (printErr: any) {
        console.error("Settled print failed:", printErr);
        showToast("Order settled, but printing failed", "warning");
      }
    }
    showToast("Sales saved successfully", "success");
    handleClearCart();
    setSettledPrintPayload(null);
  };

  // Handle Completing Settlement for Cash or Multi-pay
  const handleCompleteSettlement = async (payments: { paymodeId: number, amount: number }[], changeAmount: number) => {
    setChange(changeAmount.toFixed(decimalPart));

    if (!status) return;

    let config: RuntimePosConfig | null = null;
    try {
      config = await getRuntimePosConfig();
    } catch {
      showToast("Unable to load POS configuration", "error");
      return;
    }

    const defaultEmployeeEnabled = config?.defaultEmployee === "Enable";
    const defaultEmployeeId = Number(config?.employeeId ?? 0);

    if (defaultEmployeeEnabled) {
      if (!Number.isFinite(defaultEmployeeId) || defaultEmployeeId <= 0) {
        showToast("Default employee is not configured", "error");
        return;
      }

      submitSettlementForEmployee(defaultEmployeeId, payments);
      return;
    }

    requestAuthorization({
      actionLabel: "Settlement",
      onAuthorized: (employeeId) => submitSettlementForEmployee(employeeId, payments),
    });
  };

  // Handle Card or Credit Settlement
  const handleCardCreditSettlement = async () => {
    setChange("");

    if (!status) return;

    let config: RuntimePosConfig | null = null;
    try {
      config = await getRuntimePosConfig();
    } catch {
      showToast("Unable to load POS configuration", "error");
      return;
    }

    const defaultEmployeeEnabled = config?.defaultEmployee === "Enable";
    const defaultEmployeeId = Number(config?.employeeId ?? 0);
    const payments = [{ paymodeId: Number(selectedTender), amount: total }];

    if (defaultEmployeeEnabled) {
      if (!Number.isFinite(defaultEmployeeId) || defaultEmployeeId <= 0) {
        showToast("Default employee is not configured", "error");
        return;
      }

      submitSettlementForEmployee(defaultEmployeeId, payments);
      return;
    }

    requestAuthorization({
      actionLabel: "Settlement",
      onAuthorized: (employeeId) => submitSettlementForEmployee(employeeId, payments),
    });
  };

  // Handle Order Settlement
  const handleSettle = (shouldPrint: boolean) => {
    if (itemCount === 0) {
      showToast("Cart is empty", "warning");
      return;
    }
    
    settleShouldPrintRef.current = shouldPrint;
    
    const selectedMode = tenderOptions.find(t => t.id === selectedTender)?.label?.toLowerCase() || '';
    
    if (selectedMode.includes("cash")) {
      setIsCashModalOpen(true);
    } else if (selectedMode.includes("multi")) {
      setIsMultiPayModalOpen(true);
    } else {
      // For Card or Credit, handle card/credit settlement (dummy flow)
      handleCardCreditSettlement();
    }
  };

  // Handle Order Submission
  const handleOrder = async (shouldPrint: boolean) => {
    if (itemCount === 0) {
      showToast("Cart is empty", "warning");
      return;
    }

    if (!status) return;

    let config: RuntimePosConfig | null = null;
    try {
      config = await getRuntimePosConfig();
    } catch {
      showToast("Unable to load POS configuration", "error");
      return;
    }

    const defaultEmployeeEnabled = config?.defaultEmployee === "Enable";
    const defaultEmployeeId = Number(config?.employeeId ?? 0);

    if (defaultEmployeeEnabled) {
      if (!Number.isFinite(defaultEmployeeId) || defaultEmployeeId <= 0) {
        showToast("Default employee is not configured", "error");
        return;
      }

      await submitOrderForEmployee(defaultEmployeeId, shouldPrint);
      return;
    }

    requestAuthorization({
      actionLabel: "Order",
      onAuthorized: (empId) => submitOrderForEmployee(empId, shouldPrint),
    });
  };

  // Handle product click - check for alternatives
  const handleProductSelect = async (productId: number) => {
    const product = visibleProducts.find(p => p.id === productId);
    if (!product) return;

    if (!product.hasAlternatives) {
      const safeOrderTypeId = selectedOrderTypeId || 1;
      const cacheKey = `${productId}-${safeOrderTypeId}`;
      let cachedData = productDataCache[cacheKey];

      if (!cachedData) {
        try {
          cachedData = await menuApi.getProductData(productId, safeOrderTypeId);
          productDataCache[cacheKey] = cachedData;
        } catch (err) {
          console.error("Failed to fetch product data", err);
        }
      }

      let isIncl = product.isIncl;
      let targetPrice = product.price ?? 0;
      let promoPrice: number | undefined = undefined;

      if (cachedData) {
        isIncl = cachedData.isIncl;
        targetPrice = cachedData.price;
        promoPrice = cachedData.promoPrice;
      }

      let discountValue: number | undefined = undefined;
      let discountType: 'percentage' | 'amount' | undefined = undefined;

      if (promoPrice !== undefined && promoPrice > 0 && targetPrice > 0) {
        const diff = targetPrice - promoPrice;
        if (diff > 0) {
          discountValue = Number(((diff / targetPrice) * 100).toFixed(4));
          discountType = 'percentage';
        }
        if (cachedData && cachedData.promoIsIncl !== undefined) {
          isIncl = cachedData.promoIsIncl;
        }
      }

      const newKey = addProduct(productId, undefined, targetPrice, isIncl, discountValue, discountType);
      setSelectedKey(newKey);
      if (targetPrice === 0) {
        setIsPriceModalOpen(true);
      }
      return;
    }

    // It has alternatives, fetch them
    const safeOrderTypeId = selectedOrderTypeId || 1;
    const altsCacheKey = `${productId}-${safeOrderTypeId}`;
    const cachedAlts = alternativesCache[altsCacheKey];

    if (cachedAlts && cachedAlts.length > 0) {
      setAlternatives(cachedAlts);
      setSelectedProduct(product);
    } else {
      setFetchingAlts(true);
      try {
        const alts = await menuApi.getAlternatives(productId, safeOrderTypeId);
        if (alts && alts.length > 0) {
          alternativesCache[altsCacheKey] = alts;
          setAlternatives(alts);
          setSelectedProduct(product);
        } else {
          // Fallback if backend lied about hasAlternatives
          let isIncl = product.isIncl;
          let targetPrice = product.price ?? 0;
          let promoPrice: number | undefined = undefined;

          const cacheKey = `${productId}-${safeOrderTypeId}`;
          let cachedData = productDataCache[cacheKey];
          if (!cachedData) {
            try {
              cachedData = await menuApi.getProductData(productId, safeOrderTypeId);
              productDataCache[cacheKey] = cachedData;
            } catch(e) {}
          }

          if (cachedData) {
            isIncl = cachedData.isIncl;
            targetPrice = cachedData.price;
            promoPrice = cachedData.promoPrice;
          }

          let discountValue: number | undefined = undefined;
          let discountType: 'percentage' | 'amount' | undefined = undefined;

          if (promoPrice !== undefined && promoPrice > 0 && targetPrice > 0) {
            const diff = targetPrice - promoPrice;
            if (diff > 0) {
              discountValue = Number(((diff / targetPrice) * 100).toFixed(4));
              discountType = 'percentage';
            }
            if (cachedData && cachedData.promoIsIncl !== undefined) {
              isIncl = cachedData.promoIsIncl;
            }
          }

          const newKey = addProduct(productId, undefined, targetPrice, isIncl, discountValue, discountType);
          setSelectedKey(newKey);
          if (targetPrice === 0) {
            setIsPriceModalOpen(true);
          }
        }
      } catch {
        let isIncl = product.isIncl;
        let targetPrice = product.price ?? 0;
        let promoPrice: number | undefined = undefined;

        const cacheKey = `${productId}-${safeOrderTypeId}`;
        let cachedData = productDataCache[cacheKey];
        if (!cachedData) {
          try {
            cachedData = await menuApi.getProductData(productId, safeOrderTypeId);
            productDataCache[cacheKey] = cachedData;
          } catch(e) {}
        }

        if (cachedData) {
          isIncl = cachedData.isIncl;
          targetPrice = cachedData.price;
          promoPrice = cachedData.promoPrice;
        }

        let discountValue: number | undefined = undefined;
        let discountType: 'percentage' | 'amount' | undefined = undefined;

        if (promoPrice !== undefined && promoPrice > 0 && targetPrice > 0) {
          const diff = targetPrice - promoPrice;
          if (diff > 0) {
            discountValue = Number(((diff / targetPrice) * 100).toFixed(4));
            discountType = 'percentage';
          }
          if (cachedData && cachedData.promoIsIncl !== undefined) {
            isIncl = cachedData.promoIsIncl;
          }
        }

        const newKey = addProduct(productId, undefined, targetPrice, isIncl, discountValue, discountType);
        setSelectedKey(newKey);
      } finally {
        setFetchingAlts(false);
      }
    }
  };

  const handleAltSelect = (variant: PosAlternative) => {
    if (selectedProduct) {
      let discountValue: number | undefined = undefined;
      let discountType: 'percentage' | 'amount' | undefined = undefined;
      let isIncl = variant.isIncl;

      if (variant.promoPrice !== undefined && variant.promoPrice > 0 && variant.price > 0) {
        const diff = variant.price - variant.promoPrice;
        if (diff > 0) {
          discountValue = Number(((diff / variant.price) * 100).toFixed(4));
          discountType = 'percentage';
        }
        if (variant.promoIsIncl !== undefined) {
          isIncl = variant.promoIsIncl;
        }
      }

      const newKey = addProduct(
        selectedProduct.id,
        variant.altName,
        variant.price,
        isIncl,
        discountValue,
        discountType
      );
      setSelectedKey(newKey);
      if (variant.price === 0) {
        setIsPriceModalOpen(true);
      }
    }
  };

  const handleGridBack = () => {
    if (alternatives.length > 0) {
      setAlternatives([]);
      setSelectedProduct(null);
    } else {
      setSubCategory(null);
    }
  };

  // 1. Hardware Barcode Scanner Integration
  useBarcodeScanner(async (barcode) => {
    const cachedProducts = Object.values(productCache || {});
    const product = cachedProducts.find((p) => p.sku?.toLowerCase() === barcode.toLowerCase());
    
    if (!product) return;

    if (product.hasAlternatives) {
      const safeOrderTypeId = selectedOrderTypeId || 1;
      const altsCacheKey = `${product.id}-${safeOrderTypeId}`;
      const cachedAlts = alternativesCache[altsCacheKey];

      if (cachedAlts && cachedAlts.length > 0) {
        setAlternatives(cachedAlts);
        setSelectedProduct(product);
      } else {
        setFetchingAlts(true);
        try {
          const alts = await menuApi.getAlternatives(product.id, safeOrderTypeId);
          if (alts && alts.length > 0) {
            alternativesCache[altsCacheKey] = alts;
            setAlternatives(alts);
            setSelectedProduct(product);
          }
        } catch (err) {
          console.error("Failed to fetch alternatives for scanned product", err);
        } finally {
          setFetchingAlts(false);
        }
      }
    } else {
      const newKey = await addProductBySku(barcode, selectedOrderTypeId || 1);
      if (newKey) {
        setSelectedKey(newKey);
      }
    }
  });

  // 2. Keyboard Hotkeys
  usePosShortcuts({
    onClearCart: handleClearCart,
    onHoldTicket: () => {},
    onCheckout: () => {}
  });

  const handleApplyDiscount = (value: string) => {
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
          ? `Discount percentage would exceed the remaining bill subtotal (${formatCurrency(remainingSubtotal)})`
          : `Discount amount cannot exceed the remaining bill subtotal (${formatCurrency(remainingSubtotal)})`;
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
          if (finalValue > currentItem.amount) {
            showToast(`Discount amount cannot exceed the item amount (${formatCurrency(currentItem.amount)})`, "error");
            return;
          }
        }
      }
      setItemDiscount(selectedKey, finalValue, discountMode);
    }
    setDiscountStep('none');
  };

  const handleApplyPrice = (val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num) && selectedKey) {
      if (num === 0) {
        showToast("Price cannot be zero. Use Item Complimentary.", "error");
        return;
      }
      updateItemPrice(selectedKey, num);
      setIsPriceModalOpen(false);
    }
  };

  const handlePriceModalClose = () => {
    setIsPriceModalOpen(false);
    if (selectedKey) {
      const currentItem = cartDetails.find((item) => item.uniqueId === selectedKey);
      if (currentItem && (currentItem.price === 0 || currentItem.price === undefined) && !(currentItem.discountType === 'percentage' && currentItem.discountValue === 100)) {
        removeItem(selectedKey);
        setSelectedKey(null);
      }
    }
  };

  const handleItemComplimentary = () => {
    if (!selectedKey) {
      showToast("Please select an item first", "error");
      return;
    }
    setItemDiscount(selectedKey, 100, 'percentage');
    showToast("Item marked as complimentary", "success");
  };

  const handleBillComplimentary = () => {
    if (cartDetails.length === 0) {
      showToast("Cart is empty", "error");
      return;
    }
    setBillDiscount(100, 'percentage');
    showToast("Bill marked as complimentary", "success");
  };

  const handleApplyQty = (value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 1) return;

    if (selectedKey) {
      const item = cartDetails.find((i) => i.uniqueId === selectedKey);
      if (item && editingOrderId && item.isExisting) {
        if (numValue < item.quantity) {
          requestAuthorization({
            actionLabel: "Void Item Qty",
            onAuthorized: () => {
              const diff = item.quantity - numValue;
              const unitId = item.product?.unitId || 1;
              const mapId = item.mapId || 0;
              
              addVoidProduct({
                productId: item.productId,
                productName: item.product?.name || `Product #${item.productId}`,
                unitId,
                qty: diff,
                amount: Number(((item.price || 0) * diff).toFixed(decimalPart)),
                mapId,
              });

              updateItemQty(selectedKey, numValue);
              showToast(`Reduced quantity for ${item.product?.name || `Product #${item.productId}`} by ${diff}`, "success");
            },
          });
          setIsQtyModalOpen(false);
          return;
        }
      }
      updateItemQty(selectedKey, numValue);
    }
    setIsQtyModalOpen(false);
  };

  const currentSelectedItem = useMemo(() => {
    if (!selectedKey) return null;
    return cartDetails.find((item) => item.uniqueId === selectedKey);
  }, [selectedKey, cartDetails]);

  const initialSelections = useMemo(() => {
    if (!currentSelectedItem) return [];
    return extrasModifierType === 'extras'
      ? (currentSelectedItem.extras || [])
      : (currentSelectedItem.modifiers || []);
  }, [currentSelectedItem, extrasModifierType]);

  const openPriceModal = () => {
    if (!selectedKey) return;
    setIsPriceModalOpen(true);
  };

  const openQtyModal = () => {
    if (!selectedKey) return;
    setIsQtyModalOpen(true);
  };

  const openDiscountChoice = () => {
    if (itemCount === 0) return;
    setDiscountStep('choice');
  };

  const openDiscountInput = (type: 'bill' | 'item') => {
    if (type === 'item' && billDiscountValue > 0) {
        showToast("Cannot apply item discounts while a bill discount is active", "warning");
        return;
    }
    setDiscountType(type);
    setDiscountStep('value');
  };

  const stableSetCategory = useEvent((id: string) => {
    const parsedId = parseInt(id, 10);
    if (parsedId !== activeCategoryId) {
      setCategory(parsedId);
    } else {
      setSubCategory(null);
      setAlternatives([]);
      setSelectedProduct(null);
    }
  });

  const stableOnLongPress = useEvent((id: number) => {
    setSelectedProductToLock(String(id));
    setIsLockItemModalOpen(true);
  });

  const stableHandleOrder = useEvent((print: boolean) => handleOrder(print));
  const stableHandleSettle = useEvent((print: boolean) => handleSettle(print));

  // Loading state
  if (isLoading && !status) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#fcf9fb]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#49293e]/20 border-t-[#49293e] rounded-full animate-spin" />
          <p className="text-sm font-bold text-[#49293e] uppercase tracking-widest">Checking Cashier Status...</p>
        </div>
      </div>
    );
  }

  if (status && (status.isDayClosed || status.isShiftClosed)) {
    return <Navigate to="/cashier/out" replace />;
  }

  return (
    <div className="flex h-dvh flex-col bg-[#fcf9fb] font-sans text-slate-900 overflow-hidden relative">
      <PosTopNav 
        onNewOrder={handleClearCart} 
        onMore={() => setIsMoreModalOpen(true)} 
        onCustomerMaster={() => setIsCustomerModalOpen(true)}
        onDelivery={() => setIsDeliveryModalOpen(true)}
        onDriveThrough={() => setIsDriveThroughModalOpen(true)}
        onRecall={() => {
          requestAuthorization({
            actionLabel: "Recall",
            onAuthorized: () => setIsRecallModalOpen(true),
          });
        }}
        onVoidOrder={() => setIsVoidModalOpen(true)}
        onProvider={() => setIsProviderModalOpen(true)}
        onCashierOut={() => {
          if (status && (!status.isDayClosed || !status.isShiftClosed)) {
            setIsLogoutConfirmOpen(true);
          } else {
            navigate("/cashier/out");
          }
        }}
        status={status}
        orderTypes={orderTypes}
        selectedOrderTypeId={selectedOrderTypeId}
        onSelectOrderType={(type) => setSelectedOrderType(type.orderTypeId, type.orderType)}
        activeProvider={activeProvider}
      />
      
      <div className="flex flex-col lg:flex-row lg:items-center bg-white border-b border-slate-100 overflow-hidden shrink-0 px-3 lg:px-4 xl:px-6">
        <div className="shrink-0">
          <PosGroupTabs 
            groups={groups} 
            activeGroupId={activeGroupId} 
            onSelect={(id) => {
              if (id !== activeGroupId) {
                setGroup(id);
              }
            }} 
          />
        </div>
        
        <div className="flex-1 flex items-center justify-end py-2 lg:py-1">
          <div className="relative w-full max-w-md group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 group-focus-within:text-[#49293e] transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-10 text-sm font-bold text-slate-700 placeholder:text-slate-400 focus:bg-white focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/10 transition-all outline-none"
            />
          </div>
          
          <div className="hidden lg:flex items-center gap-2 ml-4 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</span>
            <span className="text-sm font-bold text-[#49293e]">{visibleProducts.length}</span>
          </div>
        </div>
      </div>

      {fetchingAlts && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#49293e]/20 border-t-[#49293e] rounded-full animate-spin" />
            <p className="text-xs font-bold text-[#49293e] uppercase tracking-widest">
              Fetching Variations...
            </p>
          </div>
        </div>
      )}

      <main className="flex flex-col flex-1 overflow-hidden md:grid md:grid-cols-[160px_minmax(0,1fr)] lg:grid-cols-[180px_minmax(0,1fr)_370px] xl:grid-cols-[200px_minmax(0,1fr)_460px]">
        {/* Left Column: Categories */}
        <PosCategoryRail
          categories={categories}
          activeCategoryId={activeCategoryId ? activeCategoryId.toString() : ""}
          onSelect={stableSetCategory}
        />

        {/* Middle Column: Grid */}
        <div className="flex flex-col flex-1 overflow-hidden bg-[#fcf9fb] relative">
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <ErrorBoundary name="Product Grid">
              <PosProductGrid
                products={visibleProducts}
                subCategories={subCategories}
                alternatives={alternatives}
                activeSubCategoryId={activeSubCategoryId}
                onSelectSubCategory={setSubCategory}
                onBack={handleGridBack}
                onAdd={handleProductSelect}
                onSelectAlt={handleAltSelect}
                onLongPress={stableOnLongPress}
                categoryName={activeCategory?.name}
                subCategoryName={activeSubCategory?.subCategoryName}
                selectedProduct={selectedProduct}
              />
            </ErrorBoundary>

            {/* Mobile Floating Cart Button */}
            {!isCartOpen && (
              <button
                onClick={() => setIsCartOpen(true)}
                className="lg:hidden absolute bottom-4 right-4 z-40 bg-[#ff9500] hover:bg-[#e68600] text-white p-4 rounded-full shadow-2xl transition-transform active:scale-95 flex items-center justify-center"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                  <path d="M3 6h18" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#fcf9fb]">
                    {itemCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Action Button Bar */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-9 gap-1.5 p-1.5 sm:p-2 bg-white border-t border-slate-100 shrink-0">
            <button className="h-9 lg:h-10 rounded bg-[#ff9500] hover:bg-[#e68600] text-white text-[9px] font-bold uppercase transition-all active:scale-95 shadow-sm" tabIndex={-1}>
              Close
            </button>
            <button
              onClick={handleClearCart}
              className="h-9 lg:h-10 rounded bg-[#ff9500] hover:bg-[#e68600] text-white text-[9px] font-bold uppercase transition-all active:scale-95 shadow-sm"
              tabIndex={-1}
            >
              Clear
            </button>
            <button className="h-9 lg:h-10 rounded bg-[#ff9500] hover:bg-[#e68600] text-white text-[9px] font-bold uppercase transition-all active:scale-95 shadow-sm">
              Waiter
            </button>
            <button
              onClick={() => setIsCombineOpen(true)}
              className="h-9 lg:h-10 rounded bg-[#ff9500] hover:bg-[#e68600] text-white text-[9px] font-bold uppercase transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!editingOrderId}
            >
              Combine
            </button>
            <button
              onClick={() => setIsSplitOpen(true)}
              className="h-9 lg:h-10 rounded bg-[#ff9500] hover:bg-[#e68600] text-white text-[9px] font-bold uppercase transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!editingOrderId}
            >
              Split
            </button>
            <button 
              onClick={openDiscountChoice}
              className="h-9 lg:h-10 rounded bg-[#ff9500] hover:bg-[#e68600] text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={itemCount === 0}
            >
              Discount
            </button>
            <button 
              onClick={openPriceModal}
              className="h-9 lg:h-10 rounded bg-[#ff9500] hover:bg-[#e68600] text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedKey}
            >
              Price
            </button>
            <button className="h-9 lg:h-10 rounded bg-[#ff9500] hover:bg-[#e68600] text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm">
              Note
            </button>
            <button className="h-9 lg:h-10 rounded bg-[#ff9500] hover:bg-[#e68600] text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm">
              More
            </button>
          </div>
        </div>

        <PosCartPanel
              isCartOpen={isCartOpen}
              setIsCartOpen={setIsCartOpen}
              selectedKey={selectedKey}
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
              setSelectedKey={setSelectedKey}
              incrementItem={incrementItem}
              handleDecrementItem={handleDecrementItem}
              handleRemoveItem={handleRemoveItem}
              setExtrasModifierType={setExtrasModifierType}
              showToast={showToast}
              openQtyModal={openQtyModal}
              handleOrder={stableHandleOrder}
              handleSettle={stableHandleSettle}
              orderLoading={orderLoading}
              isSettledEdit={isSettledEdit}
              selectedTender={selectedTender}
              setSelectedTender={setSelectedTender}
              setIsMultiPayModalOpen={setIsMultiPayModalOpen}
              setIsCashModalOpen={setIsCashModalOpen}
              setIsDeliveryChargeModalOpen={setIsDeliveryChargeModalOpen}
              tenderOptions={tenderOptions}
            />
      </main>

      {/* Discount Choice Modal - Clean & Modern */}
      <PosDiscountChoiceModal
        isOpen={discountStep === 'choice'}
        onClose={() => setDiscountStep('none')}
        billDiscountValue={billDiscountValue}
        selectedKey={selectedKey}
        openDiscountInput={openDiscountInput}
        showToast={showToast}
      />

      {/* Modern POS Discount Keypad - Elegant & Standard */}
      <PosDiscountKeypadModal
        isOpen={discountStep === 'value'}
        onClose={() => setDiscountStep('none')}
        discountType={discountType}
        discountMode={discountMode}
        setDiscountMode={setDiscountMode}
        subtotal={subtotal}
        currentItem={currentItem}
        handleApplyDiscount={handleApplyDiscount}
      />

      {/* Modern POS Price Override Modal */}
      <PosPriceKeypadModal
        isOpen={isPriceModalOpen}
        onClose={handlePriceModalClose}
        currentSelectedItem={currentSelectedItem}
        handleApplyPrice={handleApplyPrice}
      />

      {/* Modern POS Qty Override Modal */}
      <PosQtyKeypadModal
        isOpen={isQtyModalOpen}
        onClose={() => setIsQtyModalOpen(false)}
        currentSelectedItem={currentSelectedItem}
        handleApplyQty={handleApplyQty}
      />

      {/* Extras & Modifiers Modal */}
      <PosExtrasModifierModal
        isOpen={extrasModifierType !== 'none'}
        onClose={() => setExtrasModifierType('none')}
        type={extrasModifierType === 'extras' ? 'extras' : 'modifiers'}
        cartItems={cartDetails}
        selectedKey={selectedKey}
        onSelectRow={setSelectedKey}
        initialSelections={initialSelections}
        onDone={(selections) => {
          if (!selectedKey) return;

          if (extrasModifierType === 'extras') {
            setItemCustomizations(selectedKey, selections, currentSelectedItem?.modifiers);
          } else {
            setItemCustomizations(selectedKey, currentSelectedItem?.extras, selections);
          }
          setExtrasModifierType('none');
        }}
      />

      <PosMoreModal 
        isOpen={isMoreModalOpen} 
        onClose={() => setIsMoreModalOpen(false)} 
        onCashierOut={() => {
          setIsMoreModalOpen(false);
          navigate("/cashier/out");
        }}
        onCustomerMaster={() => setIsCustomerModalOpen(true)}
        onItemComplimentary={handleItemComplimentary}
        onBillComplimentary={handleBillComplimentary}
        onSettledOrders={() => setIsSettledAuthOpen(true)}
        onReport={() => setIsReportModalOpen(true)}
      />

      <PosReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />

      <PosCustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
      />
      
      <PosDeliveryModal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
      />

      <PosDeliveryChargeModal
        isOpen={isDeliveryChargeModalOpen}
        onClose={() => setIsDeliveryChargeModalOpen(false)}
        currentCharge={deliveryCharge}
        onSelect={(charge) => dispatch(setCustomDeliveryCharge(charge))}
      />

      <PosDriveThroughModal
        isOpen={isDriveThroughModalOpen}
        onClose={() => setIsDriveThroughModalOpen(false)}
      />

      <PosRecallModal
        isOpen={isRecallModalOpen}
        onClose={() => setIsRecallModalOpen(false)}
        onSettleSuccess={() => {
          // Do not close the recall modal here so it stays in the background
          setReturnToRecallOnCancel(true);
          setIsMultiPayModalOpen(true);
        }}
      />

      <PosSettledModal
        isOpen={isSettledModalOpen}
        onClose={() => setIsSettledModalOpen(false)}
        onEditSuccess={() => setIsSettledModalOpen(false)}
      />

      <PosVoidModal 
        isOpen={isVoidModalOpen}
        onClose={() => setIsVoidModalOpen(false)}
      />

      <PosCombineModal
        isOpen={isCombineOpen}
        onClose={() => setIsCombineOpen(false)}
      />

      <PosSplitModal
        isOpen={isSplitOpen}
        onClose={() => setIsSplitOpen(false)}
        orderId={editingOrderId || 0}
        onSuccess={() => {
          setIsSplitOpen(false);
          handleClearCart();
        }}
      />

      <EmployeePasswordModal key={authorizationModalKey} {...authorizationModalProps} />

      <ConfirmDialog
        isOpen={isLogoutConfirmOpen}
        onCancel={() => setIsLogoutConfirmOpen(false)}
        onConfirm={() => navigate("/cashier/out")}
        title="Confirm Exit"
        message="Are you sure you want to exit the terminal? Your current session is still active."
        confirmLabel="Logout"
      />

      <ConfirmDialog
        isOpen={voidConfirmState.isOpen}
        onCancel={() => setVoidConfirmState(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          voidConfirmState.onConfirmed();
          setVoidConfirmState(prev => ({ ...prev, isOpen: false }));
        }}
        title="Confirm Void"
        message={`Are you sure you want to void "${voidConfirmState.productName}"?`}
        confirmLabel="Void"
        confirmVariant="danger"
      />

      <ConfirmDialog
        isOpen={billDiscountConfirmState.isOpen}
        title="Override Item Discounts?"
        message="Applying a bill-level discount will remove all existing item-level discounts. Do you want to proceed?"
        onConfirm={() => {
          dispatch(clearAllItemDiscounts());
          setBillDiscount(billDiscountConfirmState.value, billDiscountConfirmState.mode);
          setBillDiscountConfirmState({ isOpen: false, value: 0, mode: 'percentage' });
        }}
        onCancel={() => setBillDiscountConfirmState({ isOpen: false, value: 0, mode: 'percentage' })}
        confirmLabel="Override"
        confirmVariant="danger"
      />

      <PosProviderModal 
        isOpen={isProviderModalOpen} 
        onClose={() => setIsProviderModalOpen(false)} 
        onSelect={(provider) => {
          setIsProviderModalOpen(false);
          setSelectedProviderForOrder(provider);
        }} 
        onClear={() => {
          setActiveProvider(null);
        }}
      />

      <PosCashTenderModal
        isOpen={isCashModalOpen}
        onClose={() => setIsCashModalOpen(false)}
        totalDue={total}
        onSubmit={(_, changeAmount) => {
          setIsCashModalOpen(false);
          const cashPaymodeId = tenderOptions.find(t => t.label.toLowerCase().includes('cash'))?.id || tenderOptions[0]?.id;
          handleCompleteSettlement([{ paymodeId: Number(cashPaymodeId), amount: total }], changeAmount);
        }}
        loading={orderLoading}
      />

      <PosMultiPayModal
        isOpen={isMultiPayModalOpen}
        onClose={() => {
          setIsMultiPayModalOpen(false);
          if (returnToRecallOnCancel) {
            handleClearCart();
            // Recall modal is already open in background, so we just return to it
            setReturnToRecallOnCancel(false);
          }
        }}
        totalDue={total}
        onSubmit={(payments, changeAmount) => {
          setIsMultiPayModalOpen(false);
          if (returnToRecallOnCancel) {
            // Settlement successful, so we close the background recall modal
            setIsRecallModalOpen(false);
            setReturnToRecallOnCancel(false);
          }
          const mappedPayments = payments.map(p => {
            const matchedTender = tenderOptions.find(t => t.label.toLowerCase().includes(p.mode.toLowerCase()));
            const id = matchedTender ? Number(matchedTender.id) : (p.mode === 'cash' ? 1 : p.mode === 'card' ? 2 : 3);
            return {
              paymodeId: id,
              amount: p.amount
            };
          });
          handleCompleteSettlement(mappedPayments, changeAmount);
        }}
        loading={orderLoading}
      />

      <PosProviderOrderModal
        isOpen={!!selectedProviderForOrder}
        onClose={() => setSelectedProviderForOrder(null)}
        provider={selectedProviderForOrder}
        onSubmit={(orderNo) => {
          if (selectedProviderForOrder) {
            resetTerminalState();
            setActiveProvider({ provider: selectedProviderForOrder, orderNo });
            showToast(`${selectedProviderForOrder.providerName} order #${orderNo} started`, 'success');
          }
          setSelectedProviderForOrder(null);
        }}
      />

      <EmployeePasswordModal
        isOpen={isSettledAuthOpen}
        onClose={() => setIsSettledAuthOpen(false)}
        loading={false}
        error={null}
        onSubmit={(_password) => {
          // Here we should actually validate the password if needed,
          // but for now we just open the modal.
          setIsSettledAuthOpen(false);
          setIsSettledModalOpen(true);
        }}
      />

      <LockItemModal 
        isOpen={isLockItemModalOpen} 
        onClose={() => {
          setIsLockItemModalOpen(false);
          setSelectedProductToLock(undefined);
          refreshLockedProducts();
        }}
        initialProductId={selectedProductToLock}
        onSuccess={() => refreshLockedProducts()}
      />

    </div>
  );
};
