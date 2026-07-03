import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import type { BranchOption, SupplierOption, ProductOption, ProductWisePurchaseReportParams } from "../types";
import {
  getProductWisePurchaseReport,
  getBranchList,
  getSupplierList,
  getProductList,
} from "../services/productWisePurchaseReportApi";

export const useProductWisePurchaseReport = () => {
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
  const [productId, setProductId] = useState<string>("0");
  const [supplierId, setSupplierId] = useState<string>("0");
  const [searchTerm, setSearchTerm] = useState("");

  // Master data queries
  const { data: branches = [] as BranchOption[], isLoading: branchesLoading } = useQuery({
    queryKey: ["branchList", "all"],
    queryFn: getBranchList,
  });

  const { data: suppliers = [] as SupplierOption[], isLoading: suppliersLoading } = useQuery({
    queryKey: ["supplierList", "all"],
    queryFn: getSupplierList,
  });

  const { data: products = [] as ProductOption[], isLoading: productsLoading } = useQuery({
    queryKey: ["productList", "all"],
    queryFn: getProductList,
  });

  // Report query
  const { data: reportData, isLoading: reportLoading, isFetching, refetch } = useQuery({
    queryKey: ["productWisePurchaseReport", { fromDate, toDate, branchId, productId, supplierId, decimalPart }],
    queryFn: () => {
      const params: ProductWisePurchaseReportParams = {
        BranchId: Number(branchId),
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: decimalPart,
      };
      if (productId && productId !== "0") params.productId = Number(productId);
      if (supplierId && supplierId !== "0") params.supplierId = Number(supplierId);
      return getProductWisePurchaseReport(params);
    },
  });

  // Client-side filtering fallback for search term and filter selections
  const filteredPurchaseData = (reportData?.purchaseData || []).filter((row: any) => {
    // 1. Supplier Filter
    if (supplierId !== "0") {
      const selectedSup = suppliers.find((s: any) => String(s.supplierId) === supplierId);
      if (selectedSup) {
        const matchesName = row.supplierName?.toLowerCase() === selectedSup.supplierName?.toLowerCase();
        if (!matchesName) return false;
      }
    }

    // 2. Product Filter
    if (productId !== "0") {
      const selectedProd = products.find((p: any) => String(p.productId) === productId);
      if (selectedProd) {
        const matchesName = row.productnName?.toLowerCase() === selectedProd.productName?.toLowerCase();
        const matchesCode = row.productCode?.toLowerCase() === selectedProd.code?.toLowerCase();
        if (!matchesName && !matchesCode) return false;
      }
    }

    // 3. Search Term Filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      return (
        (row.productnName && row.productnName.toLowerCase().includes(term)) ||
        (row.productCode && row.productCode.toLowerCase().includes(term)) ||
        (row.supplierName && row.supplierName.toLowerCase().includes(term)) ||
        (row["p/R Number"] && row["p/R Number"].toLowerCase().includes(term)) ||
        (row.invoiceNo && row.invoiceNo.toLowerCase().includes(term))
      );
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
    setProductId("0");
    setSupplierId("0");
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
      productId,
      setProductId,
      supplierId,
      setSupplierId,
      searchTerm,
      setSearchTerm,
      resetFilters,
    },
    masterData: {
      branches,
      branchesLoading,
      suppliers,
      suppliersLoading,
      products,
      productsLoading,
    },
    report: {
      purchaseData: filteredPurchaseData,
      totalData: reportData?.totalData || null,
      isLoading: reportLoading || isFetching,
      refetch,
    },
  };
};
