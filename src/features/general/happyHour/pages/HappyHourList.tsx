import { useNavigate } from "react-router-dom";
import MasterListPage from "../../../../components/common/MasterListPage";
import { useHappyHourList } from "../hooks/useHappyHourList";
import type { HappyHourListItem } from "../types";

/** Happy hour promotions. Add and Edit open the promotion page; the list uses the shared list screen. */
const HappyHourList = () => {
  const navigate = useNavigate();
  const {
    filteredList, loading, deleting,
    deleteCandidate, search,
    setSearch, setDeleteCandidate,
    handleDelete,
  } = useHappyHourList();

  return (
    <MasterListPage<HappyHourListItem>
      title="Happy Hours Management"
      tableTitle="Active Promotions"
      searchPlaceholder="Search promotions..."
      rowKey="promotionId"
      getName={(row) => row.promotionName}
      loadingText="Loading Happy Hours..."
      columns={[
        { header: "Promotion", accessor: "promotionName" },
        {
          header: "Start Date",
          accessor: "validFrom",
          render: (row) => new Date(row.validFrom).toLocaleDateString()
        },
        {
          header: "End Date",
          accessor: "validTo",
          render: (row) => new Date(row.validTo).toLocaleDateString()
        },
        { header: "Branch", accessor: "branch" },
      ]}
      records={filteredList}
      loading={loading}
      search={search}
      onSearchChange={setSearch}
      onAdd={() => navigate("/dashboard/happy-hour/new")}
      onEdit={(row) => navigate(`/dashboard/happy-hour/edit/${row.promotionId}`)}
      editingId={null}
      closeForm={() => {}}
      deleteFlow={{
        candidate: deleteCandidate,
        request: setDeleteCandidate,
        confirm: () => void handleDelete(),
        cancel: () => setDeleteCandidate(null),
      }}
      deleteDialog={{
        title: "Confirm Deletion",
        message: (row) => `Are you sure you want to delete the promotion "${row.promotionName}"? This action cannot be undone.`,
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        loading: deleting,
      }}
      renderForm={() => null}
    />
  );
};

export default HappyHourList;
