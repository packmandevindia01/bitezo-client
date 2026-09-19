import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { orderApi } from "../../services/orderApi";
import { usePosProducts } from "./usePosProducts";
import { useAppSelector } from "../../../../app/hooks";
import { useCashierLog } from "../../cashier";
import type { SplitBucket, SplitCartItem } from "./useSplitBuckets";
import { calculateOrder, roundCalc } from "../utils/billing";

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
        const detailsData = res.data?.detailsData || res.detailsData || [];
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

        const initialItems: SplitCartItem[] = detailsData.map((d: any) => {
          const itemMods = modifiersData.filter((m: any) => m.mapId === d.mapId);
          
          let pId = d.productId ?? d.ProductId ?? d.itemId ?? d.ItemId ?? d.product?.id ?? d.Product?.id;
          let matchedProduct: any = null;
          if (pId) {
            matchedProduct = products.find(p => p.id === pId);
          }
          if (!matchedProduct && (d.productName || d.ProductName)) {
            matchedProduct = products.find(p => p.name === (d.productName || d.ProductName));
            if (matchedProduct) pId = matchedProduct.id;
          }
          const realProduct = matchedProduct || {};

          let itemIsIncl = true;
          // Try getting it from global config first (like recall modal does)
          try {
            const saved = localStorage.getItem('posConfigs');
            const full = saved ? JSON.parse(saved) : {};
            if (full?.configs?.priceView === 'Exclusive') {
              itemIsIncl = false;
            }
          } catch {}

          if (d.netAmount !== undefined && d.price !== undefined) {
            const lineBase = (d.price || 0) * (d.qty || 1);
            const discAmt = d.discAmount || 0;
            const vatAmt = d.vatAmount || 0;
            const netAmt = d.netAmount;
            
            if (Math.abs(netAmt - (lineBase - discAmt)) < 0.01) {
              itemIsIncl = true;
            } else if (Math.abs(netAmt - ((lineBase - discAmt) + vatAmt)) < 0.01) {
              itemIsIncl = false;
            } else if (realProduct.isIncl !== undefined && realProduct.isIncl !== null) {
              itemIsIncl = Boolean(realProduct.isIncl);
            }
          } else if (realProduct.isIncl !== undefined && realProduct.isIncl !== null) {
            itemIsIncl = Boolean(realProduct.isIncl);
          }

          let calculatedVatValue: number | undefined = undefined;
          if (d.vatAmount !== undefined && d.netAmount !== undefined && d.netAmount > 0) {
            const vatBase = d.netAmount - d.vatAmount;
            if (vatBase > 0) {
              calculatedVatValue = Math.round((d.vatAmount / vatBase) * 100);
            }
          }

          return {
            mapId: d.mapId,
            name: d.productName || d.ProductName,
            price: d.price || 0,
            currentQty: d.qty || 1,
            detail: {
              ...d,
              vatValue: d.vatValue ?? calculatedVatValue ?? realProduct.vatValue ?? undefined,
              vatId: d.vatId ?? realProduct.sVatId ?? undefined
            },
            modifiers: itemMods,
            isIncl: itemIsIncl
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
        discountValue: item.detail?.discPer || 0,
        discountType: item.detail?.discPer ? ('percentage' as const) : undefined,
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

      return {
        ...item.detail,
        mapId: newMapId,
        productId: pId,
        qty: item.currentQty,
        price: roundCalc(item.price),
        netAmount: roundCalc(lineCalc?.mainNetAmount ?? lineCalc?.lineTotal ?? 0),
        vatAmount: roundCalc(lineCalc?.mainVatAmount ?? lineCalc?.vatAmount ?? 0),
        serviceCharge: roundCalc(lineCalc?.mainSc ?? lineCalc?.sc ?? 0),
        levy: roundCalc(lineCalc?.mainLevy ?? lineCalc?.levy ?? 0),
        discPer: item.detail?.discPer || 0,
        discAmount: roundCalc(lineCalc?.effectiveDiscountAmount ?? (item.detail?.discAmount || 0)),
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
        vatExclAmount: roundCalc(result.summary.subtotal),
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
