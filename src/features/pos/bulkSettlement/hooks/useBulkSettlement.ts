import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bulkSettlementApi } from "../services/bulkSettlementApi";
import type { EntityType, EntityOption, UnsettledOrder } from "../types";
import { useAppSelector } from "../../../../app/hooks";
import { selectActiveBranchId, selectBranchId, selectDecimalPart } from "../../../auth/store/authSlice";
import { useToast } from "../../../../app/providers/useToast";
import { useCashierLog } from "../../cashier";
import axiosInstance from "../../../../api/axiosInstance";
import {
  printDeliverySettlementReceipt,
  type DeliverySettlePrintData,
} from "../../utils/deliverySettlePrintTemplate";
import type { MultiPaymentLine, TenderOption } from "../../terminal/components/modals/payment/PosMultiPayModal";

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
  const [isMultiPayOpen, setIsMultiPayOpen] = useState(false);

  // Fetch Paymodes for Multi-Pay Tender Options
  const { data: rawPaymodes = [] } = useQuery<{ id: string; label: string }[]>({
    queryKey: ["bulkSettlementPaymodes"],
    queryFn: async () => {
      try {
        const res = await axiosInstance.get("/paymode/list-name");
        const d = res.data;
        const list = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];
        return list.map((item: any) => ({
          id: String(item.paymodeId ?? item.id),
          label: String(item.paymodeName ?? item.name ?? item.label ?? "Cash"),
        }));
      } catch (e) {
        console.error("Failed to fetch paymodes in bulk settlement:", e);
        return [
          { id: "1", label: "Cash" },
          { id: "2", label: "Card" },
        ];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const tenderOptions: TenderOption[] = useMemo(() => {
    const list = rawPaymodes.length > 0 ? rawPaymodes : [
      { id: "1", label: "Cash" },
      { id: "2", label: "Card" },
    ];

    // Exclude 'multi' and 'credit'
    const filtered = list.filter(
      (t) =>
        !t.label.toLowerCase().includes("multi") &&
        !t.label.toLowerCase().includes("credit")
    );

    // Cash is ALWAYS first priority
    return filtered.sort((a, b) => {
      const aIsCash = String(a.id) === "1" || a.label.toLowerCase().includes("cash");
      const bIsCash = String(b.id) === "1" || b.label.toLowerCase().includes("cash");
      if (aIsCash && !bIsCash) return -1;
      if (!aIsCash && bIsCash) return 1;
      return Number(a.id) - Number(b.id);
    });
  }, [rawPaymodes]);

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
    mutationFn: async (multiPayData?: { payments: MultiPaymentLine[]; change: number }) => {
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

        // 1. Calculate net payments from multiPayData
        const payments = multiPayData?.payments && multiPayData.payments.length > 0
          ? multiPayData.payments
          : [{ paymodeId: 1, label: "Cash", amount: totalSelectedAmount }];
        const change = multiPayData?.change || 0;

        let remainingChange = change;
        const netPayments = payments.map((p) => {
          const isCash = (p.label || "").toLowerCase().includes("cash");
          let net = p.amount;
          if (isCash && remainingChange > 0) {
            const deduct = Math.min(net, remainingChange);
            net -= deduct;
            remainingChange -= deduct;
          }
          return {
            paymodeId: Number(p.paymodeId),
            label: p.label,
            remainingAmount: Number(net.toFixed(decimals)),
          };
        });

        // 2. Allocate payment pool across selected orders
        const allocatedOrders: {
          orderId: number;
          paymodes: { paymodeId: number; amount: number }[];
          primaryPaymodeName: string;
        }[] = [];

        for (const order of selectedOrders) {
          let needed = Number(order.totalAmount.toFixed(decimals));
          const orderPaymodes: { paymodeId: number; amount: number }[] = [];
          const usedModes: string[] = [];

          for (const p of netPayments) {
            if (needed <= 0.00001) break;
            if (p.remainingAmount <= 0.00001) continue;

            const alloc = Number(Math.min(needed, p.remainingAmount).toFixed(decimals));
            if (alloc > 0) {
              orderPaymodes.push({
                paymodeId: p.paymodeId,
                amount: alloc,
              });
              if (!usedModes.includes(p.label)) {
                usedModes.push(p.label);
              }
              needed = Number((needed - alloc).toFixed(decimals));
              p.remainingAmount = Number((p.remainingAmount - alloc).toFixed(decimals));
            }
          }

          // In case of microscopic rounding residue, add to the last paymode
          if (needed > 0.00001) {
            if (orderPaymodes.length > 0) {
              orderPaymodes[orderPaymodes.length - 1].amount = Number(
                (orderPaymodes[orderPaymodes.length - 1].amount + needed).toFixed(decimals)
              );
            } else {
              orderPaymodes.push({
                paymodeId: netPayments[0]?.paymodeId || 1,
                amount: Number(needed.toFixed(decimals)),
              });
            }
          }

          allocatedOrders.push({
            orderId: order.orderId,
            paymodes: orderPaymodes,
            primaryPaymodeName: usedModes.join(" / ") || "CASH",
          });
        }

        const totalCashTendered = payments
          .filter((p) => (p.label || "").toLowerCase().includes("cash"))
          .reduce((sum, p) => sum + p.amount, 0);

        const printItems = selectedOrders.map((o, index) => {
          const allocated = allocatedOrders.find((ao) => ao.orderId === o.orderId);
          return {
            sNo: index + 1,
            token: o.tokenNo || o.orderNo,
            customerAddress: o.customerAddress || "-",
            amount: o.totalAmount,
            paymodeName: allocated?.primaryPaymodeName || "CASH",
          };
        });

        const printPayload: DeliverySettlePrintData = {
          driverName,
          date: nowObj.toLocaleDateString("en-GB"),
          time: nowObj.toLocaleTimeString("en-US"),
          settleBy,
          items: printItems,
          total: totalSelectedAmount,
          grandTotal: totalSelectedAmount,
          cashTendered: totalCashTendered > 0 ? totalCashTendered : undefined,
          changeAmount: change > 0 ? change : undefined,
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
          orders: allocatedOrders.map((ao) => ({
            orderId: ao.orderId,
            paymodes: ao.paymodes,
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

    if (searchTrigger.entityType === "driver") {
      setIsMultiPayOpen(true);
    } else {
      settlementMutation.mutate(undefined);
    }
  }, [searchTrigger, selectedOrderIds, entityType, settlementMutation, showToast]);

  const handleMultiPaySubmit = useCallback(
    (payments: MultiPaymentLine[], change: number) => {
      setIsMultiPayOpen(false);
      settlementMutation.mutate({ payments, change });
    },
    [settlementMutation]
  );

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
    isMultiPayOpen,
    setIsMultiPayOpen,
    tenderOptions,
    lastSettledPrintData,
    handleReprintLastSettlement,
    handleEntityTypeChange,
    handleEntityChange,
    handleSearch,
    toggleOrderSelection,
    toggleSelectAll,
    handleSubmit,
    handleMultiPaySubmit,
    refetchOrders: refetch,
  };
};
