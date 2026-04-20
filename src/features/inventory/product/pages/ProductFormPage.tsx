import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, ConfirmDialog, PageShell } from "../../../../components/common";
import ProductMasterForm from "../components/ProductMasterForm";
import { useProductManager } from "../hooks/useProductManager";

const ProductFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
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
