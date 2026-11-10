import { Modal } from "../../../../components/common";
import MasterListPage, { MasterLoadError, type MasterColumn } from "../../../../components/common/MasterListPage";
import TaxForm from "../components/TaxForm";
import { useTaxManager } from "../hooks/useTaxManager";
import type { TaxListItem } from "../types";

const COLUMNS: MasterColumn<TaxListItem>[] = [
  { header: "S.No", accessor: "sNo", render: (_, index) => index + 1 },
  { header: "Name", accessor: "name" },
  { header: "Value (%)", accessor: "value", render: (row) => `${row.value}%` },
];

const TaxPage = () => {
  const {
    filteredTaxes,
    listLoading,
    listError,
    fetchTaxes,
    search,
    setSearch,
    isOpen,
    isEditMode,
    editDetail,
    detailLoading,
    saving,
    deleting,
    mutationError,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSave,
    deleteCandidate,
    requestDelete,
    confirmDelete,
    cancelDelete,
  } = useTaxManager();

  return (
    <MasterListPage<TaxListItem>
      moduleName="Tax Master"
      title="Tax Master"
      tableTitle="Saved Tax List"
      searchPlaceholder="Search taxes..."
      rowKey="id"
      getName={(row) => row.name}
      columns={COLUMNS}
      records={filteredTaxes}
      loading={listLoading}
      search={search}
      onSearchChange={setSearch}
      onAdd={openCreateModal}
      onEdit={openEditModal}
      editingId={editDetail?.id ?? null}
      closeForm={closeModal}
      notices={listError && <MasterLoadError message={listError} onRetry={fetchTaxes} />}
      deletingKey={deleting}
      deleteFlow={{ candidate: deleteCandidate, request: requestDelete, confirm: confirmDelete, cancel: cancelDelete }}
      deleteDialog={{
        title: "Delete Tax",
        message: (row) => `Are you sure you want to delete "${row.name}"? This action cannot be undone.`,
      }}
      renderForm={(_, canDelete) => (
        <Modal isOpen={isOpen} onClose={closeModal} title={isEditMode ? "Edit Tax" : "Add Tax"}>
          <TaxForm
            key={isEditMode ? `edit-${editDetail?.id}` : "new-tax"}
            initialData={editDetail}
            saving={saving || detailLoading}
            error={mutationError}
            onSubmit={handleSave}
            onCancel={closeModal}
            onDelete={
              editDetail && canDelete
                ? () => {
                    requestDelete({ id: editDetail.id, name: editDetail.name } as TaxListItem);
                    closeModal();
                  }
                : undefined
            }
            onClear={openCreateModal}
          />
        </Modal>
      )}
    />
  );
};

export default TaxPage;
