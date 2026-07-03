import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import {
  getStockRegisterReport,
  getBranchList,
  getGroupList,
  getCategoryList,
  getSubCategoryList,
  getProductTypeList,
  getProductList
} from "../services/stockRegisterReportApi";
import type { StockRegisterReportParams } from "../types";

export const useStockRegisterReport = () => {
  const decimalPart = useAppSelector(selectDecimalPart);

  // Filter states
  const [asOnDate, setAsOnDate] = useState<string>(() => {
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

  const [groupId, setGroupId] = useState<string>("0");
  const [categoryId, setCategoryId] = useState<string>("0");
  const [subCategoryId, setSubCategoryId] = useState<string>("0");
  const [productTypeId, setProductTypeId] = useState<string>("0");
  const [productId, setProductId] = useState<string>("0");
  const [searchTerm, setSearchTerm] = useState("");

  const handleSetCategoryId = (val: string) => {
    setCategoryId(val);
    setSubCategoryId("0");
  };

  // Master Data Queries
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["branchList", "all"],
    queryFn: getBranchList,
  });

  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ["groupList"],
    queryFn: getGroupList,
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categoryList"],
    queryFn: getCategoryList,
  });

  const { data: subcategories = [], isLoading: subcategoriesLoading } = useQuery({
    queryKey: ["subcategoryList", categoryId],
    queryFn: () => getSubCategoryList(Number(categoryId)),
    enabled: !!categoryId && categoryId !== "0",
  });

  const { data: productTypes = [], isLoading: productTypesLoading } = useQuery({
    queryKey: ["productTypeList"],
    queryFn: getProductTypeList,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["productList"],
    queryFn: getProductList,
  });

  // Report query
  const { data: reportData, isLoading: reportLoading, isFetching, refetch } = useQuery({
    queryKey: ["stockRegisterReport", { asOnDate, branchId, groupId, categoryId, subCategoryId, productTypeId, productId, decimalPart }],
    queryFn: () => {
      const params: StockRegisterReportParams = {
        BranchId: Number(branchId),
        AsOndate: asOnDate,
        Decimals: decimalPart,
      };

      if (groupId && groupId !== "0") params.GroupId = Number(groupId);
      if (categoryId && categoryId !== "0") params.CategoryId = Number(categoryId);
      if (subCategoryId && subCategoryId !== "0") params.SubCategoryId = Number(subCategoryId);
      if (productTypeId && productTypeId !== "0") params.ProductTypeId = Number(productTypeId);
      if (productId && productId !== "0") params.ProductId = Number(productId);

      return getStockRegisterReport(params);
    },
  });

  // Client-side filtering fallback
  const filteredProductData = useMemo(() => {
    return (reportData?.productData || []).filter((row: any) => {
      // 1. Group Filter
      if (groupId !== "0") {
        const selectedGroup = groups.find((g: any) => String(g.id) === groupId);
        if (selectedGroup && row.group?.toLowerCase() !== selectedGroup.name?.toLowerCase()) {
          return false;
        }
      }

      // 2. Category Filter
      if (categoryId !== "0") {
        const selectedCategory = categories.find((c: any) => String(c.id) === categoryId);
        if (selectedCategory && row.category?.toLowerCase() !== selectedCategory.name?.toLowerCase()) {
          return false;
        }
      }

      // 3. Product Filter
      if (productId !== "0") {
        const selectedProduct = products.find((p: any) => String(p.productId) === productId);
        if (selectedProduct) {
          const matchesName = row.productName?.toLowerCase() === selectedProduct.productName?.toLowerCase();
          const matchesCode = row.productCode?.toLowerCase() === selectedProduct.code?.toLowerCase();
          if (!matchesName && !matchesCode) return false;
        }
      }

      // 4. Search Term Filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          (row.productName && row.productName.toLowerCase().includes(term)) ||
          (row.productCode && row.productCode.toLowerCase().includes(term)) ||
          (row.group && row.group.toLowerCase().includes(term)) ||
          (row.category && row.category.toLowerCase().includes(term))
        );
      }

      return true;
    });
  }, [reportData?.productData, groupId, categoryId, productId, groups, categories, products, searchTerm]);

  const resetFilters = () => {
    const today = new Date();
    const defaultDate = today.toISOString().split("T")[0];
    
    const isBackofficeMode = sessionStorage.getItem("tempSystemType") === "backoffice" || localStorage.getItem("systemType") === "backoffice";
    const activeBranchId = isBackofficeMode 
      ? sessionStorage.getItem("backoffice_activeBranchId") 
      : localStorage.getItem("activeBranchId");
    const defaultBranch = activeBranchId || "1";

    setAsOnDate(defaultDate);
    setBranchId(defaultBranch);
    setGroupId("0");
    setCategoryId("0");
    setSubCategoryId("0");
    setProductTypeId("0");
    setProductId("0");
    setSearchTerm("");
  };

  return {
    filters: {
      asOnDate,
      setAsOnDate,
      branchId,
      setBranchId,
      groupId,
      setGroupId,
      categoryId,
      setCategoryId: handleSetCategoryId,
      subCategoryId,
      setSubCategoryId,
      productTypeId,
      setProductTypeId,
      productId,
      setProductId,
      searchTerm,
      setSearchTerm,
      resetFilters,
    },
    masterData: {
      branches,
      branchesLoading,
      groups,
      groupsLoading,
      categories,
      categoriesLoading,
      subcategories: categoryId === "0" ? [] : subcategories,
      subcategoriesLoading,
      productTypes,
      productTypesLoading,
      products,
      productsLoading,
    },
    report: {
      productData: filteredProductData,
      totalData: reportData?.totalData || null,
      isLoading: reportLoading || isFetching,
      refetch,
    },
  };
};
