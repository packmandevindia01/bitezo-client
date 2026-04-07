import { Modal, PageShell } from "../../../../components/common";
import ProductListCard from "../components/ProductListCard";
import ProductMasterForm from "../components/ProductMasterForm";
import { useProductManager } from "../hooks/useProductManager";

const ProductPage = () => {
  const {
    form,
    open,
    search,
    editingId,
    alternativeDraft,
    alternatives,
    imagePreview,
    filteredProducts,
    setSearch,
    setField,
    setAlternativeField,
    resetForm,
    closeModal,
    openCreateModal,
    addAlternative,
    removeAlternative,
    handleSave,
    handleEdit,
    handleDelete,
    handleDeactivate,
    handleImageSelect,
  } = useProductManager();

  return (
    <PageShell
      title="Product Master">
      <ProductListCard
        records={filteredProducts}
        search={search}
        onSearchChange={setSearch}
        onAdd={openCreateModal}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal isOpen={open} onClose={closeModal} title="Product" size="2xl">
        <ProductMasterForm
          form={form}
          isEditing={Boolean(editingId)}
          imagePreview={imagePreview}
          alternatives={alternatives}
          alternativeDraft={alternativeDraft}
          onChange={setField}
          onAlternativeChange={setAlternativeField}
          onAddAlternative={addAlternative}
          onDeleteAlternative={removeAlternative}
          onClear={resetForm}
          onSave={handleSave}
          onDeactivate={handleDeactivate}
          onImageSelect={handleImageSelect}
        />
      </Modal>
    </PageShell>
  );
};

export default ProductPage;

