import MasterListPage, { type MasterColumn } from "../../../../components/common/MasterListPage";
import { StatusBadge } from "../../../../components/common";
import ProviderModal from "../components/ProviderModal";
import { useProviderManager } from "../hooks/useProviderManager";
import type { ProviderListItem } from "../types";

const COLUMNS: MasterColumn<ProviderListItem>[] = [
  {
    header: "Provider Info",
    accessor: "providerName",
    render: (row) => <span className="font-bold text-gray-900">{row.providerName}</span>,
  },
  {
    header: "Paymode",
    accessor: "paymode",
    render: (row) => (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
          {row.paymode || "Standard"}
        </span>
      </div>
    ),
  },
  {
    header: "Delivery Status",
    accessor: "deliveryStatus",
    render: (row) => <StatusBadge status={row.deliveryStatus === "Enable" ? "active" : "inactive"} label={row.deliveryStatus} />,
  },
];

const ProviderPage = () => {
  const {
    form,
    open,
    search,
    editingId,
    filteredRecords,
    loading,
    saving,
    isDeleting,
    branchOptions,
    paymodeOptions,
    accountOptions,
    imagePreview,
    setSearch,
    handleImageChange,
    resetForm,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    handleDelete,
  } = useProviderManager();

  return (
    <MasterListPage<ProviderListItem>
      moduleName="Provider Master"
      title="Provider Management"
      tableTitle="Registered Provider List"
      searchPlaceholder="Search providers..."
      rowKey="providerId"
      getName={(row) => row.providerName}
      columns={COLUMNS}
      records={filteredRecords}
      loading={loading}
      search={search}
      onSearchChange={setSearch}
      onAdd={openCreateModal}
      onEdit={handleEdit}
      onDelete={(row) => handleDelete(row.providerId)}
      editingId={editingId}
      closeForm={closeModal}
      deleteDialog={{ message: (row) => `Are you sure you want to delete provider "${row.providerName}"?`, loading: isDeleting }}
      renderForm={(deleteEditing) => (
        <ProviderModal
          isOpen={open}
          editingId={editingId}
          form={form}
          saving={saving}
          selectedBranchIds={form.watch("branchIds")}
          branchOptions={branchOptions}
          paymodeOptions={paymodeOptions}
          accountOptions={accountOptions}
          imagePreview={imagePreview}
          onClose={closeModal}
          onImageChange={handleImageChange}
          onClear={resetForm}
          onSave={handleSave}
          onDelete={deleteEditing}
        />
      )}
    />
  );
};

export default ProviderPage;
