import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Modal } from "../../../../../components/common";
import { formatCurrency } from "../../../../../utils/currency";
import { orderApi } from "../../../services/orderApi";
import { useAppSelector } from "../../../../../app/hooks";
import { useToast } from "../../../../../app/providers/useToast";
import { PosSplitTableModal } from "./PosSplitTableModal";
import { getBillingConfig, calculateLineItem } from "../../utils/billing";
import { useCashierLog } from "../../../cashier";

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
  const products = useAppSelector((state) => state.pos.products);
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

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrderDetails();
    } else {
      setBuckets([]);
      setOriginalOrder(null);
    }
  }, [isOpen, orderId]);

  const fetchOrderDetails = async () => {
    try {
      const res = await orderApi.getOrderDetails(orderId);
      
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

  const calculateBucketTotal = (bucket: SplitBucket) => {
    let total = 0;
    const config = getBillingConfig(originalOrder?.orderTypeName || "DineIn");

    bucket.items.forEach(item => {
      let extrasTotal = 0;
      
      if (ownsModifiers(bucket, item.mapId)) {
        item.modifiers.forEach(m => {
          if (m.price > 0) {
            extrasTotal += (m.price * (m.qty || 1));
          }
        });
      }
      

      
      const calcs = calculateLineItem(
        item.currentQty,
        item.price,
        0,
        extrasTotal,
        config,
        item.detail.vatValue,
        item.isIncl
      );
      
      total += calcs.lineNetAmount;
    });
    return total;
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
      
      // Remove from source
      newSourceBucket.items[sourceItemIndex] = { ...sourceItem, currentQty: sourceItem.currentQty - actualMoveQty };
      if (newSourceBucket.items[sourceItemIndex].currentQty <= 0) {
        newSourceBucket.items.splice(sourceItemIndex, 1);
      }
      
      // Add to target
      const targetItemIndex = newTargetBucket.items.findIndex(i => i.mapId === mapId);
      if (targetItemIndex >= 0) {
        newTargetBucket.items[targetItemIndex] = { 
          ...newTargetBucket.items[targetItemIndex], 
          currentQty: newTargetBucket.items[targetItemIndex].currentQty + actualMoveQty 
        };
      } else {
        newTargetBucket.items.push({ ...sourceItem, currentQty: actualMoveQty });
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
          newBaseBucket.items[baseItemIndex] = {
            ...newBaseBucket.items[baseItemIndex],
            currentQty: newBaseBucket.items[baseItemIndex].currentQty + item.currentQty
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

  const handleSingleClickItem = (bucketId: string, mapId: number) => {
    handleSelectItem(bucketId, mapId);
  };

  const handleItemInteraction = (bucketId: string, mapId: number) => {
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
    
    // Check if Dine In
    if (originalOrder?.orderTypeId === 1) {
      setShowTableModal(true);
    } else {
      submitSplitOrder([]);
    }
  };

  const generateBucketData = (bucket: SplitBucket, tableId?: number, sectionId?: number) => {
    const config = getBillingConfig(originalOrder?.orderTypeName || "DineIn");
    // Recalculate totals for this bucket
    let vatExclAmount = 0;
    let vatAmount = 0;
    let netAmount = 0;
    
    const details = bucket.items.map((item, index) => {
      const newMapId = index + 1;
      
      let extrasTotal = 0;
      if (ownsModifiers(bucket, item.mapId)) {
        item.modifiers.forEach(m => {
          if (m.price > 0) {
            extrasTotal += (m.price * (m.qty || 1));
          }
        });
      }

      const activeVatRate = item.detail.vatValue !== undefined ? (item.detail.vatValue / 100) : config.vatRate;

      const calcs = calculateLineItem(
        item.currentQty,
        item.price,
        0,
        extrasTotal,
        config,
        item.detail.vatValue,
        item.isIncl
      );

      let mainNetAmount = calcs.lineNetAmount;
      let mainVatAmount = calcs.vatAmount;
      
      // Subtract extras from main detail like usePosCartActions does, so backend sums it perfectly
      if (ownsModifiers(bucket, item.mapId)) {
        item.modifiers.forEach(m => {
          if (m.price > 0) {
            const actualExtraPrice = m.price / (1 + activeVatRate);
            const extraBase = actualExtraPrice * (m.qty || 1);
            const proportion = calcs.amount > 0 ? (extraBase / calcs.amount) : 0;
            const extraNet = calcs.lineNetAmount * proportion;
            const extraVat = calcs.vatAmount * proportion;
            
            mainNetAmount -= extraNet;
            mainVatAmount -= extraVat;
          }
        });
      }

      // Add to bucket totals
      netAmount += calcs.lineNetAmount;
      vatAmount += calcs.vatAmount;
      vatExclAmount += (calcs.lineNetAmount - calcs.vatAmount);

      const pId = item.detail.productId ?? item.detail.ProductId ?? item.detail.itemId ?? item.detail.ItemId;
      return {
        ...item.detail,
        mapId: newMapId,
        productId: pId,
        qty: item.currentQty,
        netAmount: Number(mainNetAmount.toFixed(3)),
        vatAmount: Number(mainVatAmount.toFixed(3))
      };
    });

    const modifiers: any[] = [];
    bucket.items.forEach((item, index) => {
      const newMapId = index + 1;
      // Only attach modifiers to the bucket that 'owns' them (typically the base bucket, unless fully moved)
      if (ownsModifiers(bucket, item.mapId)) {
        item.modifiers.forEach(m => {
          const mId = m.modifierId ?? m.ModifierId ?? m.id ?? m.Id;
          modifiers.push({
            ...m,
            mapId: newMapId,
            modifierId: mId,
            qty: m.qty || 1,
            amount: m.amount || 0
          });
        });
      }
    });

    return {
      order: {
        sectionId: sectionId || originalOrder?.sectionId || 0,
        tableId: tableId || originalOrder?.tableId || 0,
        guestNo: originalOrder?.guestNo || 0,
        serviceCharge: 0,
        levy: 0,
        vatExclAmount: Number(vatExclAmount.toFixed(3)),
        vatAmount: Number(vatAmount.toFixed(3)),
        netAmount: Number(netAmount.toFixed(3))
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

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        size="2xl"
        showClose={false}
        className="!max-w-[98vw] !w-[98vw] h-[95vh] bg-slate-50 p-0 overflow-hidden flex flex-col"
      >
        <div className="flex-1 flex overflow-hidden">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-wrap content-start overflow-y-auto p-4 gap-4">
            {buckets.map((bucket) => (
              <div 
                key={bucket.id} 
                onClick={() => !bucket.isBase && setActiveBucketId(bucket.id)}
                className={`w-[300px] h-[calc(50%-0.5rem)] flex-shrink-0 flex flex-col bg-white border-2 rounded-lg overflow-hidden shadow-sm transition-all cursor-pointer ${
                  bucket.isBase 
                    ? 'border-slate-300' 
                    : activeBucketId === bucket.id 
                      ? 'border-[#ff9500] ring-2 ring-[#ff9500] ring-opacity-50' 
                      : 'border-slate-200 hover:border-slate-300'
                }`}
              >
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
                    const config = getBillingConfig(originalOrder?.orderTypeName || "DineIn");
                    
                    const calcs = calculateLineItem(
                      item.currentQty,
                      item.price,
                      0,
                      0, // No extras in base calc for display purposes, we'll display extras separately
                      config,
                      item.detail.vatValue,
                      item.isIncl
                    );
                    
                    return (
                    <div key={item.mapId}>
                      <div 
                        className={`flex items-center text-xs font-bold p-2 border-b transition-colors select-none ${
                          selectedBucketId === bucket.id && selectedMapId === item.mapId 
                            ? 'bg-[#ff9500] text-white' 
                            : 'hover:bg-slate-50'
                        }`}
                        onClick={(e) => { e.stopPropagation(); handleItemInteraction(bucket.id, item.mapId); }}
                      >
                        <div className="w-12 text-center">{item.currentQty}</div>
                        <div className="flex-1 px-2 uppercase truncate">{item.name}</div>
                        <div className="w-20 text-right pr-2">{formatCurrency(calcs.lineNetAmount)}</div>
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
                          item.isIncl
                        );

                        return (
                        <div 
                          key={`${m.modifierId}-${idx}`} 
                          className={`flex items-center text-[10px] uppercase p-1.5 border-b ${
                            selectedBucketId === bucket.id && selectedMapId === item.mapId 
                              ? 'bg-orange-400 text-white' 
                              : 'text-slate-500 bg-slate-50'
                          }`}
                        >
                          <div className="w-12 text-center"></div>
                          <div className="flex-1 px-2 truncate ml-2">- {m.modifierName} {originalModQty > 1 ? `(x${originalModQty})` : ''}</div>
                          <div className="w-20 text-right pr-2">{m.price > 0 ? formatCurrency(modCalcs.lineNetAmount) : ''}</div>
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
    </>
  );
};
