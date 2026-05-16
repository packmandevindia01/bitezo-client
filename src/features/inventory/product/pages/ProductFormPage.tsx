import { useEffect, useState } from "react";
import { Ban, RotateCcw, Save, Trash2 } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, ConfirmDialog, PageShell } from "../../../../components/common";
import ProductMasterForm from "../components/ProductMasterForm";
import { useProductManager } from "../hooks/useProductManager";
import { useBarcodeScanner } from '../../../pos/terminal/hooks/useBarcodeScanner';
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
    masterData,
    branches,
    subCategories,
    loadingSubs,
    setField,
    setAlternatives,
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

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearClick = () => {
    if (form.name || form.code || (form.cost !== "0" && form.cost !== "0.00") || (alternatives && alternatives.length > 0)) {
      setShowClearConfirm(true);
    } else {
      resetForm();
    }
  };

  useEffect(() => {
    if (id) {
      handleEditById(parseInt(id));
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // ─── Scan to Edit Logic (Multipage) ──────────────────────────────────────

  const handleScan = async (scannedValue: string) => {
    const code = scannedValue.trim();
    if (!code) return;

    showToast(`Quick Switch: ${code}...`, "info");

    // 1. Local Lookup
    const localMatch = (products || []).find((p: any) => 
      typeof p.code === "string" && p.code.toLowerCase() === code.toLowerCase()
    );
    
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
    } catch {
      // If error (like 404), treat as new code
      setField("code", code);
      showToast(`New code detected: ${code}`, "info");
    }
  };

  useBarcodeScanner(handleScan);

  const [showPriceWarning, setShowPriceWarning] = useState(false);

  const onSave = () => {
    const hasGeneralPrice = parseFloat(String(form.price || "0")) > 0;
    const hasAlternatives = alternatives && alternatives.length > 0;

    if (hasGeneralPrice && hasAlternatives) {
      setShowPriceWarning(true);
    } else {
      handleSave(() => navigate("/dashboard/products"));
    }
  };

  const handleConfirmSaveWithWarning = () => {
    setShowPriceWarning(false);
    handleSave(() => navigate("/dashboard/products"));
  };

  return (
    <PageShell title={id ? "Edit Product" : "Add Product"}>
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col" style={{ maxHeight: "calc(100vh - 120px)" }}>
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className={detailLoading ? "pointer-events-none opacity-50 relative" : "relative"}>
            {detailLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
                 <span className="h-10 w-10 animate-spin rounded-full border-4 border-[#49293e] border-t-transparent" />
              </div>
            )}
            
            <ProductMasterForm
              form={form}
              saving={saving}
              imagePreview={imagePreview}
              alternatives={alternatives}
              masterData={masterData}
              branches={branches}
              subCategories={subCategories}
              loadingSubs={loadingSubs}
              onChange={setField}
              onAlternativesChange={setAlternatives}
              onClear={resetForm}
              onSave={onSave}
              onDeactivate={handleDeactivate}
              onBackToList={() => navigate("/dashboard/products")}
              onImageSelect={handleImageSelect}
              onDelete={() => {
                if (editingId) {
                  requestDelete({ productId: editingId, name: form.name });
                }
              }}
            />
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 bg-white px-6 py-4 rounded-b-2xl">
          {Boolean(editingId) && (
            <Button
              variant="danger"
              disabled={saving}
              onClick={() => { if (editingId) requestDelete({ productId: editingId, name: form.name }); }}
              type="button"
              isAction
              icon={<Trash2 size={18} />}
            >
              Delete
            </Button>
          )}
          <Button 
            variant="secondary" 
            onClick={handleClearClick} 
            type="button" 
            disabled={saving} 
            tabIndex={-1}
            isAction
            icon={<RotateCcw size={18} />}
          >
            Clear
          </Button>
          <Button 
            onClick={onSave} 
            type="button" 
            disabled={saving}
            isAction
            loading={saving}
            icon={<Save size={18} />}
          >
            Save
          </Button>
          <Button
            variant="secondary"
            className="text-red-600 border-red-100 hover:bg-red-50"
            disabled={!Boolean(editingId) || saving}
            onClick={handleDeactivate}
            type="button"
            isAction
            icon={<Ban size={18} />}
          >
            Deactivate
          </Button>
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

      <ConfirmDialog
        isOpen={showClearConfirm}
        onCancel={() => setShowClearConfirm(false)}
        onConfirm={() => {
          resetForm();
          setShowClearConfirm(false);
        }}
        title="Clear Form"
        message="Are you sure you want to clear the form? All unsaved data will be lost."
        confirmLabel="Clear"
      />

      <ConfirmDialog
        isOpen={showPriceWarning}
        onCancel={() => setShowPriceWarning(false)}
        onConfirm={handleConfirmSaveWithWarning}
        title="Pricing Conflict"
        message="⚠️ Alternatives Found: Alternative prices will take priority. The General Price will be ignored in POS. Proceed?"
        confirmLabel="Save Anyway"
        confirmVariant="primary"
      />
    </PageShell>
  );
};

export default ProductFormPage;
