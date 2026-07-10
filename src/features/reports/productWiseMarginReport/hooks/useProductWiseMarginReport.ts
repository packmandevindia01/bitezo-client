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

export const useProductWiseMarginReport = () => {
  const [branchId, setBranchId] = useState<string>(() => {
    const isBackofficeMode = sessionStorage.getItem("tempSystemType") === "backoffice" || localStorage.getItem("systemType") === "backoffice";
    const activeBranchId = isBackofficeMode 
      ? sessionStorage.getItem("backoffice_activeBranchId") 
      : localStorage.getItem("activeBranchId");
    return activeBranchId || "0";
  });
  
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

  // Fetch branches
  const { data: bData = [] } = useQuery({
    queryKey: ["branches-for-pwm-report"],
    queryFn: getBranchList,
  });
  const branches = bData as BranchOption[];

  const branchOptions = useMemo(() => {
    const opts = branches
      .filter((b) => b.branchName && b.branchName.toLowerCase() !== "all")
      .map((b) => ({ value: String(b.branchId), label: b.branchName }));
    return [{ value: "0", label: "All" }, ...opts];
  }, [branches]);

  // Fetch products
  const { data: pData = [] } = useQuery({
    queryKey: ["products-for-pwm-report"],
    queryFn: getProductList,
  });
  const products = pData as ProductOption[];

  const productOptions = useMemo(() => {
    const opts = products
      .filter((p) => p.name && p.name.toLowerCase() !== "all")
      .map((p) => ({ value: String(p.productId), label: p.code ? `[${p.code}] ${p.name}` : p.name }));
    return [{ value: "0", label: "All" }, ...opts];
  }, [products]);

  // Fetch groups
  const { data: gData = [] } = useQuery({
    queryKey: ["groups-for-pwm-report"],
    queryFn: getGroupList,
  });
  const groups = gData as GroupOption[];

  const groupOptions = useMemo(() => {
    const opts = groups
      .filter((g) => g.name && g.name.toLowerCase() !== "all")
      .map((g) => ({ value: String(g.grpId), label: g.name }));
    return [{ value: "0", label: "All" }, ...opts];
  }, [groups]);

  // Fetch categories
  const { data: cData = [] } = useQuery({
    queryKey: ["categories-for-pwm-report"],
    queryFn: getCategoryList,
  });
  const categories = cData as CategoryOption[];

  const categoryOptions = useMemo(() => {
    const opts = categories
      .filter((c) => c.catName && c.catName.toLowerCase() !== "all")
      .map((c) => ({ value: String(c.catId), label: c.catName }));
    return [{ value: "0", label: "All" }, ...opts];
  }, [categories]);

  // Fetch subcategories
  const { data: sData = [] } = useQuery({
    queryKey: ["subcategories-for-pwm-report"],
    queryFn: getSubCategoryList,
  });
  const subcategories = sData as SubCategoryOption[];

  const subcategoryOptions = useMemo(() => {
    const opts = subcategories
      .filter((s) => s.name && s.name.toLowerCase() !== "all")
      .map((s) => ({ value: String(s.subCatId), label: s.name }));
    return [{ value: "0", label: "All" }, ...opts];
  }, [subcategories]);

  // Fetch the report data
  const reportQuery = useQuery({
    queryKey: [
      "product-wise-margin-report",
      branchId,
      productId,
      groupId,
      categoryId,
      subcategoryId,
      fromDate,
      toDate,
    ],
    queryFn: () =>
      getProductWiseMarginReport({
        BranchId: Number(branchId),
        ProductId: Number(productId),
        GroupId: Number(groupId),
        CategoryId: Number(categoryId),
        SubcategoryId: Number(subcategoryId),
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: getDecimalPart(),
      }),
    enabled: !!fromDate && !!toDate,
  });

  const data = useMemo(() => {
    if (!reportQuery.data) return { rows: [], totals: null };
    return {
      rows: reportQuery.data.productsData || [],
      totals: reportQuery.data.totalData?.[0] || null,
    };
  }, [reportQuery.data]);

  const handleReset = useCallback(() => {
    const isBackofficeMode = sessionStorage.getItem("tempSystemType") === "backoffice" || localStorage.getItem("systemType") === "backoffice";
    const activeBranchId = isBackofficeMode 
      ? sessionStorage.getItem("backoffice_activeBranchId") 
      : localStorage.getItem("activeBranchId");

    setBranchId(activeBranchId || "0");
    setProductId("0");
    setGroupId("0");
    setCategoryId("0");
    setSubcategoryId("0");
    setFromDate(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]);
    setToDate(todayStr);
  }, [today, todayStr]);

  return {
    filters: {
      branchId, setBranchId,
      productId, setProductId,
      groupId, setGroupId,
      categoryId, setCategoryId,
      subcategoryId, setSubcategoryId,
      fromDate, setFromDate,
      toDate, setToDate,
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
  };
};
