import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getBranchList,
  getProductList,
  getVatList,
  getProductInputVatReport,
} from "../services/productInputVatReportApi";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import type {
  BranchOption,
  ProductOption,
  VatOption,
  ProductInputVatRow,
  ProductInputVatTotalData,
} from "../types";
import { useBranchScope } from "../../../../hooks/useBranchScope";

export const useProductInputVatReport = () => {
  const { initialBranchId, isBranchLocked } = useBranchScope();
  const defaultBranchId = initialBranchId || "1";

  const today = new Date();
  const defaultDate = today.toISOString().split("T")[0];

  const [branchId, setBranchId] = useState<string>(defaultBranchId);
  const [productId, setProductId] = useState<string>("0");
  const [vatId, setVatId] = useState<string>("0");
  const [fromDate, setFromDate] = useState<string>(defaultDate);
  const [toDate, setToDate] = useState<string>(defaultDate);

  const decimalPart = useAppSelector(selectDecimalPart) ?? 3;

  const resetFilters = () => {
    setBranchId(defaultBranchId);
    setProductId("0");
    setVatId("0");
    setFromDate(defaultDate);
    setToDate(defaultDate);
  };

  const { data: branches = [], isLoading: isLoadingBranches } = useQuery<BranchOption[]>({
    queryKey: ["branches-list-for-product-input-vat"],
    queryFn: getBranchList,
    staleTime: 5 * 60 * 1000,
  });

  const { data: productsData = [], isLoading: isLoadingProducts } = useQuery<ProductOption[]>({
    queryKey: ["products-list-for-product-input-vat"],
    queryFn: getProductList,
    staleTime: 5 * 60 * 1000,
  });

  const { data: vatsData = [], isLoading: isLoadingVats } = useQuery<VatOption[]>({
    queryKey: ["vats-list-for-product-input-vat"],
    queryFn: getVatList,
    staleTime: 5 * 60 * 1000,
  });

  const productOptions = useMemo(() => {
    const list = Array.isArray(productsData) ? productsData : [];
    const opts = list
      .filter((p) => p && (p.productId ?? p.id) !== undefined)
      .map((p) => {
        const id = String(p.productId ?? p.id);
        const name = p.productName ?? p.name ?? "";
        const code = p.productCode ?? p.code ?? "";
        const label = code ? `${code} - ${name}` : name;
        return { value: id, label: label || id };
      });
    return [{ value: "0", label: "All" }, ...opts];
  }, [productsData]);

  const vatOptions = useMemo(() => {
    const list = Array.isArray(vatsData) ? vatsData : [];
    const opts = list
      .filter((v) => v && (v.vatId ?? v.id) !== undefined)
      .map((v) => {
        const id = String(v.vatId ?? v.id);
        const name = v.vatName ?? v.name ?? (v.value !== undefined ? `${v.value}%` : `VAT ${id}`);
        return { value: id, label: name };
      });
    return [{ value: "0", label: "All" }, ...opts];
  }, [vatsData]);

  const branchOptions = useMemo(() => {
    const list = Array.isArray(branches) ? branches : [];
    return list.map((b) => ({
      value: String(b.branchId),
      label: b.branchName,
    }));
  }, [branches]);

  const {
    data: reportData,
    isLoading: isLoadingReport,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "product-input-vat-report",
      branchId,
      productId,
      vatId,
      fromDate,
      toDate,
      decimalPart,
    ],
    queryFn: () =>
      getProductInputVatReport({
        BranchId: Number(branchId) || 1,
        productId: Number(productId) > 0 ? Number(productId) : undefined,
        vatId: Number(vatId) > 0 ? Number(vatId) : undefined,
        FromDate: fromDate,
        ToDate: toDate,
        Decimals: decimalPart,
      }),
    enabled: !!fromDate && !!toDate && !!branchId,
  });

  const rows: ProductInputVatRow[] = useMemo(() => {
    return reportData?.outPutData || reportData?.inputData || reportData?.inPutData || [];
  }, [reportData]);

  const totalData: ProductInputVatTotalData | null = useMemo(() => {
    return reportData?.totalData || null;
  }, [reportData]);

  return {
    filters: {
      branchId,
      setBranchId,
      productId,
      setProductId,
      vatId,
      setVatId,
      fromDate,
      setFromDate,
      toDate,
      setToDate,
      isBranchLocked,
      resetFilters,
    },
    masterData: {
      branches,
      branchOptions,
      productOptions,
      vatOptions,
      isLoadingBranches,
      isLoadingProducts,
      isLoadingVats,
    },
    report: {
      rows,
      totalData,
      isLoading: isLoadingReport || isFetching,
      error,
      refetch,
    },
  };
};
