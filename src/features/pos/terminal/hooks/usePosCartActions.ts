import { useState } from "react";
import { getDecimalPart } from "../../../../utils/currency";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import { useToast } from "../../../../app/providers/useToast";
import { orderApi } from "../../services/orderApi";
import { POS_PRODUCTS } from "../../constants";
import type { MenuOrderRequest, MenuOrderUpdateRequest, PosCartItem } from "../../types";
import { menuApi } from "../../services/menuApi";
import { productDataCache } from "../hooks/usePosProducts";
import { addToCart, incrementItem, decrementItem, removeFromCart, clearCart, addVoidProduct, addVoidModifier, setOrderType, setTenderOption, setBillDiscount, setItemDiscount, setAllItemsDiscount, updateItemPrice, updateItemQty, setItemCustomizations, setCustomerId, setAddressId, setChange } from "../store/posSlice";
import { selectCartDetails, selectSubtotal, selectDiscount, selectTax, selectTotal, selectCharges, selectTotalServiceCharge, selectTotalLevy, selectItemCount, selectTotalExtras, selectBaseSubtotal, selectDeliveryCharge } from "../store/posSelectors";
import { getBillingConfig } from "../utils/billing";

export const usePosCartActions = () => {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const cartDetails = useAppSelector(selectCartDetails);
  const subtotal = useAppSelector(selectSubtotal);
  const discount = useAppSelector(selectDiscount);
  const tax = useAppSelector(selectTax);
  const charges = useAppSelector(selectCharges);
  const totalServiceCharge = useAppSelector(selectTotalServiceCharge);
  const totalLevy = useAppSelector(selectTotalLevy);
  const total = useAppSelector(selectTotal);
  const deliveryCharge = useAppSelector(selectDeliveryCharge);
  const itemCount = useAppSelector(selectItemCount);
  const totalExtras = useAppSelector(selectTotalExtras);
  const baseSubtotal = useAppSelector(selectBaseSubtotal);
  const waiterName = useAppSelector((state: any) => state.pos.waiterName);
  const {
    orderTypes,
    selectedOrderTypeId,
    selectedOrderTypeName,
    selectedTender,
    selectedCustomerId,
    selectedAddressId,
    selectedSectionId,
    selectedTableId,
    selectedTableNo,
    guestNo,
    missedCall,
    contactNo,
    note,
    change,
    isComing,
    comingTime,
    vehicleCustomerName,
    vehicleNo,
    billDiscountType,
    billDiscountValue,
    editingOrderId,
    voidProducts,
    voidModifiers,
    combinedOrderIds,
    isSettling,
    productCache,
  } = useAppSelector((state) => state.pos);

  const addProduct = (
    productId: number, 
    variantName?: string, 
    price?: number, 
    isIncl?: boolean,
    discountValue?: number,
    discountType?: 'percentage' | 'amount',
    unitId?: number
  ) => {
    const targetPrice = price ?? 0;
    
    const matchVariant = (a?: string, b?: string) => {
      const getNormalizedVariant = (name?: string) => {
        const n = (name || '').toLowerCase().trim();
        if (!n || n === 'main' || n === 'variation') return 'main';
        return n;
      };
      return getNormalizedVariant(a) === getNormalizedVariant(b);
    };

    const existing = cartDetails.find(item => 
      item.productId === productId && 
      matchVariant(item.variantName, variantName) &&
      Number(item.product.price) === Number(targetPrice) &&
      item.isIncl === isIncl &&
      (!item.extras || item.extras.length === 0) &&
      (!item.modifiers || item.modifiers.length === 0)
    );

    if (existing) {
      dispatch(addToCart({ uniqueId: existing.uniqueId, productId, variantName, price: targetPrice, isIncl, discountValue, discountType, unitId }));
      return existing.uniqueId;
    } else {
      const uniqueId = `${productId}-${variantName || 'main'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      dispatch(addToCart({ uniqueId, productId, variantName, price: targetPrice, isIncl, discountValue, discountType, unitId }));
      return uniqueId;
    }
  };

  const addProductBySku = async (sku: string, orderTypeId?: number) => {
    const cachedProducts = Object.values(productCache || {});
    const product = cachedProducts.find((p) => p.sku?.toLowerCase() === sku.toLowerCase())
      || POS_PRODUCTS.find((p) => p.sku?.toLowerCase() === sku.toLowerCase());

    if (product) {
      const safeOrderTypeId = orderTypeId || 1;
      const cacheKey = `${product.id}-${safeOrderTypeId}`;
      let cachedData = productDataCache[cacheKey];

      if (!product.hasAlternatives) {
        if (!cachedData) {
          try {
            cachedData = await menuApi.getProductData(product.id, safeOrderTypeId);
            productDataCache[cacheKey] = cachedData;
          } catch (err) {
            console.error("Failed to fetch product data for barcode scan", err);
          }
        }
      }

      let isIncl = product.isIncl;
      let targetPrice = product.price || 0;
      let promoPrice: number | undefined = undefined;
      let promoIsIncl: boolean | undefined = undefined;

      if (cachedData) {
        isIncl = cachedData.isIncl;
        targetPrice = cachedData.price;
        promoPrice = cachedData.promoPrice;
        promoIsIncl = cachedData.promoIsIncl;
      }

      let discountValue: number | undefined = undefined;
      let discountType: 'percentage' | 'amount' | undefined = undefined;

      if (promoPrice !== undefined && promoPrice > 0 && targetPrice > 0) {
        const diff = targetPrice - promoPrice;
        if (diff > 0) {
          discountValue = Number(((diff / targetPrice) * 100).toFixed(4));
          discountType = 'percentage';
        }
        if (promoIsIncl !== undefined) {
          isIncl = promoIsIncl;
        }
      }

      const existing = cartDetails.find(item => 
        item.productId === product.id && 
        (!item.variantName || item.variantName.toLowerCase().trim() === 'main') &&
        Number(item.product.price) === Number(targetPrice) &&
        item.isIncl === isIncl &&
        (!item.extras || item.extras.length === 0) &&
        (!item.modifiers || item.modifiers.length === 0)
      );

      if (existing) {
        dispatch(addToCart({ uniqueId: existing.uniqueId, productId: product.id, price: targetPrice, isIncl, discountValue, discountType }));
        return existing.uniqueId;
      } else {
        const uniqueId = `${product.id}-main-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        dispatch(addToCart({ uniqueId, productId: product.id, price: targetPrice, isIncl, discountValue, discountType }));
        return uniqueId;
      }
    }
    return null;
  };
  const getPackagerPrintConfig = () => {
    try {
      for (const key of ['posConfigs', 'posConfig', 'pos_configs']) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const configs = parsed?.configs || parsed;
        const val =
          configs?.packagerPrint ??
          configs?.packagerprint ??
          configs?.PackagerPrint ??
          parsed?.packagerPrint ??
          parsed?.packagerprint ??
          parsed?.PackagerPrint;
        
        if (val !== undefined && val !== null) {
          const isEnabled =
            val === true ||
            String(val).toLowerCase() === 'enable' ||
            String(val).toLowerCase() === 'true' ||
            String(val).toLowerCase() === '1';

          const headerVal =
            configs?.packagerHeader ??
            configs?.packagerheader ??
            configs?.PackagerHeader ??
            parsed?.packagerHeader ??
            parsed?.packagerheader ??
            parsed?.PackagerHeader;

          const showHeader = headerVal === undefined || headerVal === null || (
            headerVal !== false &&
            String(headerVal).toLowerCase() !== 'disable' &&
            String(headerVal).toLowerCase() !== 'false' &&
            String(headerVal).toLowerCase() !== '0'
          );

          const enableVat =
            configs?.VatStatus === true ||
            String(configs?.VatStatus).toLowerCase() === 'true' ||
            parsed?.VatStatus === true ||
            String(parsed?.VatStatus).toLowerCase() === 'true';

          console.log("[getPackagerPrintConfig] Resolved from storage:", { enabled: isEnabled, showHeader, enableVat, rawVal: val });
          return { enabled: isEnabled, showHeader, enableVat };
        }
      }

      const directPrint = localStorage.getItem('packagerPrint') || localStorage.getItem('cachedPackagerPrint');
      const isEnabled = directPrint === 'Enable' || directPrint === 'true' || directPrint === '1';
      console.log("[getPackagerPrintConfig] Fallback resolved:", { enabled: isEnabled, directPrint });
      return { enabled: isEnabled, showHeader: true, enableVat: false };
    } catch (e) {
      console.error("[getPackagerPrintConfig] Error:", e);
      return { enabled: false, showHeader: true, enableVat: false };
    }
  };

  const getDirectSettleOrderPayload = (session: { employeeId?: number; userId?: number; customerId?: number; providerId?: number; providerOrderNo?: string; transDate?: string }) => {
    const isDineIn = (selectedOrderTypeName || "").toLowerCase().replace(/[\s_-]/g, "").includes("dinein");
    const config = getBillingConfig(selectedOrderTypeName || "DineIn");
    const rawTransDate = (session as any).transDate || localStorage.getItem("transDate") || new Date().toISOString();
    const activeTransDate = rawTransDate.split("T")[0];

    return {
      orderId: editingOrderId || 0,
      customerId: session.customerId || selectedCustomerId || 1,
      employeeId: session.employeeId ?? session.userId ?? 1,
      transDate: activeTransDate,
      discAmount: Number(discount.toFixed(getDecimalPart())),
      discPer: billDiscountType === 'percentage' ? billDiscountValue : 0,
      serviceCharge: Number(totalServiceCharge.toFixed(getDecimalPart())),
      levy: Number(totalLevy.toFixed(getDecimalPart())),
      vatExclAmount: Number(subtotal.toFixed(getDecimalPart())),
      vatAmount: Number(tax.toFixed(getDecimalPart())),
      netAmount: Number(total.toFixed(getDecimalPart())),
      deliveryCharge: Number(deliveryCharge.toFixed(getDecimalPart())),
      updatedAt: new Date().toISOString(),
      orderTypeId: session.providerId || selectedOrderTypeId,
      sectionId: isDineIn ? selectedSectionId : 0,
      tableId: isDineIn ? selectedTableId : 0,
      tableNo: isDineIn ? selectedTableNo : "",
      guestNo: guestNo || 0,
      vehicleCustomerName: selectedOrderTypeName.toLowerCase().includes("drive")
        ? vehicleCustomerName || localStorage.getItem("driveThruCustomerName") || ""
        : "",
      vehicleNo: selectedOrderTypeName.toLowerCase().includes("drive")
        ? vehicleNo || localStorage.getItem("driveThruVehicleNo") || ""
        : "",
      addressId: selectedAddressId || 0,
      missedCall,
      contactNo,
      note,
      change,
      isComing,
      comingTime: comingTime || new Date().toISOString(),
      providerId: session.providerId || 0,
      providerOrderNo: session.providerOrderNo || "",
      providerNo: session.providerOrderNo || "",
      driverId: Number(localStorage.getItem("selectedDriverId") || 0),
      details: cartDetails.map((item, index) => {
        const mapId = item.mapId || (Math.max(0, ...cartDetails.map(i => i.mapId || 0), ...voidProducts.map(v => v.mapId || 0)) + index + 1);
        
        let mainNetAmount = item.lineTotal;
        let mainVatAmount = item.vatAmount;
        let mainSc = item.sc;
        let mainLevy = item.levy;

        (item.extras || []).forEach(extra => {
           const activeVatRate = (item.product as any).vatValue !== undefined ? (item.product as any).vatValue / 100 : (config.vatRate || 0);
           const actualExtraPrice = extra.price / (1 + activeVatRate);
           const extraBase = actualExtraPrice * extra.qty;
           const proportion = item.amount > 0 ? (extraBase / item.amount) : 0;
           const extraVat = item.vatAmount * proportion;
           const extraSc = item.sc * proportion;
           const extraLevy = item.levy * proportion;
           const extraNet = item.lineTotal * proportion;

           mainNetAmount -= extraNet;
           mainVatAmount -= extraVat;
           mainSc -= extraSc;
           mainLevy -= extraLevy;
        });

        return {
          productId: item.productId || item.product?.id,
          unitId: item.unitId || item.product?.unitId || 1,
          qty: item.quantity,
          price: Number((item.price ?? item.product?.price ?? 0).toFixed(getDecimalPart())),
          discPer: item.discountType === 'percentage' ? Number((item.discountValue || 0).toFixed(getDecimalPart())) : 0,
          discAmount: item.discountType === 'amount' ? Number((item.discountValue || 0).toFixed(getDecimalPart())) : 0,
          serviceCharge: Number(mainSc.toFixed(getDecimalPart())),
          levy: Number(mainLevy.toFixed(getDecimalPart())),
          vatId: (item.product as any).sVatId || 1,
          vatAmount: Number(mainVatAmount.toFixed(getDecimalPart())),
          netAmount: Number(mainNetAmount.toFixed(getDecimalPart())),
          mapId: mapId,
          complimentaryStatus: false,
          baseQty: item.quantity
        };
      }),
      modifiers: cartDetails.flatMap((item, index) => {
        const mapId = item.mapId || (Math.max(0, ...cartDetails.map(i => i.mapId || 0), ...voidProducts.map(v => v.mapId || 0)) + index + 1);
        
        const extrasRows = (item.extras || []).map(extra => ({
          mapId: mapId,
          modifierId: extra.id,
          qty: extra.qty,
          price: Number(extra.price.toFixed(getDecimalPart())),
          amount: Number((extra.price * extra.qty).toFixed(getDecimalPart())),
          typeId: extra.typeId
        }));

        const modifierRows = (item.modifiers || []).map(mod => ({
          mapId: mapId,
          modifierId: mod.id,
          qty: mod.qty || 1,
          price: 0,
          amount: 0,
          typeId: mod.typeId
        }));

        const messageRows = (item.messages || []).map(msg => ({
          mapId: mapId,
          modifierId: msg.id || 0,
          qty: 1,
          price: 0,
          amount: 0,
          typeId: 1
        }));

        return [...extrasRows, ...modifierRows, ...messageRows];
      }),
      voidProducts: voidProducts.map(vp => ({
        productId: vp.productId,
        unitId: vp.unitId,
        qty: vp.qty,
        amount: vp.amount,
        mapId: vp.mapId
      })),
      voidModifiers: voidModifiers.filter(vm => !voidProducts.some(vp => vp.mapId === vm.mapId)),
      combinedOrderIds: combinedOrderIds
    };
  };

  const submitOrder = async (
    session: { dayId: number; shiftId: number; userId: number; employeeId?: number; customerId?: number; providerId?: number; providerOrderNo?: string; transDate?: string },
    shouldPrint: boolean = true
  ) => {
    if (cartDetails.length === 0) {
      showToast("Cart is empty", "warning");
      return;
    }

    const normalizedTypeName = (selectedOrderTypeName || "").toLowerCase().replace(/[\s_-]/g, "");
    const isTakeOut = selectedOrderTypeId === 2 || normalizedTypeName.includes("takeout") || normalizedTypeName.includes("takeaway") || normalizedTypeName.includes("drive") || normalizedTypeName.includes("delivery");
    const isDineIn = !isTakeOut && (selectedOrderTypeId === 1 || normalizedTypeName.includes("dinein"));
    
    // Skip table/section validation when editing an existing recalled order —
    // the table is already assigned on the backend and will be preserved in the PUT payload.
    if (isDineIn && !editingOrderId && !session.providerId && (!selectedSectionId || selectedSectionId <= 0 || !selectedTableId || selectedTableId <= 0)) {
      showToast("Please select a Dine In Section / Table before placing the order.", "warning");
      return;
    }

    const isDelivery = selectedOrderTypeId === 4 || normalizedTypeName.includes("delivery");
    if (isDelivery) {
      if (!selectedCustomerId || selectedCustomerId <= 0) {
        showToast("Please select a customer for Delivery orders.", "warning");
        return;
      }
      if (!selectedAddressId || selectedAddressId <= 0) {
        showToast("Please select a delivery address.", "warning");
        return;
      }
    }

    setOrderLoading(true);
    setOrderError(null);

    try {
      const basePayload = getDirectSettleOrderPayload(session);
      
      if (editingOrderId) {
        const updatePayload = basePayload;
        const invalidDetail = updatePayload.details.find(d => !d.productId || d.productId === 0);
        if (invalidDetail) {
          throw new Error(`CRITICAL: A cart item is missing a valid productId!`);
        }

        console.log("[UPDATE ORDER PAYLOAD]:", updatePayload);
        const response = await orderApi.updateOrder(editingOrderId, updatePayload as MenuOrderUpdateRequest);
        if (response.isSuccess) {
          showToast("Order updated successfully!", "success");

          if (shouldPrint) {
            try {
              const orderId = editingOrderId;
              let orderNoStr = String(orderId);
              let ticketNoStr = String(orderId);
              let orderTypeStr = selectedOrderTypeName || "DINE IN";
              let waiterStr = localStorage.getItem("employeeName") || "Cashier";
              let sectionStr = selectedSectionId ? String(selectedSectionId) : "Main";
              let tableStr = selectedTableId ? String(selectedTableId) : "T1";
              let vehicleNoStr = vehicleNo || localStorage.getItem("driveThruVehicleNo") || "";
              let customerNameStr = vehicleCustomerName || localStorage.getItem("driveThruCustomerName") || "";

                let masterData: any = null;
                try {
                  const detailsRes = await orderApi.getOrderDetails(orderId);
                  masterData = detailsRes?.data?.masterData || detailsRes?.masterData || detailsRes?.data?.master || detailsRes?.master;
                  if (masterData) {
                    orderNoStr = masterData.orderNo ? String(masterData.orderNo) : orderNoStr;
                    ticketNoStr = masterData.ticketNo ? String(masterData.ticketNo) : ticketNoStr;
                    orderTypeStr = masterData.orderType || masterData.orderTypeName || orderTypeStr;
                    waiterStr = masterData.employeeName || waiterStr;
                    sectionStr = masterData.sectionName || sectionStr;
                    tableStr = masterData.tableNo || tableStr;
                    vehicleNoStr = masterData.vehicleNo || vehicleNoStr;
                    customerNameStr = masterData.deliveryCustomerName || masterData.vehicleCustomerName || masterData.customerName || customerNameStr;
                  }
                } catch (e) {
                  console.error("Failed to fetch order details for updated KOT printing:", e);
                }

                const { printerSettingsApi } = await import("../../services/printerSettingsApi");
                const { printHtmlReceipt } = await import("../../services/qzService");
                const { generateKotHtml } = await import("../../utils/kotTemplate");
                const { executeKotRouting } = await import("../../utils/printerRouting");
   
                const commonPrintData = {
                  orderNo: orderNoStr,
                  ticketNo: ticketNoStr,
                  waiter: waiterStr,
                  counter: "Main",
                  section: sectionStr,
                  table: tableStr,
                  orderType: orderTypeStr,
                  orderTypeId: selectedOrderTypeId,
                  vehicleNo: vehicleNoStr,
                  customerName: customerNameStr,
                  contactNo: (masterData as any)?.mobileNo || (masterData as any)?.contactNo || contactNo || "",
                  flatNo: (masterData as any)?.flatNo || "",
                  buildingNo: (masterData as any)?.buildingNo || "",
                  blockNo: (masterData as any)?.blockNo || "",
                  roadNo: (masterData as any)?.roadNo || "",
                  area: (masterData as any)?.area || "",
                  providerNo: (masterData as any)?.providerOrderNo || session.providerOrderNo || "",
                };
  
                const reorderItems = cartDetails
                  .filter(item => !item.isExisting || item.quantity > (item.originalQty || 0))
                  .map(item => {
                    const diffQty = item.isExisting ? item.quantity - (item.originalQty || 0) : item.quantity;
                    const ratio = item.quantity > 0 ? diffQty / item.quantity : 0;
                
                return {
                  ...item,
                  quantity: diffQty,
                  lineTotal: item.lineTotal * ratio,
                  extras: (item.extras || []).map(ex => ({
                    ...ex,
                    qty: (ex.qty || 1) * ratio
                  })),
                  modifiers: (item.modifiers || []).map(mod => ({
                    ...mod,
                    qty: (mod.qty || 1) * ratio
                  }))
                };
              });

            if (reorderItems.length > 0) {
              await executeKotRouting(
                reorderItems,
                { ...commonPrintData, headerTitle: "RE-ORDER" },
                selectedSectionId,
                printerSettingsApi,
                printHtmlReceipt,
                generateKotHtml,
                true
              );
            }

            // Packager Print on Reorder / Update: Reprints the COMPLETE order data
            const packagerConfig = getPackagerPrintConfig();
            if (packagerConfig.enabled) {
              try {
                await new Promise(r => setTimeout(r, 250));
                const { generateGuestPrintHtml } = await import("../../utils/guestPrintTemplate");
                const { executePackagerPrint } = await import("../../utils/printerRouting");

                const packagerPrintData = {
                  ...commonPrintData,
                  subTotal: subtotal,
                  serviceCharge: totalServiceCharge,
                  levy: totalLevy,
                  vatAmount: tax,
                  netAmount: total,
                  deliveryCharge,
                  enableVat: packagerConfig.enableVat,
                  isPackager: true,
                  showCompanyHeader: packagerConfig.showHeader,
                };

                await executePackagerPrint(
                  cartDetails,
                  packagerPrintData,
                  printerSettingsApi,
                  printHtmlReceipt,
                  generateGuestPrintHtml
                );
              } catch (packErr) {
                console.error("[Packager Print Error on Reorder]", packErr);
              }
            }

            if (voidProducts.length > 0) {
              const voidCartItems = voidProducts.map((vp: any) => ({
                productId: vp.productId,
                quantity: vp.qty,
                price: vp.amount > 0 ? Number((vp.amount / vp.qty).toFixed(getDecimalPart())) : 0,
                lineTotal: vp.amount,
                product: { 
                  name: vp.productName || `Product #${vp.productId}`, 
                  price: vp.amount > 0 ? Number((vp.amount / vp.qty).toFixed(getDecimalPart())) : 0,
                  categoryId: vp.categoryId || 0
                },
                vatAmount: vp.vatAmount || 0,
                netAmount: vp.netAmount || (vp.amount + (vp.vatAmount || 0)),
                extras: voidModifiers
                          .filter(vm => vm.mapId === vp.mapId && vm.amount > 0)
                          .map(vm => ({ 
                            id: vm.modifierId, 
                            qty: vm.qty, 
                            price: vm.amount > 0 ? Number((vm.amount / vm.qty).toFixed(getDecimalPart())) : 0, 
                            name: "Extra" 
                          })),
                modifiers: []
              })) as any;

              await executeKotRouting(
                voidCartItems,
                { ...commonPrintData, headerTitle: "VOID ITEMS" },
                selectedSectionId,
                printerSettingsApi,
                printHtmlReceipt,
                generateKotHtml,
                true
              );
            }
          } catch (printErr: any) {
            console.error("[KOT Print Error]", printErr);
            showToast(`Order updated, but printing failed: ${printErr?.message || printErr?.toString()}`, "warning");
          }
        }

          dispatch(clearCart());
          localStorage.removeItem("driveThruVehicleNo");
          localStorage.removeItem("driveThruCustomerName");
          return response.data.id;
        } else {
          throw new Error(response.message || "Failed to update order");
        }
      }

      const rawTransDate = (session as any).transDate || localStorage.getItem("transDate") || new Date().toISOString();
      const activeTransDate = rawTransDate.split("T")[0];
      const resolvedCustomerId = session.customerId || selectedCustomerId || 1;
      const payload: MenuOrderRequest = {
        voucherDate: new Date().toISOString(),
        customerId: resolvedCustomerId,
        employeeId: session.employeeId ?? session.userId,
        dayId: session.dayId,
        shiftId: session.shiftId,
        transDate: activeTransDate,
        discAmount: Number(discount.toFixed(getDecimalPart())),
        discPer: billDiscountType === 'percentage' ? billDiscountValue : 0,
        serviceCharge: Number(totalServiceCharge.toFixed(getDecimalPart())),
        levy: Number(totalLevy.toFixed(getDecimalPart())),
        vatExclAmount: Number(subtotal.toFixed(getDecimalPart())),
        vatAmount: Number(tax.toFixed(getDecimalPart())),
        netAmount: Number(total.toFixed(getDecimalPart())),
        deliveryCharge: Number(deliveryCharge.toFixed(getDecimalPart())),
        createdAt: new Date().toISOString(),
        orderTypeId: session.providerId || selectedOrderTypeId,
        sectionId: isDineIn ? selectedSectionId : 0,
        tableId: isDineIn ? selectedTableId : 0,
        guestNo,
        addressId: selectedAddressId || 0,
        missedCall,
        contactNo,
        note,
        change,
        isComing,
        comingTime: comingTime || new Date().toISOString(),
        driverId: Number(localStorage.getItem("selectedDriverId") || 0),
        details: cartDetails.map((item, index) => {
          const mapId = index + 1;
          
          let mainNetAmount = item.lineTotal;
          let mainVatAmount = item.vatAmount;
          let mainSc = item.sc;
          let mainLevy = item.levy;

          (item.extras || []).forEach(extra => {
             const storedConfigStr = localStorage.getItem('posConfig');
             const storedConfig = storedConfigStr ? JSON.parse(storedConfigStr) : null;
             const activeVatRate = (item.product as any).vatValue !== undefined ? (item.product as any).vatValue / 100 : (storedConfig?.vatRate || 0);
             const actualExtraPrice = item.isIncl ? extra.price / (1 + activeVatRate) : extra.price;
             const extraBase = actualExtraPrice * extra.qty;
             const proportion = item.amount > 0 ? (extraBase / item.amount) : 0;
             const extraVat = item.vatAmount * proportion;
             const extraSc = item.sc * proportion;
             const extraLevy = item.levy * proportion;
             const extraNet = item.lineTotal * proportion;

             mainNetAmount -= extraNet;
             mainVatAmount -= extraVat;
             mainSc -= extraSc;
             mainLevy -= extraLevy;
          });

          return {
            productId: item.productId,
            unitId: item.unitId || item.product.unitId || 1,
            qty: item.quantity,
            price: Number((item.price ?? item.product?.price ?? 0).toFixed(getDecimalPart())),
            discPer: item.discountType === 'percentage' ? Number((item.discountValue || 0).toFixed(getDecimalPart())) : 0,
            discAmount: item.discountType === 'amount' ? Number((item.discountValue || 0).toFixed(getDecimalPart())) : 0,
            serviceCharge: Number(mainSc.toFixed(getDecimalPart())),
            levy: Number(mainLevy.toFixed(getDecimalPart())),
            vatId: (item.product as any).sVatId || 1,
            vatAmount: Number(mainVatAmount.toFixed(getDecimalPart())),
            netAmount: Number(mainNetAmount.toFixed(getDecimalPart())),
            mapId: mapId,
            complimentaryStatus: false,
            baseQty: 1
          };
        }),
        modifiers: cartDetails.flatMap((item, index) => {
          const mapId = index + 1;
          
          const extrasRows = (item.extras || []).map(extra => ({
            mapId: mapId,
            modifierId: extra.id,
            qty: extra.qty,
            price: Number(extra.price.toFixed(getDecimalPart())),
            amount: Number((extra.price * extra.qty).toFixed(getDecimalPart())),
            typeId: extra.typeId
          }));

          const modifierRows = (item.modifiers || []).map(mod => ({
            mapId: mapId,
            modifierId: mod.id,
            qty: mod.qty || 1,
            price: 0,
            amount: 0,
            typeId: mod.typeId
          }));

          const messageRows = (item.messages || []).map(msg => ({
            mapId: mapId,
            modifierId: msg.id || 0,
            qty: 1,
            price: 0,
            amount: 0,
            typeId: 1
          }));

          return [...extrasRows, ...modifierRows, ...messageRows];
        }),
        vehicleNo: selectedOrderTypeName.toLowerCase().includes("drive")
          ? vehicleNo || localStorage.getItem("driveThruVehicleNo") || ""
          : "",
        vehicleCustomerName: selectedOrderTypeName.toLowerCase().includes("drive")
          ? vehicleCustomerName || localStorage.getItem("driveThruCustomerName") || ""
          : "",
        providerId: session.providerId || 0,
        providerOrderNo: session.providerOrderNo || "",
        providerNo: session.providerOrderNo || "",
      };

      console.log("[SUBMIT ORDER PAYLOAD]:", payload);
      const response = await orderApi.submitOrder(payload);
      if (response.isSuccess) {
        showToast("Order submitted successfully!", "success");

        if (shouldPrint) {
          try {
            const orderId = response.data.id;
            let orderNoStr = String(orderId);
            let ticketNoStr = String(orderId);
            let orderTypeStr = selectedOrderTypeName || "DINE IN";
            let waiterStr = localStorage.getItem("employeeName") || "Cashier";
            let sectionStr = selectedSectionId ? String(selectedSectionId) : "Main";
            let tableStr = selectedTableId ? String(selectedTableId) : "T1";
            let vehicleNoStr = vehicleNo || localStorage.getItem("driveThruVehicleNo") || "";
            let customerNameStr = vehicleCustomerName || localStorage.getItem("driveThruCustomerName") || "";

          let masterData: any = null;
          try {
            const detailsRes = await orderApi.getOrderDetails(orderId);
            masterData = detailsRes?.data?.masterData || detailsRes?.masterData || detailsRes?.data?.master || detailsRes?.master;
            if (masterData) {
              orderNoStr = masterData.orderNo ? String(masterData.orderNo) : orderNoStr;
              ticketNoStr = masterData.ticketNo ? String(masterData.ticketNo) : ticketNoStr;
              orderTypeStr = masterData.orderType || masterData.orderTypeName || orderTypeStr;
              waiterStr = masterData.employeeName || waiterStr;
              sectionStr = masterData.sectionName || sectionStr;
              tableStr = masterData.tableNo || tableStr;
              vehicleNoStr = masterData.vehicleNo || vehicleNoStr;
              customerNameStr = masterData.deliveryCustomerName || masterData.vehicleCustomerName || masterData.customerName || customerNameStr;
            }
          } catch (e) {
            console.error("Failed to fetch order details for KOT printing:", e);
          }

          const { printerSettingsApi } = await import("../../services/printerSettingsApi");
          const { printHtmlReceipt } = await import("../../services/qzService");
          const { generateKotHtml } = await import("../../utils/kotTemplate");
          const { executeKotRouting } = await import("../../utils/printerRouting");

          const basePrintOptions = {
              orderNo: orderNoStr,
              ticketNo: ticketNoStr,
              waiter: waiterStr,
              counter: "Main",
              section: sectionStr,
              table: tableStr,
              orderType: orderTypeStr,
              orderTypeId: selectedOrderTypeId,
              vehicleNo: vehicleNoStr,
              customerName: customerNameStr,
              contactNo: (masterData as any)?.mobileNo || (masterData as any)?.contactNo || contactNo || "",
              flatNo: (masterData as any)?.flatNo || "",
              buildingNo: (masterData as any)?.buildingNo || "",
              blockNo: (masterData as any)?.blockNo || "",
              roadNo: (masterData as any)?.roadNo || "",
              area: (masterData as any)?.area || "",
              providerNo: (masterData as any)?.providerOrderNo || session.providerOrderNo || "",
          };
          
          await executeKotRouting(
            cartDetails,
            basePrintOptions,
            selectedSectionId,
            printerSettingsApi,
            printHtmlReceipt,
            generateKotHtml,
            false // isUpdate
          );

          // Packager Print on New Order
          const packagerConfig = getPackagerPrintConfig();
          console.log("[PACKAGER PRINT TRIGGER CHECK]", { packagerConfig, cartCount: cartDetails.length });
          if (packagerConfig.enabled) {
            console.log("[PACKAGER PRINT EXECUTION STARTING...]");
            try {
              await new Promise(r => setTimeout(r, 250));
              const { generateGuestPrintHtml } = await import("../../utils/guestPrintTemplate");
              const { executePackagerPrint } = await import("../../utils/printerRouting");

              const packagerPrintData = {
                ...basePrintOptions,
                subTotal: subtotal,
                serviceCharge: totalServiceCharge,
                levy: totalLevy,
                vatAmount: tax,
                netAmount: total,
                deliveryCharge,
                enableVat: packagerConfig.enableVat,
                isPackager: true,
                showCompanyHeader: packagerConfig.showHeader,
              };

              await executePackagerPrint(
                cartDetails,
                packagerPrintData,
                printerSettingsApi,
                printHtmlReceipt,
                generateGuestPrintHtml
              );
              console.log("[PACKAGER PRINT EXECUTION COMPLETED]");
            } catch (packErr) {
              console.error("[Packager Print Error on New Order]", packErr);
            }
          } else {
            console.warn("[PACKAGER PRINT SKIPPED] packagerConfig.enabled is false");
          }
          } catch (printErr: any) {
            console.error("[KOT Print Error]", printErr);
            const errMsg = printErr?.message || printErr?.toString() || "Unknown error";
            showToast(`Order placed, but printing failed: ${errMsg}`, "warning");
          }
        }

        dispatch(clearCart());
        localStorage.removeItem("driveThruVehicleNo");
        localStorage.removeItem("driveThruCustomerName");
        return response.data.id;
      } else {
        throw new Error(response.message || "Failed to submit order");
      }
    } catch (err: any) {
      // Extract the actual backend error — handles .NET validation ProblemDetails
      const responseData = err?.response?.data;
      console.error("[ORDER ERROR]", responseData ? JSON.stringify(responseData, null, 2) : (err?.message || err));

      let msg = responseData?.message || "";
      
      if (responseData?.errors) {
        try {
          const fieldErrors = Object.entries(responseData.errors).map(([field, val]) => {
            if (Array.isArray(val)) return `${field}: ${val.join(", ")}`;
            if (typeof val === "string") return `${field}: ${val}`;
            return `${field}: ${JSON.stringify(val)}`;
          });
          const detailedErrors = fieldErrors.join(" | ");
          msg = msg ? `${msg} - Details: ${detailedErrors}` : detailedErrors;
        } catch {
          if (!msg) msg = responseData?.title || "Validation errors occurred";
        }
      }
      
      msg = msg || responseData?.title || err?.message || "Order submission failed";
      setOrderError(msg);
      showToast(msg, "error");



    } finally {
      setOrderLoading(false);
    }
  };

  return {
    cartDetails,
    subtotal,
    discount,
    tax,
    charges,
    total,
    itemCount,
    totalExtras,
    baseSubtotal,
    totalServiceCharge,
    totalLevy,
    orderTypes,
    selectedOrderTypeId,
    selectedOrderTypeName,
    selectedTender,
    selectedCustomerId,
    selectedAddressId,
    selectedSectionId,
    selectedTableId,
    guestNo,
    missedCall,
    contactNo,
    note,
    change,
    isComing,
    comingTime,
    vehicleCustomerName,
    vehicleNo,
    billDiscountType,
    billDiscountValue,
    waiterName,
    orderLoading,
    orderError,
    editingOrderId,
    voidProducts,
    voidModifiers,
    addProduct,
    addProductBySku,
    isSettling,
    getDirectSettleOrderPayload,
    submitOrder,
    incrementItem: (uniqueId: string) => dispatch(incrementItem({ uniqueId })),
    decrementItem: (uniqueId: string) => dispatch(decrementItem({ uniqueId })),
    removeItem: (uniqueId: string) => dispatch(removeFromCart({ uniqueId })),
    addVoidProduct: (payload: { productId: number; productName?: string; unitId: number; qty: number; amount: number; mapId: number }) => 
      dispatch(addVoidProduct(payload)),
    addVoidModifier: (payload: { mapId: number; modifierId: number; qty: number; amount: number; typeId?: number }) => 
      dispatch(addVoidModifier(payload)),
    clearCart: () => dispatch(clearCart()),
    setSelectedOrderType: (orderTypeId: number, orderType: string) => dispatch(setOrderType({ orderTypeId, orderType })),
    setSelectedTender: (id: string) => dispatch(setTenderOption(id)),
    setCustomerId: (id: number) => dispatch(setCustomerId(id)),
    setAddressId: (id: number) => dispatch(setAddressId(id)),
    setBillDiscount: (value: number, type: 'percentage' | 'amount') => dispatch(setBillDiscount({ value, type })),
    setAllItemsDiscount: (value: number, type: 'percentage' | 'amount') => dispatch(setAllItemsDiscount({ value, type })),
    setItemDiscount: (uniqueId: string, value: number, type: 'percentage' | 'amount') => 
      dispatch(setItemDiscount({ uniqueId, value, type })),
    updateItemPrice: (uniqueId: string, price: number) =>
      dispatch(updateItemPrice({ uniqueId, price })),
    updateItemQty: (uniqueId: string, quantity: number) =>
      dispatch(updateItemQty({ uniqueId, quantity })),
    setItemCustomizations: (uniqueId: string, extras?: PosCartItem["extras"], modifiers?: PosCartItem["modifiers"], messages?: PosCartItem["messages"]) =>
      dispatch(setItemCustomizations({ uniqueId, extras, modifiers, messages })),
    setChange: (value: string) => dispatch(setChange(value)),
  };
};
