import { useNavigate } from "react-router-dom";
import { PageShell } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import ProductListCard from "../components/ProductListCard";
import { useProductManager } from "../hooks/useProductManager";

const ProductListPage = () => {
  const navigate = useNavigate();
  const {
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

  return (
    <PageShell title="Product Master">
      <ProductListCard
        records={filteredProducts}
        search={search}
        loading={listLoading}
        onSearchChange={setSearch}
        onAdd={() => navigate("/dashboard/products/add")}
        onEdit={(record) => navigate(`/dashboard/products/edit/${record.productId}`)}
        onDelete={requestDelete}
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
