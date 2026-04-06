import { PageShell } from "../../../../components/common";
import SubCategoryModal from "../components/SubCategoryModal";
import SubCategoryTable from "../components/SubCategoryTable";
import { subCategoryOptions } from "../constants";
import { useSubCategoryManager } from "../hooks/useSubCategoryManager";

const SubCategoryPage = () => {
  const {
    form,
    setForm,
    editingId,
    search,
    setSearch,
    open,
    resetForm,
    closeModal,
    openCreateModal,
    handleImageSelect,
    handleSave,
    handleEdit,
    deleteById,
    filteredSubCategories,
  } = useSubCategoryManager();

  return (
    <PageShell
      title="Sub Category Master"
      description="Sub categories are now isolated inside their own feature folder and share the same table-first add workflow as the rest of the master area."
    >
      <SubCategoryTable
        subCategories={filteredSubCategories}
        search={search}
        onSearchChange={setSearch}
        onAdd={openCreateModal}
        onEdit={handleEdit}
        onDelete={deleteById}
      />

      <SubCategoryModal
        isOpen={open}
        editingId={editingId}
        form={form}
        categoryOptions={subCategoryOptions}
        onClose={closeModal}
        onImageSelect={handleImageSelect}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onClear={resetForm}
        onSave={handleSave}
      />
    </PageShell>
  );
};

export default SubCategoryPage;

