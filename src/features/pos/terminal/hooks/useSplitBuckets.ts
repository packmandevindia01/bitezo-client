import { useState, useRef } from "react";
import { getBillingConfig, calculateLineItem } from "../utils/billing";

export interface SplitCartItem {
  mapId: number;
  name: string;
  price: number;
  currentQty: number;
  detail: any;
  modifiers: any[];
  isIncl: boolean;
}

export interface SplitBucket {
  id: string;
  isBase: boolean;
  items: SplitCartItem[];
}

export const useSplitBuckets = (originalOrder: any | null, showToast: any) => {
  const [buckets, setBuckets] = useState<SplitBucket[]>([]);
  const [activeBucketId, setActiveBucketId] = useState<string>("split-1");
  const [selectedMapId, setSelectedMapId] = useState<number | null>(null);
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
  const lastClickRef = useRef<{ id: string, time: number }>({ id: "", time: 0 });

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
      handleSelectItem(bucketId, mapId);
    }
  };

  return {
    buckets,
    setBuckets,
    activeBucketId,
    setActiveBucketId,
    selectedMapId,
    setSelectedMapId,
    selectedBucketId,
    setSelectedBucketId,
    ownsModifiers,
    calculateBucketTotal,
    handleAddSplit,
    handleCloseSplit,
    handleItemInteraction
  };
};
