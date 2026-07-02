import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import type { BranchOption, PaymodeOption, SupplierOption } from "../types";
import {
  getPurchaseReturnReport,
  getBranchList,
  getPaymodeList,
  getSupplierList,
  getSeriesList,
} from "../services/purchaseReturnReportApi";

export const usePurchaseReturnReport = () => {
  const decimalPart = useAppSelector(selectDecimalPart);

  // Filter states
  const [fromDate, setFromDate] = useState<string>(() => {
    const today = new Date();
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
    return activeBranchId || "1";
  });
  const [supplierId, setSupplierId] = useState<string>("0");
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

  const { data: suppliers = [] as SupplierOption[], isLoading: suppliersLoading } = useQuery({
    queryKey: ["supplierList", "all"],
    queryFn: getSupplierList,
  });

  const { data: seriesList = [] as any[], isLoading: seriesLoading } = useQuery({
    queryKey: ["seriesList", "purchaseReturn", branchId],
    queryFn: () => getSeriesList(Number(branchId)),
    enabled: !!branchId,
  });

  // Report query
  const { data: reportData, isLoading: reportLoading, isFetching, refetch } = useQuery({
    queryKey: ["purchaseReturnReport", { fromDate, toDate, branchId, supplierId, paymodeId, seriesId, decimalPart }],
    queryFn: () =>
      getPurchaseReturnReport({
        BranchId: Number(branchId),
        SeriesId: Number(seriesId),
        FromDate: fromDate,
        ToDate: toDate,
        SupplierId: Number(supplierId),
        PaymodeId: Number(paymodeId),
        Decimals: decimalPart,
      }),
  });

  // Client-side filtering fallback
  const filteredPurchaseReturnData = (reportData?.purchaseReturnData || []).filter((row: any) => {
    // 1. Supplier Filter
    if (supplierId !== "0") {
      const selectedSup = suppliers.find((s: any) => String(s.supplierId) === supplierId);
      if (selectedSup) {
        const matchesName = row.supplierName?.toLowerCase() === selectedSup.supplierName?.toLowerCase();
        const matchesCode = row.supplierCode?.toLowerCase() === selectedSup.code?.toLowerCase();
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

  return {
    filters: {
      fromDate,
      setFromDate,
      toDate,
      setToDate,
      branchId,
      setBranchId,
      supplierId,
      setSupplierId,
      paymodeId,
      setPaymodeId,
      seriesId,
      setSeriesId,
      searchTerm,
      setSearchTerm,
    },
    masterData: {
      branches,
      branchesLoading,
      paymodes,
      paymodesLoading,
      suppliers,
      suppliersLoading,
      series: seriesList,
      seriesLoading,
    },
    report: {
      purchaseReturnData: filteredPurchaseReturnData,
      paymodeData: reportData?.paymodeData || [],
      totalData: reportData?.totalData?.[0] || null,
      isLoading: reportLoading || isFetching,
      refetch,
    },
  };
};
