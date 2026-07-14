import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSalesReport, getBranchList, getPaymodeList, getCustomerList, getSeriesList } from "../services/salesReportApi";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import type { BranchOption, PaymodeOption, CustomerOption } from "../types";
import { useBranchScope } from "../../../../hooks/useBranchScope";

export const useSalesReport = () => {
  const decimalPart = useAppSelector(selectDecimalPart);
  const { isBranchLocked, initialBranchId } = useBranchScope();

  // Filter states
  const [fromDate, setFromDate] = useState<string>(() => {
    const today = new Date();
    // Default to start of current month as is common for reports
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [branchId, setBranchId] = useState<string>(initialBranchId);
  const [customerId, setCustomerId] = useState<string>("0");
  const [paymodeId, setPaymodeId] = useState<string>("0");
  const [seriesId, setSeriesId] = useState<string>("0");
  const [searchTerm, setSearchTerm] = useState("");

  // Master data queries
  const { data: branches = [] as BranchOption[], isLoading: branchesLoading } = useQuery({
    queryKey: ["branchList", "all"],
    queryFn: getBranchList,
  });

  const { data: paymodes = [] as PaymodeOption[], isLoading: paymodesLoading } = useQuery({
    queryKey: ["paymodeList"],
    queryFn: getPaymodeList,
  });

  const { data: customers = [] as CustomerOption[], isLoading: customersLoading } = useQuery({
    queryKey: ["customerList", "all"],
    queryFn: getCustomerList,
  });

  const { data: seriesList = [] as any[], isLoading: seriesLoading } = useQuery({
    queryKey: ["seriesList", branchId],
    queryFn: () => getSeriesList(Number(branchId)),
    enabled: !!branchId,
  });

  // Report query
  const { data: reportData, isLoading: reportLoading, isFetching, refetch } = useQuery({
    queryKey: ["salesReport", { fromDate, toDate, branchId, customerId, paymodeId, seriesId, decimalPart }],
    queryFn: () =>
      getSalesReport({
        BranchId: Number(branchId),
        SeriesId: Number(seriesId),
        FromDate: fromDate,
        ToDate: toDate,
        CustomerId: Number(customerId),
        PaymodeId: Number(paymodeId),
        Decimals: decimalPart,
      }),
  });

  // Client-side filtering
  const filteredSalesData = (reportData?.salesData || []).filter((row: any) => {
    // 1. Customer Filter
    if (customerId !== "0") {
      const selectedCust = customers.find((c: any) => String(c.customerId) === customerId);
      if (selectedCust) {
        const matchesName = row.customerName?.toLowerCase() === selectedCust.customerName?.toLowerCase();
        const matchesCode = row.customerCode?.toLowerCase() === selectedCust.code?.toLowerCase();
        if (!matchesName && !matchesCode) return false;
      }
    }

    // 2. Paymode Filter
    if (paymodeId !== "0") {
      const selectedPaymodeName = paymodes.find((p: any) => String(p.paymodeId) === paymodeId)?.paymodeName;
      if (selectedPaymodeName && row.paymode && row.paymode.toLowerCase() !== selectedPaymodeName.toLowerCase()) {
        return false;
      }
    }

    // 3. Branch Filter
    if (branchId !== "0") {
      const selectedBranchName = branches.find((b: any) => String(b.branchId) === branchId)?.branchName;
      if (selectedBranchName) {
        if (row.branchId !== undefined && String(row.branchId) !== branchId) return false;
        if (row.branchName && row.branchName.toLowerCase() !== selectedBranchName.toLowerCase()) return false;
      }
    }

    // 4. Series Filter
    if (seriesId !== "0") {
      const selectedSeriesName = seriesList.find((s: any) => String(s.seriesId) === seriesId)?.seriesName;
      if (selectedSeriesName) {
        if (row.seriesId !== undefined && String(row.seriesId) !== seriesId) return false;
        if (row.seriesName && row.seriesName.toLowerCase() !== selectedSeriesName.toLowerCase()) return false;
      }
    }

    return true;
  });

  const resetFilters = () => {
    const today = new Date();
    const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
    const defaultTo = today.toISOString().split("T")[0];
    
    const isBackofficeMode = sessionStorage.getItem("tempSystemType") === "backoffice" || localStorage.getItem("systemType") === "backoffice";
    const activeBranchId = isBackofficeMode 
      ? sessionStorage.getItem("backoffice_activeBranchId") 
      : localStorage.getItem("activeBranchId");
    const defaultBranch = activeBranchId || "1";

    setFromDate(defaultFrom);
    setToDate(defaultTo);
    setBranchId(defaultBranch);
    setCustomerId("0");
    setPaymodeId("0");
    setSeriesId("0");
    setSearchTerm("");
  };

  return {
    filters: {
      fromDate,
      setFromDate,
      toDate,
      setToDate,
      branchId,
      setBranchId,
      customerId,
      setCustomerId,
      paymodeId,
      setPaymodeId,
      seriesId,
      setSeriesId,
      searchTerm,
      setSearchTerm,
      resetFilters,
      isBranchLocked,
    },
    masterData: {
      branches,
      branchesLoading,
      paymodes,
      paymodesLoading,
      customers,
      customersLoading,
      series: seriesList,
      seriesLoading,
    },
    report: {
      salesData: filteredSalesData,
      paymodeData: reportData?.paymodeData || [],
      totalData: reportData?.totalData?.[0] || null,
      isLoading: reportLoading || isFetching,
      refetch,
    },
  };
};
