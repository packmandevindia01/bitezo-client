import { Loader, PageShell } from "../../../../components/common";
import BranchModal from "../components/BranchModal";
import BranchTable from "../components/BranchTable";
import { useBranchManager } from "../hooks/useBranchManager";

const BranchCreationPage = () => {
  const {
    search,
    setSearch,
    open,
    editingBranch,
    loading,
    handleSave,
    handleEdit,
    openCreateModal,
    closeModal,
    filteredBranches,
  } = useBranchManager();

  return (
    <PageShell
      title="Branch Creation">
      {loading ? <Loader className="py-8" text="Loading branches..." /> : null}

      <BranchTable
        branches={filteredBranches}
        search={search}
        onSearchChange={setSearch}
        onAdd={openCreateModal}
        onEdit={handleEdit}
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
