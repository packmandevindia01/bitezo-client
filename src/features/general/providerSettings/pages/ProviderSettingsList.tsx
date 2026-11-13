import { useNavigate } from "react-router-dom";
import MasterListPage from "../../../../components/common/MasterListPage";
import { useProviderSettingsList } from "../hooks/useProviderSettingsList";
import type { ProviderSettingsListItem } from "../types";

/** Provider pricing settings. Add and Edit open the settings page; the list uses the shared list screen. */
const ProviderSettingsList = () => {
  const navigate = useNavigate();
  const {
    filteredList, loading, deleting,
    deleteCandidate, search,
    setSearch, setDeleteCandidate,
    handleDelete,
  } = useProviderSettingsList();

  return (
    <MasterListPage<ProviderSettingsListItem>
      title="Provider Pricing Settings"
      tableTitle="Configured Pricing"
      searchPlaceholder="Search settings..."
      rowKey="transId"
      getName={(row) => row.provider}
      loadingText="Loading settings list..."
      columns={[
        { header: "S.No", accessor: "sNo" },
        { header: "Provider", accessor: "provider" },
        { header: "Branch", accessor: "branch" },
      ]}
      records={filteredList}
      loading={loading}
      search={search}
      onSearchChange={setSearch}
      onAdd={() => navigate("/dashboard/provider-settings/new")}
      onEdit={(row) => navigate(`/dashboard/provider-settings/edit/${row.transId}`)}
      editingId={null}
      closeForm={() => {}}
      deleteFlow={{
        candidate: deleteCandidate,
        request: setDeleteCandidate,
        confirm: () => void handleDelete(),
        cancel: () => setDeleteCandidate(null),
      }}
      deleteDialog={{
        title: "Delete Pricing Config",
        message: (row) => `Are you sure you want to delete the pricing configuration for ${row.provider} in ${row.branch}?`,
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        loading: deleting,
      }}
      renderForm={() => null}
    />
  );
};

export default ProviderSettingsList;
