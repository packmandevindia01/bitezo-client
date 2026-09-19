import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkSettlementApi } from "../services/bulkSettlementApi";
import type { EntityType, EntityOption, UnsettledOrder } from "../types";
import { useAppSelector } from "../../../../app/hooks";
import { selectActiveBranchId, selectBranchId, selectDecimalPart } from "../../../auth/store/authSlice";
import { useToast } from "../../../../app/providers/useToast";
import { useCashierLog } from "../../cashier";
import {
  printDeliverySettlementReceipt,
  type DeliverySettlePrintData,
} from "../../utils/deliverySettlePrintTemplate";

export const useBulkSettlement = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { status, isLoading: isCashierLoading } = useCashierLog();

  const activeBranchId = useAppSelector(selectActiveBranchId);
  const userBranchId = useAppSelector(selectBranchId);
  const branchId = useMemo(() => {
    return (
      Number(localStorage.getItem("systemBranchId")) ||
      activeBranchId ||
      userBranchId ||
      Number(localStorage.getItem("activeBranchId")) ||
      Number(localStorage.getItem("branchId")) ||
      Number(sessionStorage.getItem("backoffice_branchId")) ||
      1
    );
  }, [activeBranchId, userBranchId]);

  const decimals = useAppSelector(selectDecimalPart) ?? 3;

  const activeCounterId = useMemo(() => {
    return (
      Number(localStorage.getItem("systemCounterId")) ||
      Number(localStorage.getItem("counterId")) ||
      Number(localStorage.getItem("activeCounterId")) ||
      Number(localStorage.getItem("posCounterId")) ||
      1
    );
  }, []);

  const activeDayId = useMemo(() => {
    if (status?.dayId && status.dayId > 0) return status.dayId;
    const fromStorage =
      Number(localStorage.getItem("systemDayId")) ||
      Number(localStorage.getItem("pos_dayId")) ||
      Number(localStorage.getItem("dayId"));
    if (fromStorage && fromStorage > 0) return fromStorage;
    try {
      const activeShiftRaw = localStorage.getItem("activeShift");
      if (activeShiftRaw) {
        const parsed = JSON.parse(activeShiftRaw);
        if (parsed?.dayId && Number(parsed.dayId) > 0) return Number(parsed.dayId);
      }
    } catch {}
    return 1;
  }, [status?.dayId]);

  const activeShiftId = useMemo(() => {
    if (status?.shiftId && status.shiftId > 0) return status.shiftId;
    const fromStorage = Number(localStorage.getItem("shiftId"));
    if (fromStorage && fromStorage > 0) return fromStorage;
    try {
      const activeShiftRaw = localStorage.getItem("activeShift");
      if (activeShiftRaw) {
        const parsed = JSON.parse(activeShiftRaw);
        if (parsed?.shiftId && Number(parsed.shiftId) > 0) return Number(parsed.shiftId);
      }
    } catch {}
    return 1;
  }, [status?.shiftId]);

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

  // Selected Entity Object
  const selectedEntity = useMemo(() => {
    if (selectedEntityId === null || selectedEntityId === undefined) return null;
    return entities.find((e) => e.id === selectedEntityId) || null;
  }, [entities, selectedEntityId]);

  // 2. Fetch Unsettled Orders for active filter
  const {
    data: orders = [],
    isLoading: isQueryLoading,
    isFetching,
    refetch,
  } = useQuery<UnsettledOrder[]>({
    queryKey: [
      "unsettledOrders",
      searchTrigger.entityType,
      searchTrigger.entityId,
      activeDayId,
      activeCounterId,
      decimals,
    ],
    queryFn: () => {
      if (searchTrigger.entityId === null || searchTrigger.entityId === undefined) return [];
      return bulkSettlementApi.getUnsettledOrders(
        searchTrigger.entityType,
        searchTrigger.entityId,
        activeDayId,
        activeCounterId,
        decimals
      );
    },
    enabled: searchTrigger.entityId !== null && searchTrigger.entityId !== undefined,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const isOrdersLoading = isQueryLoading || isFetching;

  // Handle entityType toggle
  const handleEntityTypeChange = useCallback((type: EntityType) => {
    setEntityType(type);
    setSelectedEntityId(null);
    setSelectedOrderIds([]);
    setSearchTrigger({ entityType: type, entityId: null });
  }, []);

  // Handle entity ID change - immediately queries API on selection
  const handleEntityChange = useCallback((id: number | null) => {
    setSelectedEntityId(id);
    setSelectedOrderIds([]);
    setSearchTrigger({ entityType, entityId: id });
  }, [entityType]);

  // Execute Search
  const handleSearch = useCallback(() => {
    if (selectedEntityId === null || selectedEntityId === undefined) {
      showToast(`Please select a ${entityType === "driver" ? "driver" : "provider"}`, "warning");
      return;
    }
    setSelectedOrderIds([]);
    setSearchTrigger({ entityType, entityId: selectedEntityId });
    void refetch();
  }, [entityType, selectedEntityId, showToast, refetch]);

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

  const [lastSettledPrintData, setLastSettledPrintData] = useState<DeliverySettlePrintData | null>(null);

  // 3. Submit Settlement Mutation
  const settlementMutation = useMutation({
    mutationFn: async () => {
      const nowIso = new Date().toISOString();
      const selectedOrders = orders.filter((o) => selectedOrderIds.includes(o.orderId));

      const systemSeriesId = Number(localStorage.getItem("systemSeriesId")) || Number(localStorage.getItem("seriesId")) || 1;
      const systemPrefix = localStorage.getItem("systemPrefix") || localStorage.getItem("prefix") || "";

      if (searchTrigger.entityType === "driver") {
        const driverName =
          selectedEntity?.name ||
          entities.find((e) => e.id === searchTrigger.entityId)?.name || "DRIVER";
        const settleBy =
          localStorage.getItem("employeeName") ||
          localStorage.getItem("defaultEmployeeName") ||
          localStorage.getItem("userName") ||
          "Cashier";
        const nowObj = new Date();

        const printItems = selectedOrders.map((o, index) => ({
          sNo: index + 1,
          token: o.tokenNo || o.orderNo,
          customerAddress: o.customerAddress || "-",
          amount: o.totalAmount,
          paymodeName: o.paymodeName || "CARD",
        }));

        const printPayload: DeliverySettlePrintData = {
          driverName,
          date: nowObj.toLocaleDateString("en-GB"),
          time: nowObj.toLocaleTimeString("en-US"),
          settleBy,
          items: printItems,
          total: totalSelectedAmount,
          grandTotal: totalSelectedAmount,
          printTime: `${nowObj.toLocaleDateString("en-GB")} ${nowObj.toLocaleTimeString("en-US")}`,
        };

        const res = await bulkSettlementApi.submitDriverSettlement({
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

        return { res, printPayload, isDriver: true };
      } else {
        const res = await bulkSettlementApi.submitProviderSettlement({
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

        return { res, printPayload: null, isDriver: false };
      }
    },
    onSuccess: async (result) => {
      const res = result?.res || result;
      showToast(res?.message || "Bulk settlement submitted successfully!", "success");

      if (result?.isDriver && result?.printPayload) {
        setLastSettledPrintData(result.printPayload);
        try {
          await printDeliverySettlementReceipt(result.printPayload);
          showToast("Settlement receipt sent to printer!", "success");
        } catch (printErr: any) {
          console.error("Failed to print delivery settlement receipt:", printErr);
          showToast(
            "Settlement saved, but receipt printing failed: " +
              (printErr?.message || printErr),
            "warning"
          );
        }
      }

      setSelectedOrderIds([]);
      queryClient.invalidateQueries({ queryKey: ["unsettledOrders"] });
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to submit settlement", "error");
    },
  });

  const handleReprintLastSettlement = useCallback(async () => {
    if (!lastSettledPrintData) return;
    try {
      showToast("Printing settlement receipt...", "info");
      await printDeliverySettlementReceipt(lastSettledPrintData);
      showToast("Settlement receipt sent to printer!", "success");
    } catch (err: any) {
      showToast("Printing failed: " + (err?.message || err), "error");
    }
  }, [lastSettledPrintData, showToast]);

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
    selectedEntity,
    orders,
    isOrdersLoading,
    isCashierLoading,
    activeDayId,
    activeCounterId,
    selectedOrderIds,
    isAllSelected,
    totalSelectedAmount,
    isSubmitting: settlementMutation.isPending,
    lastSettledPrintData,
    handleReprintLastSettlement,
    handleEntityTypeChange,
    handleEntityChange,
    handleSearch,
    toggleOrderSelection,
    toggleSelectAll,
    handleSubmit,
    refetchOrders: refetch,
  };
};
