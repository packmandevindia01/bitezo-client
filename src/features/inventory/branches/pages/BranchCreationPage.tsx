import { ConfirmDialog, Loader, PageShell } from "../../../../components/common";
import BranchModal from "../components/BranchModal";
import BranchTable from "../components/BranchTable";
import { useBranchManager } from "../hooks/useBranchManager";

const BranchCreationPage = () => {
  const {
    search,
    setSearch,
    open,
    editingBranch,
    deleteCandidate,
    setDeleteCandidate,
    deleting,
    loading,
    handleSave,
    handleEdit,
    handleDelete,
    openCreateModal,
    closeModal,
    filteredBranches,
  } = useBranchManager();

  return (
    <PageShell title="Branch Creation">
      {loading ? <Loader className="py-8" text="Loading branches..." /> : null}

      <BranchTable
        branches={filteredBranches}
        search={search}
        onSearchChange={setSearch}
        onAdd={openCreateModal}
        onEdit={handleEdit}
        onDelete={setDeleteCandidate}
      />

      <BranchModal
        isOpen={open}
        editingBranch={editingBranch}
        onClose={closeModal}
        onSave={handleSave}
        onDelete={() => {
          if (editingBranch) {
            setDeleteCandidate(editingBranch);
            closeModal();
          }
        }}
      />

      <ConfirmDialog
        isOpen={deleteCandidate !== null}
        title="Delete Branch"
        message={`Are you sure you want to delete "${deleteCandidate?.branchName ?? "this branch"}"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          if (!deleting) setDeleteCandidate(null);
        }}
      />
    </PageShell>
  );
};

export default BranchCreationPage;