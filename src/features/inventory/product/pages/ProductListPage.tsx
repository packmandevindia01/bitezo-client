import { useNavigate } from "react-router-dom";
import { useBarcodeScanner } from "../../../pos/hooks/useBarcodeScanner";
import { productService } from "../services/productService";
import { useToast } from "../../../../app/providers/useToast";
import { PageShell } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import ProductListCard from "../components/ProductListCard";
import { useProductManager } from "../hooks/useProductManager";
import type { ProductListItem } from "../types";
import { usePermissions } from "../../../../hooks/usePermissions";

const ProductListPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const {
    products, 
    search,
    filteredProducts,
    listLoading,
    setSearch,
    requestDelete,
    pendingDelete,
    deleting,
    confirmDelete,
    cancelDelete,
  } = useProductManager();

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
      <ProductListCard
        records={filteredProducts}
        search={search}
        loading={listLoading}
        onSearchChange={setSearch}
        onAdd={canAdd ? () => navigate("/dashboard/products/add") : undefined}
        onEdit={canEdit ? (record: ProductListItem) => navigate(`/dashboard/products/edit/${record.productId}`) : undefined}
        onDelete={canDelete ? requestDelete : undefined}
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
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </PageShell>
  );
};

export default ProductListPage;
