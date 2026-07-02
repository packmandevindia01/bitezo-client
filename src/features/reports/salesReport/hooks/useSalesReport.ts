import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSalesReport, getBranchList, getPaymodeList, getCustomerList } from "../services/salesReportApi";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import type { BranchOption, PaymodeOption, CustomerOption } from "../types";

export const useSalesReport = () => {
  const decimalPart = useAppSelector(selectDecimalPart);

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
  const [branchId, setBranchId] = useState<string>(() => {
    const isBackofficeMode = sessionStorage.getItem("tempSystemType") === "backoffice" || localStorage.getItem("systemType") === "backoffice";
    const activeBranchId = isBackofficeMode 
      ? sessionStorage.getItem("backoffice_activeBranchId") 
      : localStorage.getItem("activeBranchId");
    return activeBranchId || "0";
  });
  const [customerId, setCustomerId] = useState<string>("0");
  const [paymodeId, setPaymodeId] = useState<string>("0");
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

  // Report query
  const { data: reportData, isLoading: reportLoading, isFetching } = useQuery({
    queryKey: ["salesReport", { fromDate, toDate, branchId, customerId, paymodeId, decimalPart }],
    queryFn: () =>
      getSalesReport({
        BranchId: Number(branchId),
        SeriesId: 0,
        FromDate: fromDate,
        ToDate: toDate,
        CustomerId: Number(customerId),
        PaymodeId: Number(paymodeId),
        Decimals: decimalPart,
      }),
  });

  // Client-side filtering
  const filteredSalesData = (reportData?.salesData || []).filter((row: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      row.invoiceNo?.toLowerCase().includes(term) ||
      row.customerName?.toLowerCase().includes(term) ||
      row.paymode?.toLowerCase().includes(term) ||
      row.customerCode?.toLowerCase().includes(term)
    );
  });

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
      searchTerm,
      setSearchTerm,
    },
    masterData: {
      branches,
      branchesLoading,
      paymodes,
      paymodesLoading,
      customers,
      customersLoading,
    },
    report: {
      salesData: filteredSalesData,
      paymodeData: reportData?.paymodeData || [],
      totalData: reportData?.totalData?.[0] || null,
      isLoading: reportLoading || isFetching,
    },
  };
};
