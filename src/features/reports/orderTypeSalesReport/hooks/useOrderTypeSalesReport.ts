import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBranchList, getOrderTypeSalesReport } from "../services/orderTypeSalesReportApi";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import type { BranchOption, OrderTypeSalesReportData } from "../types";
import { useBranchScope } from "../../../../hooks/useBranchScope";

export const useOrderTypeSalesReport = () => {
  const { initialBranchId: currentBranchId, isBranchLocked } = useBranchScope();
  const defaultBranchId = isBranchLocked ? String(currentBranchId) : "0";

  // Use today's date in YYYY-MM-DD format as the default
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
    queryKey: ["order-type-sales-report", branchId, fromDate, toDate, decimalPart],
    queryFn: () =>
      getOrderTypeSalesReport({
        BranchId: Number(branchId) || 0,
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: decimalPart,
      }),
    enabled: !!fromDate && !!toDate,
    select: (response): OrderTypeSalesReportData => {
      const data = response?.data;
      if (!data || !data.rows || !data.columns) {
        return { columns: [], rows: [] };
      }

      // Ensure "Total" is always present in columns
      const cols = [...data.columns];
      if (!cols.includes("Total")) {
        cols.push("Total");
      }

      const newRows = data.rows.map(row => {
        const rowTotal = cols.reduce((sum, col) => {
          if (col !== "Date") {
            return sum + (Number(row[col]) || 0);
          }
          return sum;
        }, 0);
        
        const mappedRow: Record<string, string | number> = { ...row };
        
        // Map VoucherDate to Date so the UI and exports can dynamically map it natively
        if (mappedRow.VoucherDate) {
          mappedRow.Date = mappedRow.VoucherDate;
        }

        mappedRow.Total = String(rowTotal);
        
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
