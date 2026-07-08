import React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog, PageShell, RecordTableCard, ListHeader } from "../../../../components/common";
import SectionModal from "../components/SectionModal";
import { useSectionManager } from "../hooks/useSectionManager";
import type { SectionRecord } from "../types";
import { usePermissions } from "../../../../hooks/usePermissions";

const SectionPage = () => {
  const { hasPermission } = usePermissions();
  const {
    form,
    counters,
    open,
    search,
    editingId,
    loading,
    saving,
    filteredRecords,
    setSearch,
    setField,
    resetForm,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    handleDelete,
  } = useSectionManager();
  const [deleteRecord, setDeleteRecord] = React.useState<SectionRecord | null>(null);

  const canAdd = hasPermission("Section Master", "Add");
  const canEdit = hasPermission("Section Master", "Edit");
  const canDelete = hasPermission("Section Master", "Delete");

  return (
    <PageShell title="Section Master">
      <ListHeader
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search sections..."
        autoFocusSearch
        canAdd={canAdd}
        onAdd={openCreateModal}
      />

      <RecordTableCard
        title="Saved Section List"
        rowKey="sectionId"
        data={filteredRecords}
        loading={loading}
        columns={[
          { header: "S No", accessor: "sNo" },
          { header: "Name", accessor: "name" },
          { header: "Counter", accessor: "counter" },
          {
            header: "Actions",
            accessor: "sectionId",
            render: (row) => (
              <div className="flex gap-2">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleEdit(row)}
                    className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10"
                    aria-label={`Edit ${row.name}`}
                  >
                    <Pencil size={16} />
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setDeleteRecord(row)}
                    className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50"
                    aria-label={`Delete ${row.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />

      <SectionModal
        isOpen={open}
        editingId={editingId}
        form={form}
        counters={counters}
        loading={loading}
        saving={saving}
        onChange={setField}
        onClose={closeModal}
        onClear={resetForm}
        onSave={handleSave}
        onDelete={() => {
          if (editingId && canDelete) {
            const record = filteredRecords.find(r => r.sectionId === editingId);
            if (record) {
              setDeleteRecord(record);
              closeModal();
            }
          }
        }}
      />

      <ConfirmDialog
        isOpen={deleteRecord !== null}
        onCancel={() => setDeleteRecord(null)}
        onConfirm={() => {
          if (deleteRecord) {
            handleDelete(deleteRecord);
            setDeleteRecord(null);
          }
        }}
        message={`Are you sure you want to delete section "${deleteRecord?.name}"?`}
        loading={saving}
      />
    </PageShell>
  );
};

export default SectionPage;


