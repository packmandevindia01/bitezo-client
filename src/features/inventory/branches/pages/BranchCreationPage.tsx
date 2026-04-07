import { PageShell } from "../../../../components/common";
import BranchModal from "../components/BranchModal";
import BranchTable from "../components/BranchTable";
import { useBranchManager } from "../hooks/useBranchManager";

const BranchCreationPage = () => {
  const {
    search,
    setSearch,
    open,
    editingBranch,
    handleSave,
    handleEdit,
    handleDelete,
    openCreateModal,
    closeModal,
    filteredBranches,
  } = useBranchManager();

  return (
    <PageShell
      title="Branch Creation">
      <BranchTable
        branches={filteredBranches}
        search={search}
        onSearchChange={setSearch}
        onAdd={openCreateModal}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <BranchModal
        isOpen={open}
        editingBranch={editingBranch}
        onClose={closeModal}
        onSave={handleSave}
      />
    </PageShell>
  );
};

export default BranchCreationPage;

