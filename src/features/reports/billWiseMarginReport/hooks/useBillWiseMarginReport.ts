import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { BranchOption, CustomerOption, SeriesOption } from "../types";
import { getBillWiseMarginReport, getBranchList, getCustomerList, getSeriesList } from "../services/billWiseMarginReportApi";
import { getDecimalPart } from "../../../../utils/currency";

export const useBillWiseMarginReport = () => {
  const [branchId, setBranchId] = useState<string>(() => {
    const isBackofficeMode = sessionStorage.getItem("tempSystemType") === "backoffice" || localStorage.getItem("systemType") === "backoffice";
    const activeBranchId = isBackofficeMode 
      ? sessionStorage.getItem("backoffice_activeBranchId") 
      : localStorage.getItem("activeBranchId");
    return activeBranchId || "0";
  });
  const [seriesId, setSeriesId] = useState<string>("0");
  const [customerId, setCustomerId] = useState<string>("0");
  
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  
  const [fromDate, setFromDate] = useState<string>(() => {
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState<string>(todayStr);

  // Fetch branches for dropdown
  const { data = [] } = useQuery({
    queryKey: ["branches-for-margin-report"],
    queryFn: getBranchList,
  });
  const branches = data as BranchOption[];

  const branchOptions = useMemo(() => {
    const opts = branches
      .filter((b) => b.branchName && b.branchName.toLowerCase() !== "all")
      .map((b) => ({ value: String(b.branchId), label: b.branchName }));
    return [{ value: "0", label: "All" }, ...opts];
  }, [branches]);

  // Fetch customers for dropdown
  const { data: cData = [] } = useQuery({
    queryKey: ["customers-for-margin-report"],
    queryFn: getCustomerList,
  });
  const customers = cData as CustomerOption[];

  const customerOptions = useMemo(() => {
    const opts = customers
      .filter((c) => c.customerName && c.customerName.toLowerCase() !== "all")
      .map((c) => ({ value: String(c.customerId), label: c.code ? `[${c.code}] ${c.customerName}` : c.customerName }));
    return [{ value: "0", label: "All" }, ...opts];
  }, [customers]);

  // Fetch voucher series for dropdown
  const { data: sData = [] } = useQuery({
    queryKey: ["series-for-margin-report", branchId],
    queryFn: () => getSeriesList(branchId),
  });
  const series = sData as SeriesOption[];

  const seriesOptions = useMemo(() => {
    const opts = series
      .filter((s) => s.seriesName && s.seriesName.toLowerCase() !== "all")
      .map((s) => ({ value: String(s.seriesId), label: s.seriesName }));
    return [{ value: "0", label: "All" }, ...opts];
  }, [series]);

  // Fetch the report data
  const reportQuery = useQuery({
    queryKey: [
      "bill-wise-margin-report",
      branchId,
      seriesId,
      customerId,
      fromDate,
      toDate,
    ],
    queryFn: () =>
      getBillWiseMarginReport({
        BranchId: Number(branchId),
        SeriesId: Number(seriesId),
        CustomerId: Number(customerId),
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: getDecimalPart(),
      }),
  });

  const rows = useMemo(() => reportQuery.data?.salesData || [], [reportQuery.data]);
  
  const totals = useMemo(() => {
    if (reportQuery.data?.totalData && reportQuery.data.totalData.length > 0) {
      return reportQuery.data.totalData[0];
    }
    return { netValue: 0, cost: 0, margin: 0, marginper: 0 };
  }, [reportQuery.data]);

  const handleReset = useCallback(() => {
    const isBackofficeMode = sessionStorage.getItem("tempSystemType") === "backoffice" || localStorage.getItem("systemType") === "backoffice";
    const activeBranchId = isBackofficeMode 
      ? sessionStorage.getItem("backoffice_activeBranchId") 
      : localStorage.getItem("activeBranchId");

    setBranchId(activeBranchId || "0");
    setSeriesId("0");
    setCustomerId("0");
    setFromDate(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]);
    setToDate(todayStr);
  }, [today, todayStr]);

  return {
    filters: {
      branchId,
      setBranchId,
      seriesId,
      setSeriesId,
      customerId,
      setCustomerId,
      fromDate,
      setFromDate,
      toDate,
      setToDate,
    },
    options: {
      branchOptions,
      customerOptions,
      seriesOptions,
    },
    data: {
      rows,
      totals,
    },
    isLoading: reportQuery.isLoading || reportQuery.isFetching,
    handleReset,
  };
};
