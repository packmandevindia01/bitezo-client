import { PageShell } from "../../../components/common";
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
      title="Branch Creation"
      description="Branches keep the same list-first pattern while sharing the reusable page shell and record card components with the other sidebar features."
    >
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
