import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useBarcodeScanner } from "../../../pos/terminal/hooks/useBarcodeScanner";
import { productService } from "../services/productService";
import { useToast } from "../../../../app/providers/useToast";
import { PageShell, ListHeader } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import ProductListCard from "../components/ProductListCard";
import { useProductList } from "../hooks/useProductList";
import type { ProductListItem } from "../types";
import { usePermissions } from "../../../../hooks/usePermissions";

const ProductListPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const {
    products, 
    search,
    filteredProducts,
    listLoading,
    setSearch,
  } = useProductList();

  const [pendingDelete, setPendingDelete] = useState<{ productId: number; name: string } | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productService.delete(id),
    onSuccess: () => {
      showToast("Product deleted successfully", "success", "Success");
      queryClient.invalidateQueries({ queryKey: ["productsList"] });
      queryClient.invalidateQueries({ queryKey: ["product"] });
      queryClient.invalidateQueries({ queryKey: ["productClosingStock"] });
      queryClient.invalidateQueries({ queryKey: ["productAverageCost"] });
      setPendingDelete(null);
    },
    onError: (error: any) => {
      showToast(error.message || "Failed to delete product", "error", "Error");
      setPendingDelete(null);
    }
  });

  const canAdd = hasPermission("Product Master", "Add");
  const canEdit = hasPermission("Product Master", "Edit");
  const canDelete = hasPermission("Product Master", "Delete");

  // ─── Scan to Edit Logic (Local Only) ──────────────────────────────────────

  const handleScan = async (scannedValue: string) => {
    if (!canEdit) return;
    const code = scannedValue.trim();
    if (!code) return;

    showToast(`Scanning: ${code}...`, "info");

    // 1. Local Lookup
    const localMatch = (products || []).find((p: ProductListItem) => p.code.toLowerCase() === code.toLowerCase());
    
    if (localMatch) {
      showToast(`Product found: ${localMatch.name}. Opening editor...`, "success");
      navigate(`/dashboard/products/edit/${localMatch.productId}`);
      return;
    }

    // 2. Server Lookup (Specialized search)
    try {
      const detail = await productService.getByCode(code);
      const productArr = Array.isArray(detail.product) ? detail.product : detail.product ? [detail.product] : [];
      const item = productArr[0];
      
      if (item) {
        showToast(`Product found: ${item.name}. Opening editor...`, "success");
        navigate(`/dashboard/products/edit/${item.productId}`);
      } else {
        showToast(`Product with code "${code}" not found.`, "error");
      }
    } catch {
      showToast(`Product code "${code}" not found.`, "error");
    }
  };

  useBarcodeScanner(handleScan);

  return (
    <PageShell title="Product Master">
      <ListHeader
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search products..."
        autoFocusSearch
        canAdd={canAdd}
        onAdd={() => navigate("/dashboard/products/add")}
      />

      <ProductListCard
        records={filteredProducts}
        loading={listLoading}
        onEdit={canEdit ? (record: ProductListItem) => navigate(`/dashboard/products/edit/${record.productId}`) : undefined}
        onDelete={canDelete ? (record: { productId: number; name: string }) => setPendingDelete(record) : undefined}
      />

      {/* ── Delete confirmation dialog ───────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!pendingDelete}
        title="Delete Product"
        message={
          pendingDelete
            ? `Are you sure you want to delete "${pendingDelete.name}"? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (pendingDelete) {
            deleteMutation.mutate(pendingDelete.productId);
          }
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </PageShell>
  );
};

export default ProductListPage;
