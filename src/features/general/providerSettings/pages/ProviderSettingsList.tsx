import { Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Loader,
  PageShell,
  RecordTableCard,
} from "../../../../components/common";
import { useProviderSettingsList } from "../hooks/useProviderSettingsList";
import ProviderSettingsDeleteDialog from "../components/ProviderSettingsDeleteDialog";

const ProviderSettingsList = () => {
  const navigate = useNavigate();
  const {
    filteredList, loading, deleting,
    deleteCandidate, search,
    setSearch, setDeleteCandidate,
    handleDelete,
  } = useProviderSettingsList();

  const handleEdit = (transId: number) => {
    navigate(`/dashboard/provider-settings/edit/${transId}`);
  };

  const handleCreate = () => {
    navigate("/dashboard/provider-settings/new");
  };

  return (
    <PageShell title="Provider Pricing Settings">
      {loading ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-10 shadow-sm">
          <Loader text="Loading settings list..." />
        </div>
      ) : (
        <RecordTableCard
          title="Configured Pricing"
          search={search}
          onSearchChange={setSearch}
          rowKey="transId"
          data={filteredList}
          actionLabel="+ Add New"
          onAction={handleCreate}
          columns={[
            { header: "S.No", accessor: "sNo" },
            { header: "Provider", accessor: "provider" },
            { header: "Branch", accessor: "branch" },
            {
              header: "Actions",
              accessor: "transId",
              render: (row) => (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(row.transId)}
                    className="p-2 text-pos-primary hover:bg-pos-primary/10 rounded-lg transition-all"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteCandidate(row)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      <ProviderSettingsDeleteDialog
        candidate={deleteCandidate}
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteCandidate(null)}
      />
    </PageShell>
  );
};

export default ProviderSettingsList;