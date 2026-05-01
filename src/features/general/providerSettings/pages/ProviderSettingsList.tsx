import { Pencil, Trash2 } from "lucide-react";
import {
  Loader,
  Modal,
  PageShell,
  RecordTableCard,
} from "../../../../components/common";
import { useProviderSettingsList } from "../hooks/useProviderSettingsList";
import ProviderSettingsForm from "../components/ProviderSettingsForm";
import ProviderSettingsDeleteDialog from "../components/ProviderSettingsDeleteDialog";

const ProviderSettingsList = () => {
  const {
    filteredList, loading, detailLoading, saving, deleting,
    open, editData, deleteCandidate, search,
    setSearch, setDeleteCandidate,
    openCreateModal, closeModal,
    handleEdit, handleSave, handleDelete,
  } = useProviderSettingsList();

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
          onAction={openCreateModal}
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
                    onClick={() => void handleEdit(row.transId)}
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

      <Modal
        isOpen={open}
        onClose={closeModal}
        title={editData ? "Edit Provider Settings" : "Configure Provider Settings"}
        size="2xl"
      >
        {detailLoading ? (
          <div className="py-8">
            <Loader text="Loading details..." />
          </div>
        ) : (
          <ProviderSettingsForm
            initialData={editData}
            onSubmit={handleSave}
            onCancel={closeModal}
            submitting={saving}
          />
        )}
      </Modal>

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