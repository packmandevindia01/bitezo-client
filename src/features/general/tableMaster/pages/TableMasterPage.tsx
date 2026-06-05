import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { 
  ConfirmDialog, 
  PageShell,
  Modal
} from "../../../../components/common";
import { useTableManager } from "../hooks/useTableManager";
import type { TableRecord } from "../types";
import TableSectionSelector from "../components/TableSectionSelector";
import TableCardGrid from "../components/TableCardGrid";
import TableFormSection from "../components/TableFormSection";
import { usePermissions } from "../../../../hooks/usePermissions";

const TableMasterPage = () => {
  const { hasPermission } = usePermissions();
  const {
    form,
    sections,
    loading,
    error,
    open,
    mode,
    selectedId,
    selectedSectionId,
    visibleTables,
    setField,
    resetForm,
    handleSave,
    handleEdit,
    handleDelete,
    handleSectionChange,
    setCreateMode,
    handleReorder,
  } = useTableManager();

  const [deleteRecord, setDeleteRecord] = useState<TableRecord | null>(null);

  const canAdd = hasPermission("Table Master", "Add");
  const canEdit = hasPermission("Table Master", "Edit");
  const canDelete = hasPermission("Table Master", "Delete");

  const handleOpenAdd = () => {
    if (canAdd) setCreateMode();
  };

  const handleConfirmDelete = () => {
    if (deleteRecord && canDelete) {
      handleDelete(deleteRecord);
      setDeleteRecord(null);
    }
  };

  return (
    <PageShell title="Table Master">
      <div className="rounded-3xl bg-white px-4 py-6 shadow-sm ring-1 ring-gray-100 md:px-6 md:py-6">
        <div className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 rounded-2xl bg-red-50 p-4 text-sm text-red-600 border-2 border-red-100 animate-in fade-in zoom-in duration-200">
              <AlertCircle size={20} />
              <span className="font-bold">{error}</span>
            </div>
          )}

          <TableSectionSelector 
            sections={sections}
            selectedSectionId={selectedSectionId}
            loading={loading}
            onSectionChange={handleSectionChange}
            onAdd={canAdd ? handleOpenAdd : undefined}
          />

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <TableCardGrid 
              tables={visibleTables}
              selectedId={selectedId}
              loading={loading}
              onEdit={canEdit ? handleEdit : undefined}
              onDeleteRequest={canDelete ? setDeleteRecord : undefined}
              onReorder={canEdit ? handleReorder : undefined}
              onEmptySlotClick={canAdd ? (pos) => setCreateMode(pos) : undefined}
            />
          </div>

          <Modal isOpen={open} onClose={() => resetForm(String(selectedSectionId))} noPadding size="lg">
            <TableFormSection 
              form={form}
              mode={mode}
              loading={loading}
              onSetField={setField}
              onReset={() => resetForm(String(selectedSectionId))}
              onSave={handleSave}
              onDeleteRequest={(mode === "edit" && canDelete) ? () => {
                const record = visibleTables.find(t => t.tableId === selectedId);
                if (record) setDeleteRecord(record);
              } : undefined}
            />
          </Modal>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteRecord !== null}
        onCancel={() => setDeleteRecord(null)}
        onConfirm={handleConfirmDelete}
        message={`Are you sure you want to delete table "${deleteRecord?.tableName}"?`}
      />
    </PageShell>
  );
};

export default TableMasterPage;
