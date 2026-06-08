import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../../../../app/hooks";
import PosTopNav from "../components/PosTopNav";
import PosCategoryRail from "../components/PosCategoryRail";
import PosGroupTabs from "../components/PosGroupTabs";
import { PosOrderPanel } from "../components/PosOrderPanel";
import PosProductGrid from "../components/PosProductGrid";
import { POS_CART_ACTIONS, POS_MORE_ACTIONS } from "../../constants";
import { usePosTerminal } from "../hooks/usePosTerminal";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import { usePosShortcuts } from "../hooks/usePosShortcuts";
import { salesInvoiceApi } from "../../services/salesInvoiceApi";
import ErrorBoundary from "../../../../components/common/ErrorBoundary";
import { clearAllItemDiscounts } from "../store/posSlice";
import { formatCurrency } from "../../../../utils/formatters";
import type { PosProduct, PosAlternative } from "../../types";
import { ConfirmDialog, Modal } from "../../../../components/common";
import { menuApi } from "../../services/menuApi";
import { PosMoreModal } from "../components/PosMoreModal";
import { PosSettledModal } from "../components/PosSettledModal";
import { PosCashTenderModal } from "../components/PosCashTenderModal";
import { PosMultiPayModal } from "../components/PosMultiPayModal";
import { PosCustomerModal } from "../../customer/components/PosCustomerModal";
import { PosExtrasModifierModal } from "../components/PosExtrasModifierModal";
import { PosDeliveryModal } from "../../customer/components/PosDeliveryModal";
import { PosDriveThroughModal } from "../../customer/components/PosDriveThroughModal";
import { PosRecallModal } from "../components/PosRecallModal";
import { PosVoidModal } from "../components/PosVoidModal";
import { EmployeePasswordModal } from "../components/EmployeePasswordModal";
import { PosProviderModal } from "../components/PosProviderModal";
import { PosProviderOrderModal } from "../components/PosProviderOrderModal";
import { PosCombineModal } from "../components/PosCombineModal";
import { PosSplitModal } from "../components/PosSplitModal";
import { useCashierLog } from "../../cashier";
import type { MenuProvider } from "../../types";
import { Tag, Receipt, XCircle, Percent, Banknote, ChevronRight, Check } from "lucide-react";
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
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [isDriveThroughModalOpen, setIsDriveThroughModalOpen] = useState(false);
  const [isRecallModalOpen, setIsRecallModalOpen] = useState(false);
  const [returnToRecallOnCancel, setReturnToRecallOnCancel] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [isCombineOpen, setIsCombineOpen] = useState(false);
  const [isSplitOpen, setIsSplitOpen] = useState(false);
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
  const [discountInputValue, setDiscountInputValue] = useState("");
  const [billDiscountConfirmState, setBillDiscountConfirmState] = useState<{
    isOpen: boolean;
    value: number;
    mode: 'percentage' | 'amount';
  }>({ isOpen: false, value: 0, mode: 'percentage' });

  // Price Flow States
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [priceInputValue, setPriceInputValue] = useState("");

  // Quantity Flow States
  const [isQtyModalOpen, setIsQtyModalOpen] = useState(false);
  const [qtyInputValue, setQtyInputValue] = useState("");

  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isMultiPayModalOpen, setIsMultiPayModalOpen] = useState(false);
  const [selectedTender, setSelectedTender] = useState<string>("cash");
  const [isPrintConfirmOpen, setIsPrintConfirmOpen] = useState(false);
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
  } = usePosTerminal();

  const billDiscountValue = useAppSelector((state) => state.pos.billDiscountValue);

  const isSettling = useAppSelector((state) => state.pos.isSettling);
  const isSettledEdit = useAppSelector((state) => state.pos.isSettledEdit);
  const isCartModified = useAppSelector((state) => state.pos.isCartModified);
  const editingSaleId = useAppSelector((state) => state.pos.editingSaleId);

  const activeCategory = categories.find(c => c.id === activeCategoryId);
  const activeSubCategory = subCategories.find(s => s.subCategoryId === activeSubCategoryId);
  const currentItem = selectedKey ? cartDetails.find((item) => item.uniqueId === selectedKey) : null;

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
        paymodeId: payments.length > 0 ? payments[0].paymodeId : 1,
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
      if (editingSaleId) {
        success = await salesInvoiceApi.updateSalesInvoice(editingSaleId, salesPayload);
      } else {
        const newSaleId = await salesInvoiceApi.createSalesInvoice(salesPayload);
        success = !!newSaleId;
      }

      if (success) {
        setIsCashModalOpen(false);
        setIsMultiPayModalOpen(false);
        setIsPrintConfirmOpen(true);
      } else {
        throw new Error("Invalid sales response");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to save sales invoice", "error");
    }
  };

  const finalizeSettlement = (shouldPrint: boolean) => {
    setIsPrintConfirmOpen(false);
    if (shouldPrint) {
      showToast("Printing receipt...", "info");
      // Add logic here to call actual print function when available
    }
    showToast("Sales saved successfully", "success");
    handleClearCart();
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
    const payments = [{ paymodeId: selectedTender === "card" ? 2 : 3, amount: total }];

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
  const handleSettle = () => {
    if (itemCount === 0) {
      showToast("Cart is empty", "warning");
      return;
    }
    
    if (selectedTender === "cash") {
      setIsCashModalOpen(true);
    } else if (selectedTender === "multi") {
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
      let isIncl = product.isIncl;
      let targetPrice = product.price ?? 0;

      // If the list API didn't provide isIncl, fetch it from the /data endpoint
      if (isIncl === undefined) {
        const safeOrderTypeId = selectedOrderTypeId || 1;
        const cacheKey = `${productId}-${safeOrderTypeId}`;
        const cachedData = productDataCache[cacheKey];
        if (cachedData) {
          isIncl = cachedData.isIncl;
          targetPrice = cachedData.price;
        } else {
          // Intentionally omitting setFetchingAlts(true) here so it feels instant
          try {
            const data = await menuApi.getProductData(productId, safeOrderTypeId);
            productDataCache[cacheKey] = data;
            isIncl = data.isIncl;
            targetPrice = data.price;
          } catch (err) {
            console.error("Failed to fetch product data", err);
          }
        }
      }

      const newKey = addProduct(productId, undefined, targetPrice, isIncl);
      setSelectedKey(newKey);
      if (targetPrice === 0) {
        setPriceInputValue("");
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
          if (isIncl === undefined) {
            const cacheKey = `${productId}-${safeOrderTypeId}`;
            const cachedData = productDataCache[cacheKey];
            if (cachedData) {
              isIncl = cachedData.isIncl;
              targetPrice = cachedData.price;
            } else {
              try {
                const data = await menuApi.getProductData(productId, safeOrderTypeId);
                productDataCache[cacheKey] = data;
                isIncl = data.isIncl;
                targetPrice = data.price;
              } catch(e) {}
            }
          }
          const newKey = addProduct(productId, undefined, targetPrice, isIncl);
          setSelectedKey(newKey);
          if (targetPrice === 0) {
            setPriceInputValue("");
            setIsPriceModalOpen(true);
          }
        }
      } catch {
        let isIncl = product.isIncl;
        let targetPrice = product.price ?? 0;
        if (isIncl === undefined) {
           try {
             const data = await menuApi.getProductData(productId, safeOrderTypeId);
             productDataCache[`${productId}-${safeOrderTypeId}`] = data;
             isIncl = data.isIncl;
             targetPrice = data.price;
           } catch(e) {}
        }
        const newKey = addProduct(productId, undefined, targetPrice, isIncl);
        setSelectedKey(newKey);
      } finally {
        setFetchingAlts(false);
      }
    }
  };

  const handleAltSelect = (variant: PosAlternative) => {
    if (selectedProduct) {
      const newKey = addProduct(selectedProduct.id, variant.altName, variant.price, variant.isIncl);
      setSelectedKey(newKey);
      if (variant.price === 0) {
        setPriceInputValue("");
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
  useBarcodeScanner((barcode) => {
    const newKey = addProductBySku(barcode);
    if (newKey) {
      setSelectedKey(newKey);
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
    setPriceInputValue("");
    setIsPriceModalOpen(true);
  };

  const openQtyModal = () => {
    if (!selectedKey) return;
    setQtyInputValue("");
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
    setDiscountInputValue("");
    setDiscountStep('value');
  };

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

      <main className="flex flex-col flex-1 overflow-hidden md:grid md:grid-cols-[160px_minmax(0,1fr)_340px] lg:grid-cols-[180px_minmax(0,1fr)_370px] xl:grid-cols-[200px_minmax(0,1fr)_460px]">
        {/* Left Column: Categories */}
        <PosCategoryRail
          categories={categories}
          activeCategoryId={activeCategoryId ? activeCategoryId.toString() : ""}
          onSelect={(id) => {
            const parsedId = parseInt(id, 10);
            if (parsedId !== activeCategoryId) {
              setCategory(parsedId);
            } else {
              // Same category clicked again — reset to fresh top-level state
              setSubCategory(null);
              setAlternatives([]);
              setSelectedProduct(null);
            }
          }}
        />

        {/* Middle Column: Grid */}
        <div className="flex flex-col flex-1 overflow-hidden bg-[#fcf9fb]">
          <div className="flex-1 flex flex-col p-2 lg:p-2.5 xl:p-4 overflow-hidden pb-2.5 xl:pb-4">
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
                categoryName={activeCategory?.name}
                subCategoryName={activeSubCategory?.subCategoryName}
                selectedProduct={selectedProduct}
              />
            </ErrorBoundary>
          </div>

          {/* Action Button Bar */}
          <div className="grid grid-cols-4 md:grid-cols-8 gap-1 p-1 bg-white border-t border-slate-100 shrink-0">
            <button className="h-9 lg:h-10 rounded bg-[#ff9500] hover:bg-[#e68600] text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm" tabIndex={-1}>
              Close
            </button>
            <button
              onClick={handleClearCart}
              className="h-9 lg:h-10 rounded bg-[#ff9500] hover:bg-[#e68600] text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm"
              tabIndex={-1}
            >
              Clear
            </button>
            <button className="h-9 lg:h-10 rounded bg-[#ff9500] hover:bg-[#e68600] text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm">
              Waiter
            </button>
            <button
              onClick={() => setIsCombineOpen(true)}
              className="h-9 lg:h-10 rounded bg-[#ff9500] hover:bg-[#e68600] text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!editingOrderId}
            >
              Combine
            </button>
            <button
              onClick={() => setIsSplitOpen(true)}
              className="h-9 lg:h-10 rounded bg-[#ff9500] hover:bg-[#e68600] text-white text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Right Column: Order Panel */}
        <div className={`
          fixed inset-y-0 right-0 z-50 w-[85%] max-w-[460px] transform transition-transform duration-300 ease-in-out bg-white shadow-2xl
          lg:static lg:w-auto lg:translate-x-0 lg:shadow-none lg:z-auto lg:h-full lg:overflow-hidden
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
              onQty={openQtyModal}
              onClearCart={handleClearCart}
              onOrder={handleOrder}
              onSettle={handleSettle}
              orderLoading={orderLoading}
              isSettledEdit={isSettledEdit}
              selectedTender={selectedTender}
              onSelectTender={(tender) => {
                setSelectedTender(tender);
                if (total > 0) {
                  if (tender === 'multi') {
                    setIsMultiPayModalOpen(true);
                  } else if (tender === 'cash') {
                    setIsCashModalOpen(true);
                  }
                }
              }}
              onClose={() => setIsCartOpen(false)}
            />
          </ErrorBoundary>
        </div>
      </main>

      {/* Mobile Floating Cart Button */}
      {!isCartOpen && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="lg:hidden absolute bottom-6 right-6 z-40 bg-[#ff9500] hover:bg-[#e68600] text-white p-4 rounded-full shadow-2xl transition-transform active:scale-95 flex items-center justify-center"
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

      {/* Discount Choice Modal - Clean & Modern */}
      <Modal
        isOpen={discountStep === 'choice'}
        onClose={() => setDiscountStep('none')}
        noPadding
        showClose={false}
        className="max-w-[400px] border-none shadow-2xl rounded-2xl overflow-hidden"
      >
        <div className="bg-[#49293e] text-white py-4 px-6 flex justify-between items-center">
          <h2 className="text-lg font-black uppercase tracking-[0.1em]">Discount Type</h2>
          <button onClick={() => setDiscountStep('none')} className="p-1 hover:bg-white/10 rounded-full" tabIndex={-1}>
            <XCircle size={24} />
          </button>
        </div>

        <div className="bg-white p-6 grid grid-cols-1 gap-4">
          <button
            onClick={() => openDiscountInput('bill')}
            className="flex items-center gap-4 p-5 bg-slate-50 border-2 border-slate-100 hover:border-[#ff9500] hover:bg-white transition-all rounded-2xl group"
          >
            <div className="w-12 h-12 rounded-xl bg-[#49293e] text-white flex items-center justify-center shadow-lg">
              <Receipt size={24} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight">Whole Order</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Global Bill Reduction</p>
            </div>
            <ChevronRight size={20} className="text-slate-300 group-hover:text-[#ff9500]" />
          </button>

          <button
            onClick={() => {
              if (billDiscountValue > 0) {
                showToast("Cannot apply item discounts while a bill discount is active", "warning");
                return;
              }
              if (!selectedKey) {
                alert("Please select an item in the cart first");
                return;
              }
              openDiscountInput('item');
            }}
            className="flex items-center gap-4 p-5 bg-slate-50 border-2 border-slate-100 hover:border-[#ff9500] hover:bg-white transition-all rounded-2xl group"
          >
            <div className="w-12 h-12 rounded-xl bg-[#ff9500] text-white flex items-center justify-center shadow-lg">
              <Tag size={24} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight">Item Wise</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Specific Product Reduction</p>
            </div>
            <ChevronRight size={20} className="text-slate-300 group-hover:text-[#ff9500]" />
          </button>
        </div>
      </Modal>

      {/* Modern POS Discount Keypad - Elegant & Standard */}
      <Modal
        isOpen={discountStep === 'value'}
        onClose={() => setDiscountStep('none')}
        noPadding
        showClose={false}
        className="max-w-[360px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl"
      >
        <div className="bg-[#49293e] text-white py-3 px-4 flex justify-between items-center">
          <h2 className="text-sm font-black uppercase tracking-[0.2em]">{discountType === 'bill' ? 'BILL' : 'ITEM'} DISCOUNT</h2>
          <button onClick={() => setDiscountStep('none')} className="opacity-60 hover:opacity-100" tabIndex={-1}>
            <XCircle size={20} />
          </button>
        </div>

        <div className="bg-[#f8fafc] p-3 space-y-3 overflow-hidden">
          {/* Elegant Mode Toggle */}
          <div className="flex p-1 bg-slate-200/60 rounded-2xl">
            <button 
              onClick={() => { setDiscountMode('percentage'); setDiscountInputValue(""); }}
              className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${
                discountMode === 'percentage' ? "bg-white text-[#49293e] shadow-md" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Percent size={14} strokeWidth={3} />
              Percentage
            </button>
            <button 
              onClick={() => { setDiscountMode('amount'); setDiscountInputValue(""); }}
              className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${
                discountMode === 'amount' ? "bg-white text-[#49293e] shadow-md" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Banknote size={14} strokeWidth={3} />
              Amount
            </button>
          </div>

          {/* Premium Input Display */}
          <div className="bg-[#1e293b] p-3 rounded-2xl shadow-lg flex flex-col items-end relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#ff9500]" />
            <div className="w-full flex justify-between items-baseline mb-1">
              <span className="text-[9px] font-black text-[#ff9500] uppercase tracking-wider">
                {discountType === 'bill' 
                  ? `Bill: ${formatCurrency(subtotal)}` 
                  : currentItem 
                    ? `${currentItem.product.name.split(' - ')[0]}: ${formatCurrency(currentItem.amount)}` 
                    : 'Item Amount: 0.000'}
              </span>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Enter reduction</span>
            </div>
            <div className="text-3xl font-black text-white font-mono flex items-baseline gap-2">
              {discountInputValue || "0"}
              <span className="text-base text-[#ff9500]">
                {discountMode === 'percentage' ? "%" : formatCurrency(0).split(' ')[0]}
              </span>
            </div>
          </div>

          {/* Clean Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "Clear", "0", "."].map((btn) => (
              <button
                key={btn}
                onClick={() => {
                  if (btn === "Clear") setDiscountInputValue("");
                  else if (btn === ".") {
                    if (!discountInputValue.includes(".")) setDiscountInputValue(prev => prev + ".");
                  } else {
                    if (discountInputValue.length < 8) setDiscountInputValue(prev => prev + btn);
                  }
                }}
                className={`
                  h-11 rounded-xl text-lg font-black transition-all active:scale-90 shadow-sm border border-slate-400
                  ${btn === 'Clear' ? "bg-red-50 text-red-600 border-red-400" : "bg-white text-slate-700 hover:bg-slate-50"}
                `}
              >
                {btn}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => setDiscountStep('none')}
              className="h-11 bg-white text-slate-500 border border-slate-200 font-black uppercase text-[10px] tracking-widest rounded-xl active:scale-95 transition-all"
              tabIndex={-1}
            >
              Cancel
            </button>
            <button
              onClick={() => handleApplyDiscount(discountInputValue)}
              className="h-11 bg-[#ff9500] text-white font-black uppercase text-[10px] sm:text-xs tracking-widest rounded-xl shadow-[0_4px_15px_rgba(255,149,0,0.3)] hover:bg-[#e68600] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Check size={16} strokeWidth={3} />
              Apply Discount
            </button>
          </div>
        </div>
      </Modal>

      {/* Modern POS Price Override Modal */}
      <Modal
        isOpen={isPriceModalOpen}
        onClose={handlePriceModalClose}
        noPadding
        showClose={false}
        className="max-w-[360px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl"
      >
        <div className="bg-[#49293e] text-white py-4 px-6 flex justify-between items-center">
          <h2 className="text-sm font-black uppercase tracking-[0.2em]">Manual Price</h2>
          <button onClick={handlePriceModalClose} className="opacity-60 hover:opacity-100" tabIndex={-1}>
            <XCircle size={20} />
          </button>
        </div>

        <div className="bg-[#f8fafc] p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[85vh] overflow-y-auto">
          <div className="bg-[#1e293b] p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl flex flex-col items-end relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#ff9500]" />
            <div className="w-full flex justify-between items-center mb-1">
              <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Override Price</span>
              <span className="text-[8px] sm:text-[9px] font-black text-[#ff9500] uppercase">Original: {formatCurrency(currentSelectedItem?.product.price || 0)}</span>
            </div>
            <input
              type="text"
              autoFocus
              value={priceInputValue}
              onChange={(e) => {
                const val = e.target.value;
                if (/^[0-9]*\.?[0-9]*$/.test(val)) {
                  setPriceInputValue(val);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleApplyPrice(priceInputValue);
                }
              }}
              placeholder="0"
              className="w-full bg-transparent text-right text-3xl sm:text-4xl font-black text-white font-mono outline-none border-none p-0 focus:ring-0 focus:outline-none placeholder:text-white/30"
            />
          </div>

          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {[
              "1", "2", "3", "Back",
              "4", "5", "6", "7",
              "8", "9", "0", ".",
              "Clear",
            ].map((btn) => {
              return (
                <button
                  key={btn}
                  onClick={() => {
                    if (btn === "Clear") setPriceInputValue("");
                    else if (btn === "Back") setPriceInputValue(prev => prev.slice(0, -1));
                    else if (btn === ".") {
                      if (!priceInputValue.includes(".")) setPriceInputValue(prev => prev + ".");
                    } else {
                      if (priceInputValue.length < 10) {
                        const next = `${priceInputValue}${btn}`;
                        setPriceInputValue(next.slice(0, 10));
                      }
                    }
                  }}
                  className={`
                    h-10 sm:h-12 md:h-14 rounded-xl sm:rounded-2xl text-lg sm:text-xl font-black transition-all active:scale-90 shadow-sm border border-slate-400
                    ${btn === 'Clear'
                      ? "bg-red-50 text-red-600 border-red-400"
                      : btn === 'Back'
                        ? "bg-slate-100 text-slate-700 border-slate-300"
                        : "bg-white text-slate-700 hover:bg-slate-50"}
                    ${btn === 'Clear' ? "col-span-4" : ""}
                  `}
                >
                  {btn === "Back" ? "⌫" : btn}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-1">
            <button
              onClick={() => setIsPriceModalOpen(false)}
              className="h-12 sm:h-14 bg-white text-slate-500 border border-slate-200 font-black uppercase text-[10px] tracking-widest rounded-xl sm:rounded-2xl active:scale-95 transition-all"
              tabIndex={-1}
            >
              Cancel
            </button>
            <button
              onClick={() => handleApplyPrice(priceInputValue)}
              className="h-12 sm:h-14 bg-[#ff9500] text-white font-black uppercase text-[10px] sm:text-xs tracking-widest rounded-xl sm:rounded-2xl shadow-[0_4px_15px_rgba(255,149,0,0.3)] hover:bg-[#e68600] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Check size={16} strokeWidth={3} />
              Update Price
            </button>
          </div>
        </div>
      </Modal>

      {/* Modern POS Qty Override Modal */}
      <Modal
        isOpen={isQtyModalOpen}
        onClose={() => setIsQtyModalOpen(false)}
        noPadding
        showClose={false}
        className="max-w-[360px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl"
      >
        <div className="bg-[#49293e] text-white py-4 px-6 flex justify-between items-center">
          <h2 className="text-sm font-black uppercase tracking-[0.2em]">Manual Quantity</h2>
          <button onClick={() => setIsQtyModalOpen(false)} className="opacity-60 hover:opacity-100" tabIndex={-1}>
            <XCircle size={20} />
          </button>
        </div>

        <div className="bg-[#f8fafc] p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[85vh] overflow-y-auto">
          <div className="bg-[#1e293b] p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl flex flex-col items-end relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-[#002b5c]" />
            <div className="w-full flex justify-between items-center mb-1">
              <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Override Qty</span>
              <span className="text-[8px] sm:text-[9px] font-black text-[#002b5c] uppercase">Current: x{currentSelectedItem?.quantity || 1}</span>
            </div>
            <input
              type="text"
              autoFocus
              value={qtyInputValue}
              onChange={(e) => {
                const val = e.target.value;
                if (/^[0-9]*$/.test(val)) {
                  setQtyInputValue(val);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleApplyQty(qtyInputValue);
                }
              }}
              placeholder="0"
              className="w-full bg-transparent text-right text-3xl sm:text-4xl font-black text-white font-mono outline-none border-none p-0 focus:ring-0 focus:outline-none placeholder:text-white/30"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "Clear", "0", "Back"].map((btn) => {
              return (
                <button
                  key={btn}
                  onClick={() => {
                    if (btn === "Clear") setQtyInputValue("");
                    else if (btn === "Back") setQtyInputValue(prev => prev.slice(0, -1));
                    else {
                      if (qtyInputValue.length < 5) setQtyInputValue(prev => prev + btn);
                    }
                  }}
                  className={`
                    h-10 sm:h-12 md:h-14 rounded-xl sm:rounded-2xl text-lg sm:text-xl font-black transition-all active:scale-90 shadow-sm border border-slate-400
                    ${btn === 'Clear' ? "bg-red-50 text-red-600 border-red-400" : btn === 'Back' ? "bg-slate-100 text-slate-700 border-slate-300" : "bg-white text-slate-700 hover:bg-slate-50"}
                  `}
                >
                  {btn === "Back" ? "⌫" : btn}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-1">
            <button
              onClick={() => setIsQtyModalOpen(false)}
              className="h-12 sm:h-14 bg-white text-slate-500 border border-slate-200 font-black uppercase text-[10px] tracking-widest rounded-xl sm:rounded-2xl active:scale-95 transition-all"
              tabIndex={-1}
            >
              Cancel
            </button>
            <button
              onClick={() => handleApplyQty(qtyInputValue)}
              className="h-12 sm:h-14 bg-[#ff9500] text-white font-black uppercase text-[10px] sm:text-xs tracking-widest rounded-xl sm:rounded-2xl shadow-[0_4px_15px_rgba(255,149,0,0.3)] hover:bg-[#e68600] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Check size={16} strokeWidth={3} />
              Update Qty
            </button>
          </div>
        </div>
      </Modal>

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
          setIsLogoutConfirmOpen(true);
        }}
        onCustomerMaster={() => setIsCustomerModalOpen(true)}
        onItemComplimentary={handleItemComplimentary}
        onBillComplimentary={handleBillComplimentary}
        onSettledOrders={() => setIsSettledAuthOpen(true)}
      />

      <PosCustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
      />
      
      <PosDeliveryModal
        isOpen={isDeliveryModalOpen}
        onClose={() => setIsDeliveryModalOpen(false)}
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

      <ConfirmDialog
        isOpen={isPrintConfirmOpen}
        onCancel={() => finalizeSettlement(false)}
        title="Print Receipt"
        message="Do you want to print the receipt?"
        confirmLabel="Yes, Print"
        cancelLabel="No"
        onConfirm={() => finalizeSettlement(true)}
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
          handleCompleteSettlement([{ paymodeId: 1, amount: total }], changeAmount);
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
          const mappedPayments = payments.map(p => ({
            paymodeId: p.mode === 'cash' ? 1 : p.mode === 'card' ? 2 : 3,
            amount: p.amount
          }));
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
    </div>
  );
};
