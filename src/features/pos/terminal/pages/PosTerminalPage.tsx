import { useState, useEffect, useMemo, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { useEvent } from "../../../../hooks/useEvent";
import { useLocation, useNavigate } from "react-router-dom";
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
import { PosActionButtons } from "../components/layout/PosActionButtons";
import { PosTerminalModals } from "../components/modals/PosTerminalModals";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import { usePosShortcuts } from "../hooks/usePosShortcuts";
import { cacheProducts, clearAllItemDiscounts, setCustomerId, setCustomDeliveryCharge, setOrderType, setOrderTypeByName } from "../store/posSlice";
import { selectDeliveryCharge } from "../store/posSelectors";
import { PosProductSearchDropdown } from "../components/menu/PosProductSearchDropdown";
import type { PosProduct, PosAlternative, PosProductSearchResult } from "../../types";
import ErrorBoundary from "../../../../components/common/ErrorBoundary";
import { menuApi } from "../../services/menuApi";
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
  const modals = usePosModals();
  const { showToast } = useToast();
  const { authorizationModalKey, authorizationModalProps, requestAuthorization } = useEmployeeAuthorization();
  const { decimalPart } = useCurrency();
  const { status, isLoading } = useCashierLog();

  const [selectedProviderForOrder, setSelectedProviderForOrder] = useState<MenuProvider | null>(null);
  const [activeProvider, setActiveProvider] = useState<{ provider: MenuProvider; orderNo: string } | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<PosProduct | null>(null);
  const [alternatives, setAlternatives] = useState<PosAlternative[]>([]);
  const [fetchingAlts, setFetchingAlts] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [selectedTender, setSelectedTender] = useState<string>("");
  const [extrasModifierType, setExtrasModifierType] = useState<'none' | 'extras' | 'modifiers'>('none');
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  
  // Ref to debounce rapid double-clicks on zero price items
  const zeroPriceLockRef = useRef<number>(0);
  const initialAutoDineInChecked = useRef(false);

  useEffect(() => {
    const state = location.state as { openMoreModal?: boolean; openCashModal?: boolean };
    if (state?.openMoreModal) {
      modals.setIsMoreModalOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
    if (state?.openCashModal) {
      modals.setIsCashModalOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, modals]);

  const terminal = usePosTerminal();

  const isCreditProviderActive = useMemo(() => {
    if (!activeProvider?.provider) return false;
    const { paymodeId, paymode, paymodeName } = activeProvider.provider;
    if (paymodeId === 2) return true;
    if (paymode && paymode.toLowerCase().includes("credit")) return true;
    if (paymodeName && paymodeName.toLowerCase().includes("credit")) return true;
    const matchTender = terminal.tenderOptions.find((t) => t.id === String(paymodeId));
    if (matchTender && matchTender.label.toLowerCase().includes("credit")) return true;
    return false;
  }, [activeProvider, terminal.tenderOptions]);

  useEffect(() => {
    if (activeProvider?.provider) {
      if (activeProvider.provider.paymodeId) {
        setSelectedTender(String(activeProvider.provider.paymodeId));
      }
      if (activeProvider.provider.postAccountId) {
        dispatch(setCustomerId(activeProvider.provider.postAccountId));
      }
    }
  }, [activeProvider, dispatch]);

  useEffect(() => {
    if (terminal.tenderOptions.length > 0 && !selectedTender) {
      setSelectedTender(terminal.tenderOptions[0].id);
    }
  }, [terminal.tenderOptions, selectedTender]);

  const billDiscountValue = useAppSelector((state) => state.pos.billDiscountValue);
  const { productCache } = useAppSelector((state) => state.pos);
  const isSettling = useAppSelector((state) => state.pos.isSettling);
  const deliveryCharge = useAppSelector(selectDeliveryCharge);
  const selectedOrderTypeName = useAppSelector((state) => state.pos.selectedOrderTypeName);
  const isDelivery = terminal.selectedOrderTypeId === 4 || (selectedOrderTypeName || "").toLowerCase().replace(/[\s_-]/g, "").includes("delivery");
  const isSettledEdit = useAppSelector((state) => state.pos.isSettledEdit);
  const isCartModified = useAppSelector((state) => state.pos.isCartModified);
  const editingSaleId = useAppSelector((state) => state.pos.editingSaleId);

  const activeCategory = terminal.categories.find(c => c.id === terminal.activeCategoryId);
  const activeSubCategory = terminal.subCategories.find((s: any) => s.subCategoryId === terminal.activeSubCategoryId);
  const currentSelectedItem = useMemo(() => {
    if (!selectedKey) return null;
    return terminal.cartDetails.find((item) => item.uniqueId === selectedKey);
  }, [selectedKey, terminal.cartDetails]);

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
    if (storedConfig?.defaultEmployee !== undefined && storedConfig.employeeId !== undefined && storedConfig.defaultOrderTypeId !== undefined) {
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

  const applyDefaultOrderType = async (allowAutoDineIn: boolean = false) => {
    try {
      const config = await getRuntimePosConfig();
      const defaultId = Number(config?.defaultOrderTypeId) || 1;

      const match = terminal.orderTypes.find((t) => t.orderTypeId === defaultId);
      if (match) {
        dispatch(setOrderType(match));
      } else {
        const fallbackName = defaultId === 2 ? "TakeOut" : defaultId === 3 ? "DriveThru" : defaultId === 4 ? "Delivery" : defaultId === 6 ? "Coming" : "DineIn";
        dispatch(setOrderTypeByName(fallbackName));
      }

      const isDineIn = defaultId === 1 || (match?.orderType && match.orderType.toLowerCase().includes("dine"));
      const isShiftOpen = status && !status.isDayClosed && !status.isShiftClosed;
      if (isDineIn && allowAutoDineIn && isShiftOpen && !terminal.editingOrderId && !terminal.selectedTableId) {
        navigate("/pos/dine-in", { state: { skipAutoDineIn: true } });
      }
    } catch (e) {
      console.error("Error applying default order type:", e);
    }
  };

  useEffect(() => {
    if (initialAutoDineInChecked.current) return;
    if (isLoading || !status) return;

    initialAutoDineInChecked.current = true;

    const skip = (location.state as any)?.skipAutoDineIn || false;
    const hasActiveCart = terminal.cartDetails.length > 0;
    const hasActiveOrder = !!terminal.editingOrderId || !!terminal.selectedTableId;

    void applyDefaultOrderType(!skip && !hasActiveCart && !hasActiveOrder);
  }, [terminal.orderTypes, status, isLoading]);

  useEffect(() => {
    setAlternatives([]);
    setSelectedProduct(null);
  }, [terminal.activeGroupId, terminal.activeCategoryId, terminal.activeSubCategoryId, terminal.search]);

  const resetTerminalState = () => {
    terminal.clearCart();
    setSelectedKey(null);
    setSelectedProduct(null);
    setAlternatives([]);
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
    submitOrder: terminal.submitOrder,
    getDirectSettleOrderPayload: terminal.getDirectSettleOrderPayload,
    requestAuthorization,
    showToast,
    handleClearCart,
    setIsCashModalOpen: modals.setIsCashModalOpen,
    setIsMultiPayModalOpen: modals.setIsMultiPayModalOpen,
    setSelectedKey,
    setSelectedProduct,
    setAlternatives,
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

  const handleApplyPrice = (val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num) && selectedKey) {
      if (num === 0) {
        showToast("Price cannot be zero. Use Item Complimentary.", "error");
        return;
      }
      terminal.updateItemPrice(selectedKey, num);
      modals.setIsPriceModalOpen(false);
    }
  };

  const handlePriceModalClose = () => {
    modals.setIsPriceModalOpen(false);
    if (selectedKey) {
      const currentItem = terminal.cartDetails.find((item) => item.uniqueId === selectedKey);
      if (currentItem && (currentItem.price === 0 || currentItem.price === undefined) && !(currentItem.discountType === 'percentage' && currentItem.discountValue === 100)) {
        terminal.removeItem(selectedKey);
        setSelectedKey(null);
      }
    }
  };

  const handleItemComplimentary = () => {
    if (!selectedKey) {
      showToast("Select an item first", "warning");
      return;
    }
    requestAuthorization({
      actionLabel: "Item Complimentary",
      permissionId: 13, // Product complementary
      onAuthorized: () => {
        terminal.setItemDiscount(selectedKey, 100, 'percentage');
        showToast("Item marked as complimentary", "success");
      }
    });
  };

  const handleBillComplimentary = () => {
    if (terminal.cartDetails.length === 0) {
      showToast("Cart is empty", "warning");
      return;
    }
    requestAuthorization({
      actionLabel: "Bill Complimentary",
      permissionId: 12, // Bill complementary
      onAuthorized: () => {
        terminal.setBillDiscount(100, 'percentage');
        showToast("Bill marked as complimentary", "success");
      }
    });
  };

  const handleApplyQty = (value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 1) return;

    if (selectedKey) {
      const item = terminal.cartDetails.find((i) => i.uniqueId === selectedKey);
      if (item && terminal.editingOrderId && item.isExisting) {
        if (numValue < item.quantity) {
          requestAuthorization({
            actionLabel: "Void Item Qty",
            permissionId: 8, // Product Void
            onAuthorized: () => {
              const diff = item.quantity - numValue;
              const unitId = item.product?.unitId || 1;
              const mapId = item.mapId || 0;
              
              terminal.addVoidProduct({
                productId: item.productId,
                productName: item.product?.name || `Product #${item.productId}`,
                unitId,
                qty: diff,
                amount: Number(((item.price || 0) * diff).toFixed(decimalPart)),
                mapId,
              });

              terminal.updateItemQty(selectedKey, numValue);
              showToast(`Reduced quantity for ${item.product?.name || `Product #${item.productId}`} by ${diff}`, "success");
            },
          });
          modals.setIsQtyModalOpen(false);
          return;
        }
      }
      terminal.updateItemQty(selectedKey, numValue);
    }
    modals.setIsQtyModalOpen(false);
  };


  const openPriceModal = () => {
    if (!selectedKey) return;
    requestAuthorization({
      actionLabel: "Price Change",
      permissionId: 9, // Price Change
      onAuthorized: () => modals.setIsPriceModalOpen(true),
    });
  };

  const openQtyModal = () => {
    if (!selectedKey) return;
    modals.setIsQtyModalOpen(true);
  };

  const stableSetCategory = useEvent((id: string) => {
    const parsedId = parseInt(id, 10);
    if (parsedId !== terminal.activeCategoryId) {
      terminal.setCategory(parsedId);
    } else {
      terminal.setSubCategory(null);
      setAlternatives([]);
      setSelectedProduct(null);
    }
  });

  const stableOnLongPress = useEvent((id: number) => {
    requestAuthorization({
      actionLabel: "Lock Products",
      permissionId: 18, // Lock Products
      onAuthorized: () => {
        modals.setSelectedProductToLock(String(id));
        modals.setIsLockItemModalOpen(true);
      }
    });
  });

  const handleSettle = (shouldPrint: boolean) => {
    if (terminal.itemCount === 0) {
      showToast("Cart is empty", "warning");
      return;
    }
    
    checkoutFlow.settleShouldPrintRef.current = shouldPrint;
  
    if (!selectedTender) {
      showToast("Please select a payment method", "warning");
      return;
    }

    if (selectedTender === "3") {
      modals.setIsMultiPayModalOpen(true);
    } else {
      checkoutFlow.handleCardCreditSettlement(Number(selectedTender));
    }
  };

  const handleOrder = async (shouldPrint: boolean) => {
    if (terminal.itemCount === 0) {
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
      await checkoutFlow.submitOrderForEmployee(defaultEmployeeId, shouldPrint);
      return;
    }



    requestAuthorization({
      actionLabel: "Order",
      onAuthorized: (empId) => checkoutFlow.submitOrderForEmployee(empId, shouldPrint),
    });
  };

  const stableHandleOrder = useEvent((print: boolean) => handleOrder(print));
  const stableHandleSettle = useEvent((print: boolean) => handleSettle(print));

  const handleProductSelect = async (productId: number) => {
    const product = terminal.visibleProducts.find(p => p.id === productId);
    if (!product) return;

    // Prevent double clicking on zero price items which skips manual price entry
    if (product.price === 0) {
      const now = Date.now();
      if (now - zeroPriceLockRef.current < 1000) {
        return; // Ignore rapid double clicks for open price items
      }
      zeroPriceLockRef.current = now;
    }

    if (!product.hasAlternatives) {
      const safeOrderTypeId = terminal.selectedOrderTypeId || 1;
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

      const newKey = terminal.addProduct(productId, undefined, targetPrice, isIncl, discountValue, discountType);
      setSelectedKey(newKey);
      if (targetPrice === 0) {
        modals.setIsPriceModalOpen(true);
      }
      return;
    }

    const safeOrderTypeId = terminal.selectedOrderTypeId || 1;
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

          const newKey = terminal.addProduct(productId, undefined, targetPrice, isIncl, discountValue, discountType);
          setSelectedKey(newKey);
          if (targetPrice === 0) {
            modals.setIsPriceModalOpen(true);
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

        const newKey = terminal.addProduct(productId, undefined, targetPrice, isIncl, discountValue, discountType);
        setSelectedKey(newKey);
        if (targetPrice === 0) {
          modals.setIsPriceModalOpen(true);
        }
      } finally {
        setFetchingAlts(false);
      }
    }
  };

  const handleAltSelect = (variant: PosAlternative) => {
    // Prevent double clicking on zero price items which skips manual price entry
    if (variant.price === 0) {
      const now = Date.now();
      if (now - zeroPriceLockRef.current < 1000) {
        return; // Ignore rapid double clicks for open price variants
      }
      zeroPriceLockRef.current = now;
    }

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

      const newKey = terminal.addProduct(
        selectedProduct.id,
        variant.altName,
        variant.price,
        isIncl,
        discountValue,
        discountType,
        variant.unitId
      );
      setSelectedKey(newKey);
      if (variant.price === 0) {
        modals.setIsPriceModalOpen(true);
      }
    }
  };

  const handleSearchProductSelect = async (searchItem: PosProductSearchResult) => {
    const productId = searchItem.productId;

    // Prevent rapid double clicks on zero price items
    if (searchItem.price === 0) {
      const now = Date.now();
      if (now - zeroPriceLockRef.current < 1000) return;
      zeroPriceLockRef.current = now;
    }

    const safeOrderTypeId = terminal.selectedOrderTypeId || 1;
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

    let isIncl = searchItem.isIncl;
    let targetPrice = searchItem.price ?? 0;
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

    dispatch(cacheProducts([{
      id: searchItem.productId,
      name: searchItem.productName,
      arabicName: searchItem.arabicName,
      categoryId: 0,
      price: targetPrice,
      vatId: searchItem.vatId,
      vatValue: searchItem.vatValue,
      unitId: searchItem.unitId,
      hasAlternatives: searchItem.hasAlternatives,
      isIncl: isIncl,
      isLocked: searchItem.isLocked,
      imageUrl: searchItem.imageUrl,
    }]));

    const newKey = terminal.addProduct(productId, undefined, targetPrice, isIncl, discountValue, discountType);
    setSelectedKey(newKey);
    if (targetPrice === 0) {
      modals.setIsPriceModalOpen(true);
    }
  };

  const handleSearchAltSelect = (product: PosProductSearchResult, variant: PosAlternative) => {
    // Prevent double clicking on zero price items
    if (variant.price === 0) {
      const now = Date.now();
      if (now - zeroPriceLockRef.current < 1000) return;
      zeroPriceLockRef.current = now;
    }

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

    dispatch(cacheProducts([{
      id: product.productId,
      name: product.productName,
      arabicName: product.arabicName,
      categoryId: 0,
      price: variant.price,
      vatId: product.vatId,
      vatValue: product.vatValue,
      unitId: variant.unitId ?? product.unitId,
      hasAlternatives: product.hasAlternatives,
      isIncl: isIncl,
      isLocked: product.isLocked,
      imageUrl: product.imageUrl,
    }]));

    const newKey = terminal.addProduct(
      product.productId,
      variant.altName,
      variant.price,
      isIncl,
      discountValue,
      discountType,
      variant.unitId
    );
    setSelectedKey(newKey);
    if (variant.price === 0) {
      modals.setIsPriceModalOpen(true);
    }
  };

  const handleGridBack = () => {
    if (alternatives.length > 0) {
      setAlternatives([]);
      setSelectedProduct(null);
    } else {
      terminal.setSubCategory(null);
    }
  };

  useBarcodeScanner(async (barcode) => {
    const cachedProducts = Object.values(productCache || {});
    const product = cachedProducts.find((p) => p.sku?.toLowerCase() === barcode.toLowerCase());
    
    if (!product) return;

    if (product.hasAlternatives) {
      const safeOrderTypeId = terminal.selectedOrderTypeId || 1;
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
      const newKey = await terminal.addProductBySku(barcode, terminal.selectedOrderTypeId || 1);
      if (newKey) {
        setSelectedKey(newKey);
      }
    }
  });

  usePosShortcuts({
    onClearCart: handleClearCart,
    onHoldTicket: () => {},
    onCheckout: () => {}
  });

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

  useEffect(() => {
    if (status && (status.isDayClosed || status.isShiftClosed)) {
      if (!modals.isCashierSessionOpen) {
        modals.setIsCashierSessionOpen(true);
      }
    }
  }, [status, modals.isCashierSessionOpen, modals.setIsCashierSessionOpen]);

  return (
    <div className="flex h-dvh flex-col bg-[#ebe6e8] font-sans text-slate-900 overflow-hidden relative">
      <PosTopNav 
        onDelivery={() => modals.setIsDeliveryModalOpen(true)}
        onDriveThrough={() => modals.setIsDriveThroughModalOpen(true)}
        onProvider={() => {
          requestAuthorization({
            actionLabel: "Provider",
            permissionId: 5, // Provider
            onAuthorized: () => modals.setIsProviderModalOpen(true),
          });
        }}
        onCashierOut={() => {
          modals.setIsCashierSessionOpen(true);
        }}
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
                orderTypeId={terminal.selectedOrderTypeId || 1}
                onSelectProduct={handleSearchProductSelect}
                onSelectAlternative={handleSearchAltSelect}
                autoFocus={window.innerWidth >= 600 && !Capacitor.isNativePlatform()}
                className="max-w-[200px] md:max-w-xs"
              />
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
                    alternatives={alternatives}
                    activeSubCategoryId={terminal.activeSubCategoryId}
                    onSelectSubCategory={terminal.setSubCategory}
                    onBack={handleGridBack}
                    onAdd={handleProductSelect}
                    onSelectAlt={handleAltSelect}
                    onLongPress={stableOnLongPress}
                    categoryName={activeCategory?.name}
                    subCategoryName={activeSubCategory?.subCategoryName}
                    selectedProduct={selectedProduct}
                  />
                </ErrorBoundary>

                {!modals.isCartOpen && (
                  <button
                    onClick={() => modals.setIsCartOpen(true)}
                    className="md:hidden absolute bottom-4 right-4 z-40 bg-[#ff9500] hover:bg-[#e68600] text-white p-4 rounded-full shadow-2xl transition-transform active:scale-95 flex items-center justify-center"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                      <path d="M3 6h18" />
                      <path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                    {terminal.itemCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-[#fcf9fb]">
                        {terminal.itemCount}
                      </span>
                    )}
                  </button>
                )}
              </div>

              <PosActionButtons 
                onClearCart={handleRequestClearCart}
                onCustomer={() => {
                  if (isCreditProviderActive) {
                    showToast("Customer is locked to configured Post Account for Credit Provider orders", "warning");
                    return;
                  }
                  modals.setIsCustomerModalOpen(true);
                }}
                onWaiter={() => {}}
                onSplit={() => modals.setIsSplitOpen(true)}
                onCombine={() => modals.setIsCombineOpen(true)}
                onRecall={() => {
                  requestAuthorization({
                    actionLabel: "Recall",
                    permissionId: 6, // Recall
                    onAuthorized: () => modals.setIsRecallModalOpen(true),
                  });
                }}
                onMore={() => modals.setIsMoreModalOpen(true)}
                isOrderEditing={!!terminal.editingOrderId}
                isCustomerLocked={isCreditProviderActive}
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
          selectedTender={selectedTender}
          setSelectedTender={setSelectedTender}
          setIsMultiPayModalOpen={modals.setIsMultiPayModalOpen}
          setIsCashModalOpen={modals.setIsCashModalOpen}
          setIsDeliveryChargeModalOpen={modals.setIsDeliveryChargeModalOpen}
          tenderOptions={terminal.tenderOptions}
          onPrice={openPriceModal}
          onDiscount={discountFlow.openDiscountChoice}
          onVoidOrder={() => {
            requestAuthorization({
              actionLabel: "Order Void",
              permissionId: 17, // Order Void
              onAuthorized: () => modals.setIsVoidModalOpen(true),
            });
          }}
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
        authorizationModalKey={authorizationModalKey}
        authorizationModalProps={authorizationModalProps}
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
        handleItemComplimentary={handleItemComplimentary}
        handleBillComplimentary={handleBillComplimentary}
        handleClearCart={handleClearCart}
        handleCompleteSettlement={checkoutFlow.handleCompleteSettlement}
        resetTerminalState={resetTerminalState}
        setActiveProvider={setActiveProvider}
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
      />
    </div>
  );
};
