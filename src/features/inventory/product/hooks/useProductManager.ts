import { useEffect } from "react";
import type { ProductListItem } from "../types";
import { useProductList } from "./useProductList";
import { useProductFormState } from "./useProductFormState";
import { useProductAlternatives } from "./useProductAlternatives";
import { useProductMasterData } from "./useProductMasterData";
import { useProductActions } from "./useProductActions";

export const useProductManager = () => {
  // 1. Compose specialized state hooks
  const productList = useProductList();
  const formState = useProductFormState();
  const altState = useProductAlternatives();
  const masterDataState = useProductMasterData(formState.form.categoryId);

  // 2. Compose action hook with dependencies
  const {
    saving,
    detailLoading,
    deleting,
    pendingDelete,
    setPendingDelete,
    resetForm,
    handleEditById,
    handleSave,
    confirmDelete,
    handleDeactivate,
  } = useProductActions({ formState, altState, productList });

  // 3. Initial load orchestration
  useEffect(() => {
    productList.fetchProducts();
  }, [productList.fetchProducts]);

  // 4. Adapter methods for legacy UI compatibility
  const openCreateModal = () => resetForm();
  const closeModal = () => resetForm();
  const handleEdit = (record: ProductListItem) => handleEditById(record.productId);
  const requestDelete = (record: { productId: number; name: string }) => setPendingDelete(record);
  const cancelDelete = () => setPendingDelete(null);

  return {
    ...productList,
    ...formState,
    ...altState,
    ...masterDataState,
    saving,
    detailLoading,
    pendingDelete,
    deleting,
    resetForm,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    handleEditById,
    handleDeactivate,
    requestDelete,
    cancelDelete,
    confirmDelete,
  } as const;
};
