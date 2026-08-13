import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getStockTransferReport,
  getBranchList,
  getEmployeeList,
} from "../services/stockTransferReportApi";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import { useBranchScope } from "../../../../hooks/useBranchScope";
import type { BranchOption, EmployeeOption } from "../types";

export const useStockTransferReport = () => {
  const decimalPart = useAppSelector(selectDecimalPart);
  const { isBranchLocked, initialBranchId } = useBranchScope();

  // ── Filter states ───────────────────────────────────────────────────────────
  const [fromDate, setFromDate] = useState<string>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split("T")[0];
  });
  const [toDate, setToDate] = useState<string>(() =>
    new Date().toISOString().split("T")[0]
  );
  const [fromBranchId, setFromBranchId] = useState<string>(initialBranchId);
  const [toBranchId, setToBranchId] = useState<string>("0");
  const [employeeId, setEmployeeId] = useState<string>("0");
  const [searchTerm, setSearchTerm] = useState("");

  // ── Master data ─────────────────────────────────────────────────────────────
  const { data: branches = [] as BranchOption[], isLoading: branchesLoading } = useQuery({
    queryKey: ["branchList", "all"],
    queryFn: getBranchList,
  });

  const { data: employees = [] as EmployeeOption[], isLoading: employeesLoading } = useQuery({
    queryKey: ["stockTransferEmployeeList", fromBranchId],
    queryFn: () => getEmployeeList(Number(fromBranchId)),
    enabled: !!fromBranchId && fromBranchId !== "0",
  });


  // ── Report query ─────────────────────────────────────────────────────────────
  const {
    data: reportRows = [],
    isLoading: reportLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      "stockTransferReport",
      { fromDate, toDate, fromBranchId, toBranchId, employeeId, decimalPart },
    ],
    queryFn: () =>
      getStockTransferReport({
        FromBranchId: Number(fromBranchId),
        ToBranchId: Number(toBranchId),
        EmployeeId: Number(employeeId),
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: decimalPart,
      }),
  });

  // ── Client-side search ──────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return reportRows;
    const term = searchTerm.toLowerCase();
    return reportRows.filter(
      (row) =>
        row.fromBranch?.toLowerCase().includes(term) ||
        row.toBranch?.toLowerCase().includes(term) ||
        row.employee?.toLowerCase().includes(term) ||
        String(row.refNo).includes(term)
    );
  }, [reportRows, searchTerm]);

  // ── Grand total ─────────────────────────────────────────────────────────────
  const grandTotal = useMemo(
    () => filteredRows.reduce((s, r) => s + Number(r.netAmount || 0), 0),
    [filteredRows]
  );

  // ── Reset ───────────────────────────────────────────────────────────────────
  const resetFilters = () => {
    const today = new Date();
    const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const isBackofficeMode =
      sessionStorage.getItem("tempSystemType") === "backoffice" ||
      localStorage.getItem("systemType") === "backoffice";
    const activeBranchId = isBackofficeMode
      ? sessionStorage.getItem("backoffice_activeBranchId")
      : localStorage.getItem("activeBranchId");

    setFromDate(defaultFrom);
    setToDate(today.toISOString().split("T")[0]);
    setFromBranchId(activeBranchId || "1");
    setToBranchId("0");
    setEmployeeId("0");
    setSearchTerm("");
  };

  return {
    filters: {
      fromDate, setFromDate,
      toDate, setToDate,
      fromBranchId, setFromBranchId,
      toBranchId, setToBranchId,
      employeeId, setEmployeeId,
      searchTerm, setSearchTerm,
      resetFilters,
      isBranchLocked,
    },
    masterData: {
      branches, branchesLoading,
      employees, employeesLoading,
    },
    report: {
      rows: filteredRows,
      grandTotal,
      isLoading: reportLoading || isFetching,
      refetch,
    },
  };
};
