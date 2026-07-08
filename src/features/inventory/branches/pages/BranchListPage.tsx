import { useNavigate } from "react-router-dom";
import { ConfirmDialog, PageShell } from "../../../../components/common";
import BranchTable from "../components/BranchTable";
import { useBranchManager } from "../hooks/useBranchManager";
import { usePermissions } from "../../../../hooks/usePermissions";

const BranchListPage = () => {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const {
    search,
    setSearch,
    deleteCandidate,
    setDeleteCandidate,
    deleting,
    loading,
    handleDelete,
    filteredBranches,
  } = useBranchManager();

  const canAdd = hasPermission("Branch Master", "Add");
  const canEdit = hasPermission("Branch Master", "Edit");
  const canDelete = hasPermission("Branch Master", "Delete");

  return (
    <PageShell title="Branch Master Management">
      <BranchTable
        loading={loading}
        branches={filteredBranches}
        search={search}
        onSearchChange={setSearch}
        onAdd={canAdd ? () => navigate("/dashboard/branches/add") : undefined}
        onEdit={canEdit ? (branch) => navigate(`/dashboard/branches/edit/${branch.id}`) : undefined}
        onDelete={canDelete ? setDeleteCandidate : undefined}
      />

      <ConfirmDialog
        isOpen={deleteCandidate !== null}
        title="Delete Branch Master"
        message={`Are you sure you want to delete "${deleteCandidate?.branchName ?? "this branch master"}"?`}
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

export default BranchListPage;
