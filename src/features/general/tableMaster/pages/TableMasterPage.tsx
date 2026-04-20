import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog, PageShell, RecordTableCard } from "../../../../components/common";
import TableMasterModal from "../components/TableMasterModal";
import { useTableManager } from "../hooks/useTableManager";
import type { TableRecord } from "../types";

const TableMasterPage = () => {
  const {
    form,
    open,
    search,
    mode,
    selectedId,
    selectedSection,
    filteredTables,
    visibleTables,
    setSearch,
    setField,
    resetForm,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    handleDelete,
    handleSelectTable,
    handleSectionChange,
    setCreateMode,
  } = useTableManager();

  const [deleteRecord, setDeleteRecord] = useState<TableRecord | null>(null);

  return (
    <PageShell title="Table Master" >
      <RecordTableCard
        title="Saved Table List"
        search={search}
        onSearchChange={setSearch}
        rowKey="id"
        data={filteredTables}
        actionLabel="+ Add Table"
        onAction={openCreateModal}
        autoFocusSearch
        columns={[
          { header: "S No", accessor: "id" },
          { header: "Section", accessor: "section" },
          { header: "Table No", accessor: "tableNo" },
          { header: "Chairs", accessor: "chairs" },
          { header: "Status", accessor: "status" },
          {
            header: "Actions",
            accessor: "id",
            render: (row) => (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleEdit(row)}
                  className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10"
                  aria-label={`Edit ${row.tableNo}`}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteRecord(row)}
                  className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50"
                  aria-label={`Delete ${row.tableNo}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          },
        ]}
      />

      <TableMasterModal
        isOpen={open}
        mode={mode}
        selectedId={selectedId}
        selectedSection={selectedSection}
        visibleTables={visibleTables}
        form={form}
        onChange={setField}
        onSectionChange={handleSectionChange}
        onPickTable={handleSelectTable}
        onCreateNew={setCreateMode}
        onClose={closeModal}
        onClear={() => {
          setCreateMode();
          resetForm(selectedSection);
        }}
        onSave={handleSave}
        onDelete={() => {
          const record = filteredTables.find(t => t.id === selectedId);
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
            handleDelete(deleteRecord);
            setDeleteRecord(null);
          }
        }}
        message={`Are you sure you want to delete table "${deleteRecord?.tableNo}"?`}
      />
    </PageShell>
  );
};

export default TableMasterPage;
