import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { orderApi } from "../../services/orderApi";
import { usePosProducts } from "./usePosProducts";
import { useAppSelector } from "../../../../app/hooks";
import { useCashierLog } from "../../cashier";
import type { SplitBucket, SplitCartItem } from "./useSplitBuckets";
import { calculateOrder, roundCalc, CALC_PRECISION, getTaxExclusivePrice } from "../utils/billing";
import { formatItemDisplayName } from "../../utils/alternativeHelpers";
import { sortOrderDetailsBySequence } from "../utils/orderSort";
import { mapOrderDetailToCartItem } from "../mappers/orderDetailToCartMapper";
import { checkOrderHasBillDiscount } from "../utils/orderDiscountCheck";

interface UseSplitOrderDataProps {
  orderId: number | null;
  authorizedEmployeeId?: number;
  isOpen: boolean;
  setBuckets: (buckets: SplitBucket[]) => void;
  setActiveBucketId: (id: string) => void;
  setSelectedMapId: (id: number | null) => void;
  setSelectedBucketId: (id: string | null) => void;
  buckets: SplitBucket[];
  ownsModifiers: (bucket: SplitBucket, itemMapId: number) => boolean;
  onSuccess: () => void;
  showToast: any;
  setShowTableModal: (show: boolean) => void;
}

export const useSplitOrderData = ({
  orderId,
  authorizedEmployeeId,
  isOpen,
  setBuckets,
  setActiveBucketId,
  setSelectedMapId,
  setSelectedBucketId,
  buckets,
  ownsModifiers,
  onSuccess,
  showToast,
  setShowTableModal
}: UseSplitOrderDataProps) => {
  const userId = useAppSelector((state) => state.auth.userId);
  const { products } = usePosProducts();
  const { status } = useCashierLog();
  const [originalOrder, setOriginalOrder] = useState<any>(null);

  const { data: orderDetailsData, isLoading: isLoadingOrder } = useQuery({
    queryKey: ['orderDetails', orderId],
    queryFn: () => orderApi.getOrderDetails(orderId!),
    enabled: isOpen && !!orderId,
  });

  useEffect(() => {
    if (!isOpen || !orderId) {
      setBuckets([]);
      setOriginalOrder(null);
      return;
    }

    if (orderDetailsData) {
      try {
        const res = orderDetailsData;
        const masterData = res.data?.masterData || res.masterData || {};
        const detailsData = sortOrderDetailsBySequence(res.data?.detailsData || res.detailsData || []);
        const rawModifiersData = res.data?.modifiersData || res.modifiersData || [];
        
        // Deduplicate modifiersData (backend SQL JOIN Cartesian product fix)
        const seenMods = new Set<string>();
        const modifiersData = rawModifiersData.filter((m: any) => {
          const key = `${m.mapId}-${m.modifierId}`;
          if (seenMods.has(key)) return false;
          seenMods.add(key);
          return true;
        });

        setOriginalOrder(masterData);

        const isOrderBillDisc = checkOrderHasBillDiscount(orderDetailsData) || checkOrderHasBillDiscount({ masterData, detailsData });
        const masterDiscPer = Number(masterData.discPer ?? masterData.DiscPer ?? masterData.billDiscountPer ?? 0);
        const masterDiscAmount = Number(
          masterData.discAmount ??
          masterData.DiscAmount ??
          masterData.discAmt ??
          masterData.billDiscount ??
          masterData.billDiscountValue ??
          0
        );
        const isMasterComplimentary = Boolean(
          masterData.complimentaryStatus || masterData.ComplimentaryStatus || masterDiscPer === 100
        );

        // Total gross across details to allocate order-level amount discounts proportionally
        const totalGross = detailsData.reduce((sum: number, d: any) => sum + (Number(d.price || 0) * Number(d.qty || 1)), 0);

        const initialItems: SplitCartItem[] = detailsData.map((d: any, idx: number) => {
          const itemMods = modifiersData.filter((m: any) => m.mapId === d.mapId);
          const cartItem = mapOrderDetailToCartItem({
            detail: d,
            idx,
            modifiersData,
            products,
            masterDiscPer: 0,
            isOrderBillDiscount: false,
          });

          const rawAlt = d.altName || d.AltName || d.variantName || d.VariantName || cartItem.variantName || "";
          const baseName = d.productName || d.ProductName || cartItem.product?.name || "Item";
          const displayName = formatItemDisplayName(baseName, rawAlt);

          // In Split, bill discount or complimentary is distributed into products as item discounts
          let resolvedItemDiscountValue = 0;
          let resolvedItemDiscountType: "percentage" | "amount" = "percentage";
          let resolvedItemComplimentary = false;

          if (isMasterComplimentary) {
            resolvedItemDiscountValue = 100;
            resolvedItemDiscountType = "percentage";
            resolvedItemComplimentary = true;
          } else if (masterDiscPer > 0) {
            resolvedItemDiscountValue = masterDiscPer;
            resolvedItemDiscountType = "percentage";
          } else if (masterDiscAmount > 0 && isOrderBillDisc) {
            const lineGross = Number(d.price || 0) * Number(d.qty || 1);
            const allocatedDisc = totalGross > 0 ? (masterDiscAmount * (lineGross / totalGross)) : (masterDiscAmount / detailsData.length);
            resolvedItemDiscountValue = roundCalc(allocatedDisc, CALC_PRECISION);
            resolvedItemDiscountType = "amount";
          } else {
            resolvedItemDiscountValue = cartItem.discountValue || 0;
            resolvedItemDiscountType = cartItem.discountType || "percentage";
            resolvedItemComplimentary = Boolean(cartItem.complimentaryStatus);
          }

          return {
            mapId: d.mapId,
            name: displayName,
            variantName: rawAlt || undefined,
            price: cartItem.price || 0,
            currentQty: d.qty || 1,
            discountValue: resolvedItemDiscountValue,
            discountType: resolvedItemDiscountType,
            complimentaryStatus: resolvedItemComplimentary,
            detail: {
              ...d,
              vatValue: cartItem.product?.vatValue ?? (cartItem as any).vatValue,
              vatId: cartItem.product?.sVatId,
            },
            modifiers: itemMods,
            isIncl: Boolean(cartItem.isIncl),
          };
        });

        setBuckets([
          { id: "base", isBase: true, items: initialItems },
          { id: "split-1", isBase: false, items: [] }
        ]);
        setActiveBucketId("split-1");
        setSelectedMapId(null);
        setSelectedBucketId(null);
      } catch (err: any) {
        console.error(err);
        showToast("Failed to parse order details", "error");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderDetailsData, isOpen, orderId]);

  const generateBucketData = (bucket: SplitBucket, tableId?: number, sectionId?: number) => {
    const cartItems = bucket.items.map(item => {
      const extras = ownsModifiers(bucket, item.mapId)
        ? (item.modifiers || []).filter(m => m.price > 0).map(m => ({
            id: m.modifierId ?? m.ModifierId ?? m.id ?? m.Id,
            name: m.modifierName || m.name || "Extra",
            price: m.price,
            qty: m.qty || 1,
            typeId: m.typeId || 1
          }))
        : [];
      return {
        uniqueId: String(item.mapId),
        productId: item.detail?.productId ?? item.detail?.ProductId ?? 1,
        quantity: item.currentQty,
        price: item.price,
        isIncl: item.isIncl,
        discountValue: item.discountValue || 0,
        discountType: item.discountType,
        complimentaryStatus: item.complimentaryStatus,
        extras,
        product: {
          id: item.detail?.productId ?? 1,
          name: item.name,
          price: item.price,
          categoryId: 0,
          vatValue: item.detail?.vatValue,
          sVatId: item.detail?.vatId
        }
      };
    });

    const result = calculateOrder(cartItems, {
      orderType: originalOrder?.orderTypeName || "DineIn"
    });

    const details = bucket.items.map((item, index) => {
      const newMapId = index + 1;
      const lineCalc = result.lines[index];
      const pId = item.detail?.productId ?? item.detail?.ProductId ?? item.detail?.itemId ?? item.detail?.ItemId;

      const exclPrice = roundCalc(lineCalc?.basePrice ?? lineCalc?.exclusivePrice ?? getTaxExclusivePrice(item), CALC_PRECISION);
      const lineNet = roundCalc(lineCalc?.lineNetAmount ?? (exclPrice * item.currentQty + (lineCalc?.vatAmount || 0)));

      const itemDiscPer = item.discountType === 'percentage' ? (item.discountValue || 0) : 0;
      const itemDiscAmount = roundCalc(lineCalc?.itemDiscountAmount ?? lineCalc?.effectiveDiscountAmount ?? 0);

      return {
        ...item.detail,
        mapId: newMapId,
        productId: pId,
        qty: item.currentQty,
        price: exclPrice,
        netAmount: lineNet,
        vatAmount: roundCalc(lineCalc?.mainVatAmount ?? lineCalc?.vatAmount ?? 0),
        serviceCharge: roundCalc(lineCalc?.mainSc ?? lineCalc?.sc ?? 0),
        levy: roundCalc(lineCalc?.mainLevy ?? lineCalc?.levy ?? 0),
        discPer: itemDiscPer,
        discAmount: itemDiscAmount,
        complimentaryStatus: Boolean(item.complimentaryStatus || item.discountValue === 100),
        ComplimentaryStatus: Boolean(item.complimentaryStatus || item.discountValue === 100),
      };
    });

    const modifiers: any[] = [];
    bucket.items.forEach((item, index) => {
      const newMapId = index + 1;
      if (ownsModifiers(bucket, item.mapId)) {
        item.modifiers.forEach(m => {
          const mId = m.modifierId ?? m.ModifierId ?? m.id ?? m.Id;
          modifiers.push({
            ...m,
            mapId: newMapId,
            modifierId: mId,
            qty: m.qty || 1,
            amount: roundCalc(m.amount || (m.price * (m.qty || 1)))
          });
        });
      }
    });

    return {
      order: {
        sectionId: sectionId || originalOrder?.sectionId || 0,
        tableId: tableId || originalOrder?.tableId || 0,
        guestNo: originalOrder?.guestNo || 0,
        serviceCharge: roundCalc(result.summary.totalServiceCharge),
        levy: roundCalc(result.summary.totalLevy),
        vatExclAmount: roundCalc(result.summary.vatExclAmount),
        vatAmount: roundCalc(result.summary.tax),
        netAmount: roundCalc(result.summary.total)
      },
      details,
      modifiers
    };
  };

  const splitMutation = useMutation({
    mutationFn: async (tableAssignments: { bucketId: string; sectionId: number; tableId: number }[]) => {
      const baseBucket = buckets.find(b => b.isBase)!;
      const baseAssignment = tableAssignments.find(a => a.bucketId === 'base');
      const baseData = generateBucketData(baseBucket, baseAssignment?.tableId, baseAssignment?.sectionId);
      
      const newOrders = buckets
        .filter(b => !b.isBase && b.items.length > 0)
        .map(b => {
          const assignment = tableAssignments.find(a => a.bucketId === b.id);
          return generateBucketData(b, assignment?.tableId, assignment?.sectionId);
        });

      const commonPayload = {
        voucherDate: new Date().toISOString(),
        customerId: originalOrder?.customerId || 0,
        employeeId: authorizedEmployeeId || (userId ? Number(userId) : 0),
        dayId: status?.dayId || originalOrder?.dayId || 0,
        shiftId: status?.shiftId || originalOrder?.shiftId || 0,
        createdAt: new Date().toISOString(),
        orderTypeId: originalOrder?.orderTypeId || 0,
        vehicleCustomerName: originalOrder?.vehicleCustomerName || "",
        vehicleNo: originalOrder?.vehicleNo || "",
        addressId: originalOrder?.addressId || 0,
        missedCall: originalOrder?.missedCall || false,
        contactNo: originalOrder?.contactNo || "",
        note: originalOrder?.note || "",
        change: originalOrder?.change || "",
        isComing: originalOrder?.isComing || false,
        comingTime: new Date().toISOString(),
        providerNo: originalOrder?.providerNo || "",
        discAmount: 0,
        discPer: 0
      };

      const payload = {
        orderId: orderId,
        ...commonPayload,
        baseOrder: baseData,
        newOrders: newOrders
      };

      console.log("--- SPLIT ORDER PAYLOAD ---", JSON.stringify(payload, null, 2));
      const res = await orderApi.splitOrder(payload as any);
      if (!res.isSuccess) {
        throw new Error(res.message || "Failed to split order");
      }
      return res;
    },
    onSuccess: () => {
      showToast("Order split successfully!", "success");
      onSuccess();
      setShowTableModal(false);
    },
    onError: (err: any) => {
      console.error(err);
      showToast(err.message || "Failed to split order", "error");
      setShowTableModal(false);
    }
  });

  const handleDone = () => {
    const hasSplits = buckets.some(b => !b.isBase && b.items.length > 0);
    if (!hasSplits) {
      showToast("No items have been moved to a split order.", "warning");
      return;
    }
    
    if (originalOrder?.orderTypeId === 1) {
      setShowTableModal(true);
    } else {
      splitMutation.mutate([]);
    }
  };

  return {
    originalOrder,
    isLoadingOrder,
    isSaving: splitMutation.isPending,
    submitSplitOrder: splitMutation.mutate,
    handleDone
  };
};
