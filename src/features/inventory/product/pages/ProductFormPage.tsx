import { useState } from "react";
import { Save, Trash2, Ban, X } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, ConfirmDialog, PageShell } from "../../../../components/common";
import ProductMasterForm from "../components/ProductMasterForm";
import { useProductForm } from "../hooks/useProductForm";
import { useBarcodeScanner } from '../../../pos/terminal/hooks/useBarcodeScanner';
import { productService } from "../services/productService";
import { useToast } from "../../../../app/providers/useToast";

const ProductFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
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

  return (
    <PageShell title={id ? "Edit Product" : "Add Product"}>
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm flex flex-col relative" style={{ height: "calc(100vh - 120px)" }}>
        
        {/* Close Button */}
        <button
          type="button"
          onClick={() => navigate("/dashboard/products")}
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
          title="Close"
        >
          <X size={20} />
        </button>

        {/* Scrollable content */}
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

        {/* Fixed Footer */}
        <div className="shrink-0 flex items-center justify-end gap-3 p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              form.reset();
              setImageFile(null);
            }}
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
                saveMutation.mutate(data, {
                  onSuccess: () => navigate("/dashboard/products")
                });
              },
              (errors) => {
                // Show the first validation error in a toast
                const getFirstError = (obj: any, path: string = ""): string => {
                  for (const key in obj) {
                    const currentPath = path ? `${path}.${key}` : key;
                    if (obj[key]?.message) return `[${currentPath}] ${obj[key].message}`;
                    if (typeof obj[key] === "object") {
                      const msg = getFirstError(obj[key], currentPath);
                      if (msg) return msg;
                    }
                  }
                  return "Please check the form for validation errors.";
                };
                showToast(getFirstError(errors), "error");
              }
            )}
            disabled={isSaving || isDeleting || isLoading}
            loading={isSaving}
            icon={<Save size={18} />}
          >
            Save Product
          </Button>
        </div>
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
