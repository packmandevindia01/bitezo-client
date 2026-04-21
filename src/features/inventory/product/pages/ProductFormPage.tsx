import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, ConfirmDialog, PageShell } from "../../../../components/common";
import ProductMasterForm from "../components/ProductMasterForm";
import { useProductManager } from "../hooks/useProductManager";
import { useBarcodeScanner } from "../../../pos/hooks/useBarcodeScanner";
import { productService } from "../services/productService";
import { useToast } from "../../../../app/providers/useToast";

const ProductFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const {
    products,
    form,
    editingId,
    saving,
    detailLoading,
    imagePreview,
    alternatives,
    alternativeDraft,
    masterData,
    branches,
    subCategories,
    loadingSubs,
    setField,
    setAlternativeField,
    setAlternatives,
    addAlternative,
    removeAlternative,
    resetForm,
    handleSave,
    handleDeactivate,
    handleImageSelect,
    handleEditById,
    pendingDelete,
    requestDelete,
    cancelDelete,
    confirmDelete,
    deleting,
  } = useProductManager();

  useEffect(() => {
    if (id) {
      handleEditById(parseInt(id));
    } else {
      resetForm();
    }
  }, [id]);

  // ─── Scan to Edit Logic (Multipage) ──────────────────────────────────────

  const handleScan = async (scannedValue: string) => {
    const code = scannedValue.trim();
    if (!code) return;

    showToast(`Quick Switch: ${code}...`, "info");

    // 1. Local Lookup
    const localMatch = (products || []).find((p: any) => p.code.toLowerCase() === code.toLowerCase());
    
    if (localMatch) {
      showToast(`Switched to: ${localMatch.name}`, "success");
      navigate(`/dashboard/products/edit/${localMatch.productId}`);
      return;
    }

    // 2. Server Lookup (Specialized search)
    try {
      const detail = await productService.getByCode(code);
      const productArr = Array.isArray(detail.product) ? detail.product : detail.product ? [detail.product] : [];
      const item = productArr[0];
      
      if (item) {
        showToast(`Switched to: ${item.name}`, "success");
        navigate(`/dashboard/products/edit/${item.productId}`);
      } else {
        // If not found on server, and we are in "Add" mode or want to change current code, fill the field
        setField("code", code);
        showToast(`New code detected: ${code}`, "info");
      }
    } catch (error) {
      // If error (like 404), treat as new code
      setField("code", code);
      showToast(`New code detected: ${code}`, "info");
    }
  };

  useBarcodeScanner(handleScan);

  const onSave = () => {
    handleSave(() => navigate("/dashboard/products"));
  };

  return (
    <PageShell title={id ? "Edit Product" : "Add Product"}>
      <div className="mb-6 flex items-center justify-between">
        <Button variant="secondary" onClick={() => navigate("/dashboard/products")}>
          Back to List
        </Button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className={detailLoading ? "pointer-events-none opacity-50" : "relative"}>
          {detailLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
               <span className="h-10 w-10 animate-spin rounded-full border-4 border-[#49293e] border-t-transparent" />
            </div>
          )}
          
          <ProductMasterForm
            form={form}
            isEditing={Boolean(editingId)}
            saving={saving}
            imagePreview={imagePreview}
            alternatives={alternatives}
            alternativeDraft={alternativeDraft}
            masterData={masterData}
            branches={branches}
            subCategories={subCategories}
            loadingSubs={loadingSubs}
            onChange={setField}
            onAlternativeChange={setAlternativeField}
            onAlternativesChange={setAlternatives}
            onAddAlternative={addAlternative}
            onDeleteAlternative={removeAlternative}
            onClear={resetForm}
            onSave={onSave}
            onDeactivate={handleDeactivate}
            onImageSelect={handleImageSelect}
            onDelete={() => {
              if (editingId) {
                requestDelete({ productId: editingId, name: form.name });
              }
            }}
          />
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        onCancel={cancelDelete}
        onConfirm={async () => {
          await confirmDelete();
          navigate("/dashboard/products");
        }}
        loading={deleting}
        message="Are you sure you want to delete this product? This action cannot be undone."
      />
    </PageShell>
  );
};

export default ProductFormPage;
