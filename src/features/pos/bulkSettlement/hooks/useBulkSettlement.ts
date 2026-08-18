import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkSettlementApi } from "../services/bulkSettlementApi";
import type { EntityType, EntityOption, UnsettledOrder } from "../types";
import { useAppSelector } from "../../../../app/hooks";
import { selectActiveBranchId, selectBranchId, selectDecimalPart } from "../../../auth/store/authSlice";
import { useToast } from "../../../../app/providers/useToast";
import { cashierLogService } from "../../cashier/services/cashierLogService";

export const useBulkSettlement = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const activeBranchId = useAppSelector(selectActiveBranchId);
  const userBranchId = useAppSelector(selectBranchId);
  const branchId = (activeBranchId || userBranchId || Number(localStorage.getItem("branchId")) || Number(sessionStorage.getItem("backoffice_branchId")) || 2) as number;
  const decimals = useAppSelector(selectDecimalPart) ?? 3;

  // Session info (dayId, shiftId, counterId)
  const [sessionInfo, setSessionInfo] = useState<{ dayId: number; shiftId: number; counterId: number }>({
    dayId: 0,
    shiftId: 0,
    counterId: 0,
  });

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const activeShiftRaw = localStorage.getItem("activeShift");
        if (activeShiftRaw) {
          const parsed = JSON.parse(activeShiftRaw);
          if (parsed && typeof parsed.dayId === "number") {
            setSessionInfo({
              dayId: parsed.dayId ?? 0,
              shiftId: parsed.shiftId ?? 0,
              counterId: parsed.counterId ?? 0,
            });
            return;
          }
        }

        const statusData = await cashierLogService.checkStatus(branchId);
        if (isMounted && statusData?.cashierInStatus) {
          setSessionInfo({
            dayId: statusData.cashierInStatus.dayId ?? 0,
            shiftId: statusData.cashierInStatus.shiftId ?? 0,
            counterId: 0,
          });
        }
      } catch {
        if (isMounted) {
          setSessionInfo({ dayId: 0, shiftId: 0, counterId: 0 });
        }
      }
    };

    loadSession();
    return () => {
      isMounted = false;
    };
  }, [branchId]);

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
    staleTime: 0,
  });

  // 2. Fetch Unsettled Orders for active filter
  const {
    data: orders = [],
    isLoading: isOrdersLoading,
    isRefetching,
    refetch,
  } = useQuery<UnsettledOrder[]>({
    queryKey: [
      "unsettledOrders",
      searchTrigger.entityType,
      searchTrigger.entityId,
      sessionInfo.dayId,
      sessionInfo.counterId,
      decimals,
    ],
    queryFn: () => {
      if (!searchTrigger.entityId) return [];
      return bulkSettlementApi.getUnsettledOrders(
        searchTrigger.entityType,
        searchTrigger.entityId,
        sessionInfo.dayId,
        sessionInfo.counterId,
        decimals
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
    mutationFn: async () => {
      const nowIso = new Date().toISOString();
      const selectedOrders = orders.filter((o) => selectedOrderIds.includes(o.orderId));

      const systemSeriesId = Number(localStorage.getItem("systemSeriesId")) || Number(localStorage.getItem("seriesId")) || 1;
      const systemPrefix = localStorage.getItem("systemPrefix") || localStorage.getItem("prefix") || "";
      const activeDayId = sessionInfo.dayId || Number(localStorage.getItem("pos_dayId")) || 1;
      const activeShiftId = sessionInfo.shiftId || 1;

      if (searchTrigger.entityType === "driver") {
        return bulkSettlementApi.submitDriverSettlement({
          seriesId: systemSeriesId,
          prefix: systemPrefix,
          dayId: activeDayId,
          shiftId: activeShiftId,
          createdAt: nowIso,
          voucherDate: nowIso,
          transDate: nowIso,
          orders: selectedOrders.map((o) => ({
            orderId: o.orderId,
            paymodes: [{ paymodeId: o.paymodeId || 1, amount: o.totalAmount }],
          })),
        });
      } else {
        return bulkSettlementApi.submitProviderSettlement({
          seriesId: systemSeriesId,
          prefix: systemPrefix,
          dayId: activeDayId,
          shiftId: activeShiftId,
          postAccountId: searchTrigger.entityId || 0,
          createdAt: nowIso,
          voucherDate: nowIso,
          transDate: nowIso,
          orderIds: selectedOrderIds,
        });
      }
    },
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

    settlementMutation.mutate();
  }, [searchTrigger, selectedOrderIds, entityType, settlementMutation, showToast]);

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
