import { useNavigate } from "react-router-dom";
import { ConfirmDialog, Loader, PageShell } from "../../../../components/common";
import BranchTable from "../components/BranchTable";
import { useBranchManager } from "../hooks/useBranchManager";

const BranchListPage = () => {
  const navigate = useNavigate();
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

  return (
    <PageShell title="Branch Master Management">
      {loading ? <Loader className="py-8" text="Loading branches..." /> : null}

      <BranchTable
        branches={filteredBranches}
        search={search}
        onSearchChange={setSearch}
        onAdd={() => navigate("/dashboard/branches/add")}
        onEdit={(branch) => navigate(`/dashboard/branches/edit/${branch.id}`)}
        onDelete={setDeleteCandidate}
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
