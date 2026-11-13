import { orderTypeNameFromId } from "../../../../utils/providerOrderType";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Modal, ConfirmDialog } from "../../../../../../components/common";
import { formatCurrency } from "../../../../../../utils/currency";
import { usePosProducts } from "../../../hooks/usePosProducts";
import { orderApi } from "../../../../services/orderApi";
import { useAppSelector } from "../../../../../../app/hooks";
import { useToast } from "../../../../../../app/providers/useToast";
import { PosSplitTableModal } from "./PosSplitTableModal";
import { calculateLineItem, calculateOrder, roundCalc, CALC_PRECISION, getBillingConfigForOrder, getPriceView, getDiscountCalculation, toPricingSettings } from "../../../utils/billing";
import { storedLineToCartPricing, deriveOrderChargeRatesFromMaster, priceLine } from "../../../../pricing";
import { useCashierLog } from "../../../../cashier";
import { formatItemDisplayName } from "../../../../utils/alternativeHelpers";
import { mapOrderDetailToCartItem } from "../../../mappers/orderDetailToCartMapper";
import {
  splitCombineDiscountStatus,
  billDiscountRevertMessage,
  COMPLIMENTARY_SPLIT_COMBINE_MESSAGE,
} from "../../../utils/orderDiscountCheck";
import { getSplitOrderInfo, splitOrderEmployeeId } from "../../../utils/splitOrderInfo";
import { lookupEmployeeName } from "../../../../utils/employeeNames";
import { getDefaultEmployeeConfig } from "../../../../utils/defaultEmployee";
import { useSplitDrag, splitDropCheck, SPLIT_BUCKET_ATTR } from "../../../hooks/useSplitDrag";

interface PosSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number;
  onSuccess: () => void;
}

interface SplitCartItem {
  mapId: number;
  name: string;
  price: number;
  currentQty: number;
  detail: any;
  modifiers: any[];
  isIncl: boolean;
  variantName?: string;
  discountValue?: number;
  discountType?: "percentage" | "amount";
  complimentaryStatus?: boolean;
}

interface SplitBucket {
  id: string;
  isBase: boolean;
  items: SplitCartItem[];
}

export const PosSplitModal: React.FC<PosSplitModalProps> = ({
  isOpen,
  onClose,
  orderId,
  onSuccess
}) => {
  const userId = useAppSelector((state) => state.auth.userId);
  const { products } = usePosProducts();
  const { showToast } = useToast();
  const { status } = useCashierLog();
  const [saving, setSaving] = useState(false);
  
  const [originalOrder, setOriginalOrder] = useState<any>(null);
  
  const [buckets, setBuckets] = useState<SplitBucket[]>([]);
  const [activeBucketId, setActiveBucketId] = useState<string>("split-1");
  const [selectedMapId, setSelectedMapId] = useState<number | null>(null);
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  
  const [showTableModal, setShowTableModal] = useState(false);

  const lastClickRef = useRef<{ id: string, time: number }>({ id: "", time: 0 });
  const rawOrderResRef = useRef<any>(null);
  // Bill discount: the cashier is warned first; on Yes the split bills are saved without it.
  const cartBillDiscount = useAppSelector((state) => Number(state.pos.billDiscountValue || 0));
  const [billDiscountPrompt, setBillDiscountPrompt] = useState(false);
  const [revertBillDiscount, setRevertBillDiscount] = useState(false);
  // Which order is being split: the saved master first, the cart (same order loaded for edit) for gaps.
  const cartTableNo = useAppSelector((state) => state.pos.selectedTableNo);
  const cartCustomerName = useAppSelector((state) => state.pos.selectedCustomerName);
  // Employee name looked up by the order's employee id when neither the order nor the cart has it (undefined = looking).
  const [lookedUpEmployee, setLookedUpEmployee] = useState<string | null | undefined>(null);

  useEffect(() => {
    if (!originalOrder) { setLookedUpEmployee(null); return; }
    const known = getSplitOrderInfo(originalOrder, { defaultEmployeeName: getDefaultEmployeeConfig().employeeName }).waiter;
    const empId = splitOrderEmployeeId(originalOrder);
    if (known || !empId) { setLookedUpEmployee(null); return; }
    let cancelled = false;
    setLookedUpEmployee(undefined);
    lookupEmployeeName(empId)
      .then((name) => { if (!cancelled) setLookedUpEmployee(name); })
      .catch(() => { if (!cancelled) setLookedUpEmployee(null); });
    return () => { cancelled = true; };
  }, [originalOrder]);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrderDetails();
    } else {
      setBuckets([]);
      setOriginalOrder(null);
      rawOrderResRef.current = null;
      setBillDiscountPrompt(false);
      setRevertBillDiscount(false);
    }
  }, [isOpen, orderId]);

  const fetchOrderDetails = async () => {
    try {
      const res = await orderApi.getOrderDetails(orderId);
      rawOrderResRef.current = res;

      const rawMaster = res.data?.masterData || res.masterData || {};
      const masterData = Array.isArray(rawMaster) ? rawMaster[0] : (rawMaster || {});
      const detailsData = res.data?.detailsData || res.detailsData || [];

      // Complimentary orders cannot be split. A bill discount (saved, or applied in the cart) is removed
      // after the cashier confirms. Orders with item discounts only are split as before.
      const discountStatus = splitCombineDiscountStatus(res, { masterData, detailsData });
      if (discountStatus === "complimentary") {
        showToast(COMPLIMENTARY_SPLIT_COMBINE_MESSAGE, "error");
        onClose();
        return;
      }
      if (discountStatus === "billDiscount" || cartBillDiscount > 0) {
        setBillDiscountPrompt(true);
        return;
      }
      loadBuckets(res, false);
    } catch (err: any) {
      console.error(err);
      showToast("Failed to load order details", "error");
      onClose();
    }
  };

  const handleRevertBillDiscount = () => {
    setBillDiscountPrompt(false);
    setRevertBillDiscount(true);
    loadBuckets(rawOrderResRef.current, true);
  };

  /** Fill the split buckets from the saved order. `stripBillDiscount`: drop the bill discount from every line. */
  const loadBuckets = (res: any, stripBillDiscount: boolean) => {
    try {
      const rawMaster = res.data?.masterData || res.masterData || {};
      const masterData = Array.isArray(rawMaster) ? rawMaster[0] : (rawMaster || {});
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

      // Order type from orderType / orderTypeId (the endpoints never return orderTypeName) and the
      // service charge / levy the order was SAVED with — split parts are priced exactly like the original.
      const dataView = getPriceView();
      const storedOrder = { masterData, detailsData, modifiersData };
      const orderTypeName =
        masterData.orderType || masterData.orderTypeName || orderTypeNameFromId(masterData.orderTypeId) || "DineIn";
      const savedRates = deriveOrderChargeRatesFromMaster(storedOrder, dataView);
      const discountCalc = getDiscountCalculation();
      setOriginalOrder({ ...masterData, orderTypeName, savedRates });

      const initialItems: SplitCartItem[] = detailsData.map((d: any, idx: number) => {
        const itemMods = modifiersData.filter((m: any) => m.mapId === d.mapId);
        
        // Map detail to cart item for genuine item discounts
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

        // Exact pricing from the stored line (same converter as recall-edit).
        const productMaster: any = (products || []).find((p: any) => Number(p.id) === Number(d.productId ?? d.ProductId));
        const productIsInclusive =
          productMaster?.isIncl === true || productMaster?.priceIsIncl === true
            ? true
            : productMaster?.isIncl === false || productMaster?.priceIsIncl === false
            ? false
            : Boolean(cartItem.isIncl);
        const pricing = storedLineToCartPricing(storedOrder, d, dataView, {
          productIsInclusive,
          discountCalc,
          // A bill-discount order's line discounts are the bill discount (saved data cannot separate an
          // item discount from it — same rule as Recall → Edit), so all of them go when it is reverted.
          isBillDiscount: stripBillDiscount,
        });
        let pricedIdx = 0;
        const pricedMods = itemMods.map((m: any) => {
          if (!(Number(m.price) > 0)) return m;
          const gross = pricing.extraGrossById.get(Number(m.modifierId ?? m.ModifierId)) ?? pricing.extraGrossList[pricedIdx];
          pricedIdx++;
          return gross !== undefined ? { ...m, price: gross } : m;
        });

        return {
          mapId: d.mapId,
          name: displayName,
          variantName: rawAlt || undefined,
          price: pricing.price,
          currentQty: d.qty || 1,
          discountValue: pricing.discount ? pricing.discount.value : 0,
          discountType: pricing.discount ? pricing.discount.type : 'percentage',
          // Bill complimentary flags every line complimentary: removed together with the bill discount.
          complimentaryStatus: stripBillDiscount ? false : Boolean(cartItem.complimentaryStatus),
          detail: {
            ...d,
            vatValue: pricing.savedVatRate ?? cartItem.vatValue,
            vatId: cartItem.product?.sVatId,
          },
          modifiers: pricedMods,
          isIncl: pricing.isIncl,
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
      showToast("Failed to load order details", "error");
      onClose();
    }
  };

  const ownsModifiers = (bucket: SplitBucket, itemMapId: number) => {
    const baseBucket = buckets.find(b => b.isBase);
    const itemInBase = baseBucket?.items.find(i => i.mapId === itemMapId);
    const baseHasQty = (itemInBase?.currentQty || 0) > 0;
    
    if (bucket.isBase) return baseHasQty;
    
    if (!baseHasQty) {
      const splitBuckets = buckets.filter(b => !b.isBase);
      const firstOwningBucket = splitBuckets.find(b => {
        const i = b.items.find(x => x.mapId === itemMapId);
        return (i?.currentQty || 0) > 0;
      });
      return firstOwningBucket?.id === bucket.id;
    }
    return false;
  };

// Delivery is charged ONCE: the base bill (the original order) keeps its saved delivery charge, new split
  // bills get none. Without this, calculateOrder added the default delivery charge to EVERY split bill
  // (screen total and saved netAmount) for Delivery orders.
/** Most a fixed discount can take off `qty` units of a line WITHOUT its extras (in Discount Calc terms). */
  const productDiscountCapacity = (item: SplitCartItem, qty: number): number => {
    const settings = toPricingSettings(getBillingConfigForOrder(originalOrder?.orderTypeName || "DineIn", originalOrder?.savedRates));
    const line = priceLine(
      { qty, unitPrice: item.price, priceIncludesTax: item.isIncl, vatRate: Number(item.detail?.vatValue ?? settings.defaultVatRate), extras: [] },
      settings
    );
    return settings.discountCalc === "Inclusive" ? line.grossAmount : line.amount;
  };

  const bucketDeliveryCharge = (bucket: SplitBucket) =>
    bucket.isBase ? Number(originalOrder?.deliveryCharge ?? originalOrder?.DeliveryCharge ?? 0) || 0 : 0;

  const calculateBucketTotal = (bucket: SplitBucket) => {
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
      orderType: originalOrder?.orderTypeName || "DineIn",
      config: getBillingConfigForOrder(originalOrder?.orderTypeName || "DineIn", originalOrder?.savedRates),
      customDeliveryCharge: bucketDeliveryCharge(bucket),
    });
    return result.summary.total;
  };

  const handleAddSplit = () => {
    const newId = `split-${Date.now()}`;
    setBuckets([...buckets, { id: newId, isBase: false, items: [] }]);
    setActiveBucketId(newId);
  };

  const handleSelectItem = (bucketId: string, mapId: number) => {
    setSelectedBucketId(bucketId);
    setSelectedMapId(mapId);
    if (!buckets.find(b => b.id === bucketId)?.isBase) {
      setActiveBucketId(bucketId);
    }
  };

  const moveItem = (sourceBucketId: string, targetBucketId: string, mapId: number, moveQty: number) => {
    setBuckets(prevBuckets => {
      const sourceBucket = prevBuckets.find(b => b.id === sourceBucketId);
      const targetBucket = prevBuckets.find(b => b.id === targetBucketId);
      
      if (!sourceBucket || !targetBucket) return prevBuckets;
      
      const sourceItemIndex = sourceBucket.items.findIndex(i => i.mapId === mapId);
      if (sourceItemIndex === -1) return prevBuckets;
      
      const sourceItem = sourceBucket.items[sourceItemIndex];
      const actualMoveQty = Math.min(moveQty, sourceItem.currentQty);
      
      if (actualMoveQty <= 0) return prevBuckets;

      const newBuckets = [...prevBuckets];
      const newSourceBucket = { ...sourceBucket, items: [...sourceBucket.items] };
      const newTargetBucket = { ...targetBucket, items: [...targetBucket.items] };
      
      // Calculate split discount proportionally so item discount is divided across split products
      let movedDiscount = 0;
      let remainingDiscount = 0;
      if (sourceItem.discountType === 'amount') {
        const totalDiscount = Number(sourceItem.discountValue || 0);
        const unitDiscount = sourceItem.currentQty > 0 ? (totalDiscount / sourceItem.currentQty) : 0;
        const byQty = unitDiscount * actualMoveQty;
        // The moved part never carries the extras (they stay with the bill that keeps the line), so it can
        // absorb at most its own product value. A fixed discount bigger than the product (covering the
        // extras too) used to be shared by quantity only: the part without extras got more discount than
        // it was worth, the excess was capped away and the split bills added up to MORE than the order.
        movedDiscount = roundCalc(
          actualMoveQty >= sourceItem.currentQty ? totalDiscount : Math.min(byQty, productDiscountCapacity(sourceItem, actualMoveQty)),
          CALC_PRECISION
        );
        remainingDiscount = roundCalc(Math.max(0, totalDiscount - movedDiscount), CALC_PRECISION);
      } else {
        movedDiscount = Number(sourceItem.discountValue || 0);
        remainingDiscount = Number(sourceItem.discountValue || 0);
      }

      // Remove / update in source
      const newSourceQty = sourceItem.currentQty - actualMoveQty;
      if (newSourceQty <= 0) {
        newSourceBucket.items.splice(sourceItemIndex, 1);
      } else {
        newSourceBucket.items[sourceItemIndex] = {
          ...sourceItem,
          currentQty: newSourceQty,
          discountValue: remainingDiscount,
        };
      }
      
      // Add / update in target
      const targetItemIndex = newTargetBucket.items.findIndex(i => i.mapId === mapId);
      if (targetItemIndex >= 0) {
        const existingTargetItem = newTargetBucket.items[targetItemIndex];
        const newTargetQty = existingTargetItem.currentQty + actualMoveQty;
        const newTargetDiscount =
          sourceItem.discountType === 'amount'
            ? roundCalc((existingTargetItem.discountValue || 0) + movedDiscount, CALC_PRECISION)
            : existingTargetItem.discountValue;

        newTargetBucket.items[targetItemIndex] = { 
          ...existingTargetItem, 
          currentQty: newTargetQty,
          discountValue: newTargetDiscount,
          discountType: sourceItem.discountType,
        };
      } else {
        newTargetBucket.items.push({
          ...sourceItem,
          currentQty: actualMoveQty,
          discountValue: movedDiscount,
          discountType: sourceItem.discountType,
        });
      }

      const sourceIdx = newBuckets.findIndex(b => b.id === sourceBucketId);
      const targetIdx = newBuckets.findIndex(b => b.id === targetBucketId);
      newBuckets[sourceIdx] = newSourceBucket;
      newBuckets[targetIdx] = newTargetBucket;
      
      return newBuckets;
    });
  };

  const handleCloseSplit = (bucketId: string) => {
    setBuckets(prevBuckets => {
      const targetBucket = prevBuckets.find(b => b.id === bucketId);
      const baseBucket = prevBuckets.find(b => b.isBase);
      if (!targetBucket || !baseBucket) return prevBuckets;

      const newBaseBucket = { ...baseBucket, items: [...baseBucket.items] };

      targetBucket.items.forEach(item => {
        const baseItemIndex = newBaseBucket.items.findIndex(i => i.mapId === item.mapId);
        if (baseItemIndex >= 0) {
          const baseItem = newBaseBucket.items[baseItemIndex];
          const mergedDiscount =
            item.discountType === 'amount'
              ? roundCalc((baseItem.discountValue || 0) + (item.discountValue || 0), CALC_PRECISION)
              : baseItem.discountValue;

          newBaseBucket.items[baseItemIndex] = {
            ...baseItem,
            currentQty: baseItem.currentQty + item.currentQty,
            discountValue: mergedDiscount,
            discountType: baseItem.discountType || item.discountType,
          };
        } else {
          newBaseBucket.items.push({ ...item });
        }
      });

      const nextBuckets = prevBuckets.filter(b => b.id !== bucketId).map(b => b.isBase ? newBaseBucket : b);
      
      setTimeout(() => {
        setActiveBucketId(currentActive => {
          if (currentActive === bucketId) {
             const nextSplit = nextBuckets.find(b => !b.isBase);
             return nextSplit ? nextSplit.id : "";
          }
          return currentActive;
        });
      }, 0);

      return nextBuckets;
    });
  };

  const handleDoubleClick = (bucketId: string, mapId: number) => {
    // If double clicking in base, move to active split
    if (bucketId === "base") {
      if (!activeBucketId) {
        showToast("Please add a split first.", "warning");
        return;
      }
      const sourceItem = buckets.find(b => b.id === bucketId)?.items.find(i => i.mapId === mapId);
      if (sourceItem) {
        const moveQty = 1;
        const baseBucket = buckets.find(b => b.isBase);
        const totalRemainingQty = baseBucket?.items.reduce((sum, item) => sum + item.currentQty, 0) || 0;
        
        if (totalRemainingQty - moveQty <= 0) {
          showToast("Original order must have at least one item.", "warning");
          return;
        }
        
        moveItem("base", activeBucketId, mapId, moveQty);
      }
    } else {
      // If double clicking in a split, move back to base
      const sourceItem = buckets.find(b => b.id === bucketId)?.items.find(i => i.mapId === mapId);
      if (sourceItem) {
        const moveQty = 1;
        moveItem(bucketId, "base", mapId, moveQty);
      }
    }
  };

  /** Drag and drop: the whole line (its full quantity) moves to the bill it is dropped on. */
  const handleDropLine = (fromBucketId: string, toBucketId: string | null, mapId: number) => {
    const check = splitDropCheck(buckets, fromBucketId, toBucketId, mapId);
    if (!check.move || !toBucketId) {
      if (check.message) showToast(check.message, "warning");
      return;
    }
    const item = buckets.find((b) => b.id === fromBucketId)?.items.find((i) => i.mapId === mapId);
    if (!item) return;
    moveItem(fromBucketId, toBucketId, mapId, item.currentQty);
    if (toBucketId !== "base") setActiveBucketId(toBucketId);
    setSelectedBucketId(toBucketId);
    setSelectedMapId(mapId);
  };
  const { drag, onPointerDown: onLinePointerDown, isDragClick } = useSplitDrag(handleDropLine);

  const handleSingleClickItem = (bucketId: string, mapId: number) => {
    handleSelectItem(bucketId, mapId);
  };

  const handleItemInteraction = (bucketId: string, mapId: number) => {
    if (isDragClick()) return; // the click that ends a drag is not a tap
    const now = Date.now();
    const id = `${bucketId}-${mapId}`;
    const timeDiff = now - lastClickRef.current.time;
    
    // Threshold for double tap/click: 300ms
    if (lastClickRef.current.id === id && timeDiff < 300) {
      // Double click detected
      lastClickRef.current = { id: "", time: 0 }; // reset
      handleDoubleClick(bucketId, mapId);
    } else {
      // Single click detected
      lastClickRef.current = { id, time: now };
      handleSingleClickItem(bucketId, mapId);
    }
  };



  const handleDone = () => {
    // Validate that splits actually have items
    const hasSplits = buckets.some(b => !b.isBase && b.items.length > 0);
    if (!hasSplits) {
      showToast("No items have been moved to a split order.", "warning");
      return;
    }

    const allBucketDetails = buckets.flatMap(b => b.items.map(i => i.detail));
    const discountStatus = splitCombineDiscountStatus(rawOrderResRef.current, {
      masterData: originalOrder,
      detailsData: allBucketDetails
    });
    if (discountStatus === "complimentary") {
      showToast(COMPLIMENTARY_SPLIT_COMBINE_MESSAGE, "error");
      return;
    }
    if (discountStatus === "billDiscount" && !revertBillDiscount) {
      setBillDiscountPrompt(true);
      return;
    }

    proceedWithSplit();
  };

  const proceedWithSplit = () => {
    // Check if Dine In
    if (originalOrder?.orderTypeId === 1) {
      setShowTableModal(true);
    } else {
      submitSplitOrder([]);
    }
  };

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
      orderType: originalOrder?.orderTypeName || "DineIn",
      config: getBillingConfigForOrder(originalOrder?.orderTypeName || "DineIn", originalOrder?.savedRates),
      customDeliveryCharge: bucketDeliveryCharge(bucket),
    });

    const details = bucket.items.map((item, index) => {
      const newMapId = index + 1;
      const lineCalc = result.lines[index];
      const pId = item.detail?.productId ?? item.detail?.ProductId ?? item.detail?.itemId ?? item.detail?.ItemId;

      // Backend convention: detail price = exclusive unit price INCLUDING extras (amount / qty).
      const exclPrice = roundCalc(lineCalc.amount / Math.max(1, item.currentQty), CALC_PRECISION);
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
      // Only attach modifiers to the bucket that 'owns' them (typically the base bucket, unless fully moved)
      if (ownsModifiers(bucket, item.mapId)) {
        // Extras were priced by the engine (gross → exclusive); store their exclusive price.
        const pricedExtras = result.lines[index]?.pricedExtras || [];
        let extraIdx = 0;
        item.modifiers.forEach(m => {
          const mId = m.modifierId ?? m.ModifierId ?? m.id ?? m.Id;
          const pe = Number(m.price) > 0 ? pricedExtras[extraIdx++] : undefined;
          modifiers.push({
            ...m,
            mapId: newMapId,
            modifierId: mId,
            qty: m.qty || 1,
            price: pe ? pe.basePrice : (Number(m.price) > 0 ? m.price : 0),
            amount: pe ? pe.baseAmount : roundCalc(m.amount || (m.price * (m.qty || 1)))
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
        deliveryCharge: roundCalc(result.summary.deliveryCharge),
        netAmount: roundCalc(result.summary.total)
      },
      details,
      modifiers
    };
  };

  const submitSplitOrder = async (tableAssignments: { bucketId: string; sectionId: number; tableId: number }[]) => {
    try {
      setSaving(true);
      
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
        employeeId: userId ? Number(userId) : 0,
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
        discPer: 0,
        complimentaryStatus: false
      };

      const payload = {
        orderId: orderId,
        ...commonPayload,
        baseOrder: baseData,
        newOrders: newOrders
      };

      console.log("--- SPLIT ORDER PAYLOAD ---", JSON.stringify(payload, null, 2));
      const res = await orderApi.splitOrder(payload as any);
      
      if (res.isSuccess) {
        showToast("Order split successfully!", "success");
        onSuccess();
      } else {
        throw new Error(res.message || "Failed to split order");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to split order", "error");
    } finally {
      setSaving(false);
      setShowTableModal(false);
    }
  };

  if (!isOpen) return null;

  const info = getSplitOrderInfo(originalOrder, { orderId, defaultEmployeeName: getDefaultEmployeeConfig().employeeName, tableNo: cartTableNo, customerName: cartCustomerName });
  const infoFields: { label: string; value: string }[] = [
    { label: "Ticket", value: info.ticketNo },
    { label: "Type", value: info.orderType },
    { label: "Employee", value: info.waiter || (lookedUpEmployee === undefined ? "…" : lookedUpEmployee || "—") },
    { label: "Table", value: info.table },
    { label: "Guests", value: info.guests ? String(info.guests) : "" },
    { label: "Customer", value: info.customer },
    { label: "Date", value: info.date },
  ].filter((f) => f.value);

  return (
    <>
      <Modal
        isOpen={isOpen} 
        onClose={onClose} 
        size="2xl"
        showClose={false}
      closeOnEscape
        className="!max-w-[98vw] !w-[98vw] h-[95vh] bg-slate-50 p-0 overflow-hidden flex flex-col"
      >
        {/* Order being split */}
        <div className="shrink-0 bg-[#49293e] text-white px-4 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-2" aria-label="Order being split">
          <div className="flex items-baseline gap-2 shrink-0">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Split Order</span>
            <span className="text-lg font-black leading-none">#{info.orderNo || "—"}</span>
          </div>
          {infoFields.map((f) => (
            <div key={f.label} className="flex flex-col min-w-0">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 leading-none mb-1">{f.label}</span>
              <span className="text-xs font-black uppercase leading-none truncate max-w-[220px]" title={f.value}>{f.value}</span>
            </div>
          ))}
          {info.netAmount !== null && !revertBillDiscount && (
            <div className="ml-auto flex flex-col items-end shrink-0">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 leading-none mb-1">Order Total</span>
              <span className="text-base font-black leading-none text-[#ffb347]">{formatCurrency(info.netAmount)}</span>
            </div>
          )}
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-wrap content-start overflow-y-auto p-4 gap-4">
            {buckets.map((bucket) => (
              <div 
                key={bucket.id} 
                {...{ [SPLIT_BUCKET_ATTR]: bucket.id }}
                onClick={() => !bucket.isBase && setActiveBucketId(bucket.id)}
                className={`relative w-[300px] h-[calc(50%-0.5rem)] flex-shrink-0 flex flex-col bg-white border-2 rounded-lg overflow-hidden shadow-sm transition-all cursor-pointer ${
                  drag && drag.fromBucketId !== bucket.id
                    ? drag.overBucketId === bucket.id
                      ? 'border-emerald-500 ring-4 ring-emerald-400/50'
                      : 'border-dashed border-emerald-300'
                    : bucket.isBase 
                    ? 'border-slate-300' 
                    : activeBucketId === bucket.id 
                      ? 'border-[#ff9500] ring-2 ring-[#ff9500] ring-opacity-50' 
                      : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {drag && drag.fromBucketId !== bucket.id && drag.overBucketId === bucket.id && (
                  <div className="absolute inset-0 z-10 bg-emerald-500/10 flex items-center justify-center pointer-events-none">
                    <span className="bg-emerald-600 text-white text-xs font-black uppercase tracking-widest rounded-lg px-3 py-2 shadow-lg">Drop to move all</span>
                  </div>
                )}
                {/* Header */}
                <div className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-500 bg-slate-100 p-2 border-b">
                  <div className="w-12 text-center">Qty</div>
                  <div className="flex-1 px-2">Description</div>
                  <div className="w-20 text-right pr-2">Amount</div>
                  {!bucket.isBase && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleCloseSplit(bucket.id); }}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded p-1 ml-1 transition-colors"
                      title="Remove Split"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                
                {/* Items */}
                <div className="flex-1 overflow-y-auto">
                  {bucket.items.map(item => {
                    const config = getBillingConfigForOrder(originalOrder?.orderTypeName || "DineIn", originalOrder?.savedRates);
                    
                    const itemDiscount = item.discountValue && item.discountValue > 0
                      ? { type: item.discountType || 'percentage', value: item.discountValue }
                      : 0;

                    const calcs = calculateLineItem(
                      item.currentQty,
                      item.price,
                      itemDiscount,
                      0, // No extras in base calc for display purposes, we'll display extras separately
                      config,
                      item.detail.vatValue,
                      item.isIncl
                    );
                    
                    return (
                    <div key={item.mapId}>
                      <div 
                        onPointerDown={onLinePointerDown(bucket.id, item.mapId, `${item.currentQty} × ${item.name}`)}
                        onContextMenu={(e) => e.preventDefault()}
                        title="Double-click: move one · drag: move all"
                        className={`flex items-start text-xs font-bold p-2 border-b transition-colors select-none cursor-grab active:cursor-grabbing ${
                          drag && drag.fromBucketId === bucket.id && drag.mapId === item.mapId ? 'opacity-40 ' : ''
                        }${
                          selectedBucketId === bucket.id && selectedMapId === item.mapId 
                            ? 'bg-[#ff9500] text-white' 
                            : 'hover:bg-slate-50'
                        }`}
                        onClick={(e) => { e.stopPropagation(); handleItemInteraction(bucket.id, item.mapId); }}
                      >
                        <div className="w-12 shrink-0 text-center">{item.currentQty}</div>
                        <div className="flex-1 min-w-0 px-2 uppercase break-words [overflow-wrap:anywhere] [word-break:break-word] leading-tight" title={item.name}>{item.name}</div>
                        <div className="w-20 shrink-0 text-right pr-2">{formatCurrency(calcs.lineNetAmount)}</div>
                      </div>
                      
                      {/* Modifiers display */}
                      {ownsModifiers(bucket, item.mapId) && item.modifiers.map((m, idx) => {
                        const originalModQty = m.qty || 1;
                        
                        // Recalculate VAT for modifier separately just for display
                        const modCalcs = calculateLineItem(
                          1,
                          m.price * originalModQty,
                          0,
                          0,
                          config,
                          item.detail.vatValue,
                          true // extras prices are gross (inclusive)
                        );

                        return (
                        <div 
                          key={`${m.modifierId}-${idx}`} 
                          className={`flex items-start text-[10px] uppercase p-1.5 border-b ${
                            selectedBucketId === bucket.id && selectedMapId === item.mapId 
                              ? 'bg-orange-400 text-white' 
                              : 'text-slate-500 bg-slate-50'
                          }`}
                        >
                          <div className="w-12 shrink-0 text-center"></div>
                          <div className="flex-1 min-w-0 px-2 ml-2 break-words [overflow-wrap:anywhere] [word-break:break-word] leading-tight">- {m.modifierName} {originalModQty > 1 ? `(x${originalModQty})` : ''}</div>
                          <div className="w-20 shrink-0 text-right pr-2">{m.price > 0 ? formatCurrency(modCalcs.lineNetAmount) : ''}</div>
                        </div>
                        );
                      })}
                    </div>
                  )})}
                </div>

                {/* Footer Total */}
                <div className="p-3 bg-white border-t border-slate-200 flex justify-between items-center font-black">
                  <div className="text-xs uppercase tracking-widest text-slate-500">
                    {bucket.isBase ? 'Main Total' : 'Split Total'}
                  </div>
                  <div className="text-lg text-slate-800">
                    {formatCurrency(calculateBucketTotal(bucket))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right Action Bar */}
          <div className="w-[100px] bg-[#2a2f3e] p-2 flex flex-col gap-2 shadow-xl z-10">
            
            <button 
              onClick={handleAddSplit}
              className="h-14 bg-[#ff9500] hover:bg-[#e68600] text-white rounded font-black uppercase tracking-widest text-xs transition-all active:scale-95"
            >
              SPLIT
            </button>

            <div className="flex-1"></div>

            <button 
              onClick={handleDone}
              disabled={saving}
              className="h-16 bg-[#27ae60] hover:bg-[#2ecc71] text-white rounded font-black uppercase tracking-widest text-sm transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'DONE'}
            </button>
            
            <button 
              onClick={onClose}
              disabled={saving}
              className="h-14 bg-[#c0392b] hover:bg-[#e74c3c] text-white rounded font-black uppercase tracking-widest text-xs transition-all active:scale-95 disabled:opacity-50"
            >
              CLOSE
            </button>
          </div>
        </div>
      </Modal>

      {/* Line being dragged: follows the pointer (portal, so no modal transform shifts it) */}
      {drag && createPortal(
        <div
          className="fixed z-[1000] pointer-events-none rounded-lg bg-[#ff9500] text-white text-xs font-black uppercase px-3 py-2 shadow-2xl max-w-[260px] truncate"
          style={{ left: drag.x + 14, top: drag.y + 14 }}
          aria-hidden="true"
        >
          {drag.label}
        </div>,
        document.body,
      )}

      {/* Dine In Table Selection Modal triggered on Done */}
      {showTableModal && (
        <PosSplitTableModal
          isOpen={showTableModal}
          buckets={buckets.filter(b => b.items.length > 0)} // Only pass buckets that have items
          originalOrder={originalOrder}
          onCancel={() => setShowTableModal(false)}
          onConfirm={(assignments) => submitSplitOrder(assignments)}
        />
      )}

      {/* After the split window so it shows on top of it */}
      <ConfirmDialog
        isOpen={billDiscountPrompt}
        title="Remove Bill Discount?"
        message={billDiscountRevertMessage("Split")}
        confirmLabel="Yes, Remove"
        cancelLabel="No"
        confirmVariant="danger"
        onConfirm={handleRevertBillDiscount}
        onCancel={() => {
          setBillDiscountPrompt(false);
          onClose();
        }}
      />
    </>
  );
};
