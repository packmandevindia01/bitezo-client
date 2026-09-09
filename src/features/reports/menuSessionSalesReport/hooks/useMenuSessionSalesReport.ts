import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBranchList, getMenuSessionSalesReport } from "../services/menuSessionSalesReportApi";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import type { BranchOption, MenuSessionSalesReportData } from "../types";
import { useBranchScope } from "../../../../hooks/useBranchScope";

export const useMenuSessionSalesReport = () => {
  const { initialBranchId: currentBranchId, isBranchLocked } = useBranchScope();
  const defaultBranchId = isBranchLocked ? String(currentBranchId) : "0";

  // Use today's date in YYYY-MM-DD format as default
  const today = new Date();
  const defaultDate = today.toISOString().split("T")[0];

  const [branchId, setBranchId] = useState<string>(defaultBranchId);
  const [fromDate, setFromDate] = useState<string>(defaultDate);
  const [toDate, setToDate] = useState<string>(defaultDate);

  const decimalPart = useAppSelector(selectDecimalPart) ?? 3;

  const resetFilters = () => {
    setBranchId(defaultBranchId);
    setFromDate(defaultDate);
    setToDate(defaultDate);
  };

  const { data: branches = [], isLoading: isLoadingBranches } = useQuery<BranchOption[]>({
    queryKey: ["branches-list"],
    queryFn: getBranchList,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: reportData,
    isLoading: isLoadingReport,
    isFetching,
    error,
  } = useQuery({
    queryKey: ["menu-session-sales-report", branchId, fromDate, toDate, decimalPart],
    queryFn: () =>
      getMenuSessionSalesReport({
        BranchId: Number(branchId) || 0,
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: decimalPart,
      }),
    enabled: !!fromDate && !!toDate,
    select: (response): MenuSessionSalesReportData => {
      const data = response?.data;
      if (!data || !data.rows || !data.columns) {
        return { columns: [], rows: [] };
      }

      // Ensure "Total" is present in columns if not provided
      const cols = [...data.columns];
      if (!cols.includes("Total")) {
        cols.push("Total");
      }

      const newRows = data.rows.map((row) => {
        const mappedRow: Record<string, string | number> = { ...row };

        // Map VoucherDate to Date if present
        if (mappedRow.VoucherDate) {
          mappedRow.Date = mappedRow.VoucherDate;
        }

        // Calculate total for row if not provided or to ensure accuracy
        if (mappedRow.Total === undefined) {
          const rowTotal = cols.reduce((sum, col) => {
            if (col !== "Date") {
              return sum + (Number(row[col]) || 0);
            }
            return sum;
          }, 0);
          mappedRow.Total = String(rowTotal);
        }

        return mappedRow;
      });

      return {
        columns: cols,
        rows: newRows,
      };
    },
  });

  return {
    filters: {
      branchId,
      setBranchId,
      fromDate,
      setFromDate,
      toDate,
      setToDate,
      isBranchLocked,
      resetFilters,
    },
    masterData: {
      branches,
      isLoadingBranches,
    },
    report: {
      columns: reportData?.columns || [],
      rows: reportData?.rows || [],
      isLoading: isLoadingReport || isFetching,
      error,
    },
  };
};
