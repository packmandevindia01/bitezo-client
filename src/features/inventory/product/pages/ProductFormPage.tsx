import { useState } from "react";
import { Save, Trash2, Ban, X } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Button, ConfirmDialog, PageShell } from "../../../../components/common";
import ProductMasterForm from "../components/ProductMasterForm";
import { useProductForm } from "../hooks/useProductForm";
import { useBarcodeScanner } from "../../../pos/terminal/hooks/useBarcodeScanner";
import { productService } from "../services/productService";
import { useToast } from "../../../../app/providers/useToast";

const ProductFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isNative = Capacitor.isNativePlatform();
  
  const {
    form,
    masterData,
    branches,
    subCategories,
    isLoading,
    isSaving,
    isDeleting,
    imagePreview,
    setImageFile,
    saveMutation,
    deleteMutation,
    handleResetForm,
    currentBranchId
  } = useProductForm(id ? parseInt(id) : undefined);

  const [pendingDelete, setPendingDelete] = useState(false);

  // ─── Scan to Edit Logic (Multipage) ──────────────────────────────────────

  const handleScan = async (scannedValue: string) => {
    const code = scannedValue.trim();
    if (!code) return;

    showToast(`Quick Switch: ${code}...`, "info");

    // Server Lookup (Specialized search)
    try {
      const detail = await productService.getByCode(code);
      const productArr = Array.isArray(detail.product) ? detail.product : detail.product ? [detail.product] : [];
      const item = productArr[0];
      
      if (item) {
        showToast(`Switched to: ${item.name}`, "success");
        navigate(`/dashboard/products/edit/${item.productId}`);
      } else {
        form.setValue("code", code, { shouldValidate: true });
        showToast(`New code detected: ${code}`, "info");
      }
    } catch {
      form.setValue("code", code, { shouldValidate: true });
      showToast(`New code detected: ${code}`, "info");
    }
  };

  useBarcodeScanner(handleScan);

  const actionButtons = (
    <div
      className={`flex items-center justify-end gap-3 p-4 border-t border-gray-100 bg-gray-50/50 ${
        isNative ? "mt-6 rounded-xl border border-gray-200" : "shrink-0 rounded-b-2xl"
      }`}
    >
      <Button
        type="button"
        variant="secondary"
        onClick={handleResetForm}
        disabled={isSaving || isDeleting || isLoading}
        icon={<Ban size={18} />}
      >
        Clear
      </Button>
      
      {id && (
        <Button
          type="button"
          variant="danger"
          onClick={() => setPendingDelete(true)}
          disabled={isSaving || isDeleting || isLoading}
          loading={isDeleting}
          icon={<Trash2 size={18} />}
        >
          Delete
        </Button>
      )}

      <Button
        id="prod-save-btn"
        type="button"
        variant="primary"
        onClick={form.handleSubmit(
          (data) => {
            saveMutation.mutate(data);
          },
          () => {
            showToast("Please fill in all mandatory fields.", "error");
          }
        )}
        disabled={isSaving || isDeleting || isLoading}
        loading={isSaving}
        icon={<Save size={18} />}
      >
        Save Product
      </Button>
    </div>
  );

  return (
    <PageShell title={id ? "Edit Product" : "Add Product"}>
      <div
        className="rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col relative"
        style={isNative ? undefined : { height: "calc(100vh - 120px)" }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={() => navigate("/dashboard/products")}
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
          title="Close"
        >
          <X size={20} />
        </button>

        {/* Content area */}
        {isNative ? (
          /* Native layout: Non-sticky footer inside normal scrollable content */
          <div className="p-4 sm:p-6">
            {isLoading ? (
              <div className="flex items-center justify-center min-h-[300px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#49293e]" />
              </div>
            ) : (
              <div>
                <ProductMasterForm
                  form={form}
                  imagePreview={imagePreview}
                  masterData={masterData || { unit: [], group: [], category: [], vat: [], type: [] }}
                  branches={branches}
                  subCategories={subCategories}
                  onImageSelect={setImageFile}
                  currentBranchId={currentBranchId}
                />
                {actionButtons}
              </div>
            )}
          </div>
        ) : (
          /* Desktop layout: Sticky footer at bottom of viewport-constrained card */
          <>
            <div className="flex-1 p-6 h-[calc(100vh-140px)] overflow-hidden flex flex-col">
              {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#49293e]" />
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <ProductMasterForm
                    form={form}
                    imagePreview={imagePreview}
                    masterData={masterData || { unit: [], group: [], category: [], vat: [], type: [] }}
                    branches={branches}
                    subCategories={subCategories}
                    onImageSelect={setImageFile}
                    currentBranchId={currentBranchId}
                  />
                </div>
              )}
            </div>
            {actionButtons}
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={pendingDelete}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={isDeleting}
        onConfirm={() => {
          if (id) {
           const handleGoBack = () => navigate("/dashboard/products");
            deleteMutation.mutate(Number(id), {
              onSuccess: () => handleGoBack()
            });
          }
        }}
        onCancel={() => setPendingDelete(false)}
      />
    </PageShell>
  );
};

export default ProductFormPage;
