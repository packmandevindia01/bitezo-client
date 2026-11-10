import { Modal } from "../../../../components/common";
import MasterListPage, { MasterLoadError, type MasterColumn } from "../../../../components/common/MasterListPage";
import UnitForm from "../components/UnitForm";
import { useUnitManager } from "../hooks/useUnitManager";
import type { UnitListItem } from "../types";

const COLUMNS: MasterColumn<UnitListItem>[] = [
  { header: "S.No", accessor: "sNo" },
  { header: "Name", accessor: "name" },
  { header: "Category", accessor: "category" },
  { header: "Value", accessor: "currentValue", render: (row) => row.currentValue?.toString() || "0" },
];

const UnitPage = () => {
  const {
    filteredUnits,
    listLoading,
    listError,
    fetchUnits,
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
  } = useUnitManager();

  return (
    <MasterListPage<UnitListItem>
      moduleName="Unit Master"
      title="Unit Master"
      tableTitle="Saved Unit List"
      searchPlaceholder="Search units..."
      rowKey="unitId"
      getName={(row) => row.name}
      columns={COLUMNS}
      records={filteredUnits}
      loading={listLoading}
      search={search}
      onSearchChange={setSearch}
      onAdd={openCreateModal}
      onEdit={openEditModal}
      editingId={editDetail?.unitId ?? null}
      closeForm={closeModal}
      notices={listError && <MasterLoadError message={listError} onRetry={fetchUnits} />}
      lockedAs={(row) => (row.unitId <= 4 ? "Core system unit" : undefined)}
      deletingKey={deleting}
      deleteFlow={{ candidate: deleteCandidate, request: requestDelete, confirm: confirmDelete, cancel: cancelDelete }}
      deleteDialog={{
        title: "Delete Unit",
        message: (row) => `Are you sure you want to delete "${row.name}"? This action cannot be undone.`,
      }}
      renderForm={(_, canDelete) => (
        <Modal isOpen={isOpen} onClose={closeModal} title={isEditMode ? "Edit Unit" : "Add New Unit"}>
          <UnitForm
            key={isEditMode ? `edit-${editDetail?.unitId}` : "new-unit"}
            initialData={editDetail}
            saving={saving || detailLoading}
            error={mutationError}
            onSubmit={handleSave}
            onCancel={closeModal}
            onDelete={
              editDetail && canDelete
                ? () => {
                    requestDelete({ unitId: editDetail.unitId, name: editDetail.name } as UnitListItem);
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

export default UnitPage;
