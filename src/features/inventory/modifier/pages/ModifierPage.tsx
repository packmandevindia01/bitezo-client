import { Modal, PageShell } from "../../../../components/common";
import ModifierListCard from "../components/ModifierListCard";
import ModifierMasterForm from "../components/ModifierMasterForm";
import { useModifierManager } from "../hooks/useModifierManager";

const ModifierPage = () => {
  const {
    form,
    open,
    search,
    editingId,
    filteredModifiers,
    setSearch,
    setField,
    resetForm,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    handleDelete,
  } = useModifierManager();

  return (
    <PageShell
      title="Modifier Master"
      description="This screen follows your existing page style and keeps only the required fields from the prototype while fitting your current feature-based structure."
    >
      <ModifierListCard
        records={filteredModifiers}
        search={search}
        onSearchChange={setSearch}
        onAdd={openCreateModal}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal isOpen={open} onClose={closeModal} title="Modifier" size="lg">
        <ModifierMasterForm
          form={form}
          isEditing={Boolean(editingId)}
          onChange={setField}
          onClear={resetForm}
          onSave={handleSave}
        />
      </Modal>
    </PageShell>
  );
};

export default ModifierPage;

