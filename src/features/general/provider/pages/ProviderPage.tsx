import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog, PageShell, RecordTableCard, ListHeader, StatusBadge } from "../../../../components/common";
import ProviderModal from "../components/ProviderModal";
import { useProviderManager } from "../hooks/useProviderManager";
import type { ProviderListItem } from "../types";
import { usePermissions } from "../../../../hooks/usePermissions";

const ProviderPage = () => {
  const { hasPermission } = usePermissions();
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
    allocationOpen,
    imagePreview,
    setAllocationOpen,
    setSearch,
    toggleBranchSelection,
    handleImageChange,
    resetForm,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    handleDelete,
  } = useProviderManager();
  
  const [deleteRecord, setDeleteRecord] = useState<ProviderListItem | null>(null);

  const canAdd = hasPermission("Provider Master", "Add");
  const canEdit = hasPermission("Provider Master", "Edit");
  const canDelete = hasPermission("Provider Master", "Delete");

  return (
    <PageShell title="Provider Management">
      <ListHeader
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search providers..."
        canAdd={canAdd}
        onAdd={openCreateModal}
        autoFocusSearch
      />

      <RecordTableCard
        title="Registered Provider List"
        data={filteredRecords}
        rowKey="providerId"
        loading={loading}
        columns={[
          { 
            header: "Provider Info", 
            accessor: "providerName",
            render: (row) => (
              <span className="font-bold text-gray-900">{row.providerName}</span>
            )
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
            )
          },
          {
            header: "Delivery Status",
            accessor: "deliveryStatus",
            render: (row) => (
              <StatusBadge 
                status={row.deliveryStatus === "Enable" ? "active" : "inactive"} 
                label={row.deliveryStatus}
              />
            ),
          },
          {
            header: "Actions",
            accessor: "providerId",
            render: (row) => (
              <div className="flex gap-2">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleEdit(row)}
                    className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10 transition-colors"
                  >
                    <Pencil size={16} />
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setDeleteRecord(row)}
                    className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            )
          }
        ]}
      />

      <ProviderModal
        isOpen={open}
        editingId={editingId}
        form={form}
        saving={saving}
        allocationOpen={allocationOpen}
        selectedBranchIds={form.watch("branchIds")}
        branchOptions={branchOptions}
        paymodeOptions={paymodeOptions}
        accountOptions={accountOptions}
        imagePreview={imagePreview}
        onClose={closeModal}
        onToggleAllocation={() => setAllocationOpen(!allocationOpen)}
        onToggleBranch={toggleBranchSelection}
        onImageChange={handleImageChange}
        onClear={resetForm}
        onSave={handleSave}
        onDelete={() => {
          if (!canDelete) return;
          const record = filteredRecords.find(r => r.providerId === editingId);
          if (record) {
            setDeleteRecord(record);
            closeModal();
          }
        }}
      />

      <ConfirmDialog
        isOpen={deleteRecord !== null}
        onCancel={() => setDeleteRecord(null)}
        onConfirm={() => {
          if (deleteRecord) {
            handleDelete(deleteRecord.providerId);
            setDeleteRecord(null);
          }
        }}
        loading={isDeleting}
        message={`Are you sure you want to delete provider "${deleteRecord?.providerName}"?`}
      />
    </PageShell>
  );
};

export default ProviderPage;
