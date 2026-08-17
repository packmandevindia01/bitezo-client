import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkSettlementApi } from "../services/bulkSettlementApi";
import type { EntityType, EntityOption, UnsettledOrder } from "../types";
import { useAppSelector } from "../../../../app/hooks";
import { selectActiveBranchId, selectBranchId } from "../../../auth/store/authSlice";
import { useToast } from "../../../../app/providers/useToast";

export const useBulkSettlement = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const activeBranchId = useAppSelector(selectActiveBranchId);
  const userBranchId = useAppSelector(selectBranchId);
  const branchId = (activeBranchId || userBranchId || 1) as number;

  const [entityType, setEntityType] = useState<EntityType>("driver");
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  const [searchTrigger, setSearchTrigger] = useState<{ entityType: EntityType; entityId: number | null }>({
    entityType: "driver",
    entityId: null,
  });

  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);

  // 1. Fetch Entities (Drivers or Providers)
  const { data: entities = [], isLoading: isEntitiesLoading } = useQuery<EntityOption[]>({
    queryKey: ["bulkSettlementEntities", entityType, branchId],
    queryFn: () =>
      entityType === "driver"
        ? bulkSettlementApi.getDriversList(branchId)
        : bulkSettlementApi.getProvidersList(),
    staleTime: 60000,
  });

  // 2. Fetch Unsettled Orders for active filter
  const {
    data: orders = [],
    isLoading: isOrdersLoading,
    isRefetching,
    refetch,
  } = useQuery<UnsettledOrder[]>({
    queryKey: ["unsettledOrders", searchTrigger.entityType, searchTrigger.entityId, branchId],
    queryFn: () => {
      if (!searchTrigger.entityId) return [];
      return bulkSettlementApi.getUnsettledOrders(
        searchTrigger.entityType,
        searchTrigger.entityId,
        branchId
      );
    },
    enabled: !!searchTrigger.entityId,
  });

  // Handle entityType toggle
  const handleEntityTypeChange = useCallback((type: EntityType) => {
    setEntityType(type);
    setSelectedEntityId(null);
    setSelectedOrderIds([]);
    setSearchTrigger({ entityType: type, entityId: null });
  }, []);

  // Handle entity ID change
  const handleEntityChange = useCallback((id: number | null) => {
    setSelectedEntityId(id);
    setSelectedOrderIds([]);
  }, []);

  // Execute Search
  const handleSearch = useCallback(() => {
    if (!selectedEntityId) {
      showToast(`Please select a ${entityType === "driver" ? "driver" : "provider"}`, "warning");
      return;
    }
    setSelectedOrderIds([]);
    setSearchTrigger({ entityType, entityId: selectedEntityId });
  }, [entityType, selectedEntityId, showToast]);

  // Order Selection Toggles
  const toggleOrderSelection = useCallback((orderId: number) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  }, []);

  const isAllSelected = useMemo(() => {
    if (orders.length === 0) return false;
    return orders.every((o) => selectedOrderIds.includes(o.orderId));
  }, [orders, selectedOrderIds]);

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(orders.map((o) => o.orderId));
    }
  }, [isAllSelected, orders]);

  // Total amount calculation
  const totalSelectedAmount = useMemo(() => {
    return orders
      .filter((o) => selectedOrderIds.includes(o.orderId))
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  }, [orders, selectedOrderIds]);

  // 3. Submit Settlement Mutation
  const settlementMutation = useMutation({
    mutationFn: bulkSettlementApi.submitBulkSettlement,
    onSuccess: (res) => {
      showToast(res.message || "Bulk settlement submitted successfully!", "success");
      setSelectedOrderIds([]);
      queryClient.invalidateQueries({ queryKey: ["unsettledOrders"] });
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to submit settlement", "error");
    },
  });

  const handleSubmit = useCallback(() => {
    if (!searchTrigger.entityId) {
      showToast(`Please select a ${entityType === "driver" ? "driver" : "provider"} and search`, "warning");
      return;
    }
    if (selectedOrderIds.length === 0) {
      showToast("Please select at least one order to settle", "warning");
      return;
    }

    settlementMutation.mutate({
      entityType: searchTrigger.entityType,
      entityId: searchTrigger.entityId,
      orderIds: selectedOrderIds,
      totalAmount: totalSelectedAmount,
    });
  }, [searchTrigger, selectedOrderIds, totalSelectedAmount, entityType, settlementMutation, showToast]);

  return {
    entityType,
    entities,
    isEntitiesLoading,
    selectedEntityId,
    orders,
    isOrdersLoading: isOrdersLoading || isRefetching,
    selectedOrderIds,
    isAllSelected,
    totalSelectedAmount,
    isSubmitting: settlementMutation.isPending,
    handleEntityTypeChange,
    handleEntityChange,
    handleSearch,
    toggleOrderSelection,
    toggleSelectAll,
    handleSubmit,
    refetchOrders: refetch,
  };
};
