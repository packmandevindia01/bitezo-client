import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { 
  BranchOption, 
  ProductOption, 
  GroupOption, 
  CategoryOption, 
  SubCategoryOption 
} from "../types";
import { 
  getProductWiseMarginReport, 
  getBranchList, 
  getProductList, 
  getGroupList, 
  getCategoryList, 
  getSubCategoryList 
} from "../services/productWiseMarginReportApi";
import { getDecimalPart } from "../../../../utils/currency";
import { useBranchScope } from "../../../../hooks/useBranchScope";

export const useProductWiseMarginReport = () => {
  const { initialBranchId, isBranchLocked } = useBranchScope();
  const defaultBranchId = initialBranchId || "1";
  const [branchId, setBranchId] = useState<string>(defaultBranchId);

  const handleSetBranchId = (val: string) => {
    setBranchId(val || defaultBranchId);
  };
  
  const [productId, setProductId] = useState<string>("0");
  const [groupId, setGroupId] = useState<string>("0");
  const [categoryId, setCategoryId] = useState<string>("0");
  const [subcategoryId, setSubcategoryId] = useState<string>("0");
  
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  
  const [fromDate, setFromDate] = useState<string>(() => {
    return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState<string>(todayStr);

  const finalBranchId = Number(branchId) || Number(defaultBranchId) || 1;

  // Fetch branches
  const { data: bData = [] } = useQuery({
    queryKey: ["branches-for-pwm-report"],
    queryFn: getBranchList,
  });
  const branches = Array.isArray(bData) ? (bData as BranchOption[]) : [];

  const branchOptions = useMemo(() => {
    return branches.map((b) => ({ value: String(b?.branchId ?? ""), label: b?.branchName || "" }));
  }, [branches]);

  // Fetch products
  const { data: pData = [] } = useQuery({
    queryKey: ["products-for-pwm-report", finalBranchId],
    queryFn: () => getProductList(finalBranchId),
  });
  const products = Array.isArray(pData) ? (pData as ProductOption[]) : [];

  const productOptions = useMemo(() => {
    const opts = products
      .filter((p) => {
        const pName = p?.name || (p as any)?.productName;
        return pName && String(pName).toLowerCase() !== "all";
      })
      .map((p) => {
        const pName = p?.name || (p as any)?.productName || "";
        const pCode = p?.code || (p as any)?.productCode || "";
        return {
          value: String(p?.productId ?? (p as any)?.id ?? ""),
          label: pCode ? `[${pCode}] ${pName}` : pName,
        };
      });
    return [{ value: "0", label: "All" }, ...opts];
  }, [products]);

  // Fetch groups
  const { data: gData = [] } = useQuery({
    queryKey: ["groups-for-pwm-report"],
    queryFn: getGroupList,
  });
  const groups = Array.isArray(gData) ? (gData as GroupOption[]) : [];

  const groupOptions = useMemo(() => {
    const opts = groups
      .filter((g) => g?.name && g.name.toLowerCase() !== "all")
      .map((g) => ({ value: String(g.grpId), label: g.name }));
    return [{ value: "0", label: "All" }, ...opts];
  }, [groups]);

  // Fetch categories
  const { data: cData = [] } = useQuery({
    queryKey: ["categories-for-pwm-report"],
    queryFn: getCategoryList,
  });
  const categories = Array.isArray(cData) ? (cData as CategoryOption[]) : [];

  const categoryOptions = useMemo(() => {
    const opts = categories
      .filter((c) => c?.catName && c.catName.toLowerCase() !== "all")
      .map((c) => ({ value: String(c.catId), label: c.catName }));
    return [{ value: "0", label: "All" }, ...opts];
  }, [categories]);

  // Fetch subcategories
  const { data: sData = [] } = useQuery({
    queryKey: ["subcategories-for-pwm-report"],
    queryFn: getSubCategoryList,
  });
  const subcategories = Array.isArray(sData) ? (sData as SubCategoryOption[]) : [];

  const subcategoryOptions = useMemo(() => {
    const opts = subcategories
      .filter((s) => s?.name && s.name.toLowerCase() !== "all")
      .map((s) => ({ value: String(s.subCatId), label: s.name }));
    return [{ value: "0", label: "All" }, ...opts];
  }, [subcategories]);

  // Fetch the report data
  const reportQuery = useQuery({
    queryKey: [
      "product-wise-margin-report",
      finalBranchId,
      productId,
      groupId,
      categoryId,
      subcategoryId,
      fromDate,
      toDate,
    ],
    queryFn: () =>
      getProductWiseMarginReport({
        BranchId: finalBranchId,
        ProductId: Number(productId) || 0,
        GroupId: Number(groupId) || 0,
        CategoryId: Number(categoryId) || 0,
        SubcategoryId: Number(subcategoryId) || 0,
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: getDecimalPart(),
      }),
    enabled: !!fromDate && !!toDate,
    staleTime: 0,
    refetchOnMount: true,
  });

  const data = useMemo(() => {
    if (!reportQuery.data) return { rows: [], totals: null };
    const rawRows = reportQuery.data.productsData || (Array.isArray(reportQuery.data) ? reportQuery.data : []);
    const safeRows = Array.isArray(rawRows) ? rawRows : [];
    const totals = Array.isArray(reportQuery.data.totalData) ? reportQuery.data.totalData[0] : (reportQuery.data.totalData || null);
    return {
      rows: safeRows,
      totals: totals || null,
    };
  }, [reportQuery.data]);

  const handleReset = useCallback(() => {
    setBranchId(defaultBranchId);
    setProductId("0");
    setGroupId("0");
    setCategoryId("0");
    setSubcategoryId("0");
    setFromDate(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]);
    setToDate(todayStr);
    setTimeout(() => {
      reportQuery.refetch();
    }, 0);
  }, [today, todayStr, defaultBranchId, reportQuery]);

  return {
    filters: {
      defaultBranchId,
      branchId,
      setBranchId: handleSetBranchId,
      isBranchLocked,
      productId,
      setProductId,
      groupId,
      setGroupId,
      categoryId,
      setCategoryId,
      subcategoryId,
      setSubcategoryId,
      fromDate,
      setFromDate,
      toDate,
      setToDate,
    },
    options: {
      branchOptions,
      productOptions,
      groupOptions,
      categoryOptions,
      subcategoryOptions,
    },
    data,
    isLoading: reportQuery.isLoading || reportQuery.isFetching,
    handleReset,
    refetch: reportQuery.refetch,
  };
};
