import { Pencil, RotateCcw, Save, Trash2 } from "lucide-react";
import React from "react";
import {
  Button,
  ConfirmDialog,
  Modal,
  PageShell,
  RecordTableCard,
} from "../../../../components/common";
import ModifierMasterForm from "../components/ModifierMasterForm";
import { useModifierManager } from "../hooks/useModifierManager";
import type { ModifierRecord } from "../types";
import { formatCurrency } from "../../../../utils/formatters";
import { useAppSelector } from "../../../../app/hooks";
import { selectDecimalPart } from "../../../auth/store/authSlice";
import { usePermissions } from "../../../../hooks/usePermissions";

const ModifierPage = () => {
  const decimalPart = useAppSelector(selectDecimalPart);
  const { hasPermission } = usePermissions();
  const {
    form,
    loading,
    saving,
    open,
    search,
    editingId,
    filteredModifiers,
    branches,
    modifierTypes,
    categories,
    branchAllocOpen,
    categoryAllocOpen,
    setSearch,
    setField,
    toggleBranch,
    toggleCategory,
    setBranchAllocOpen,
    setCategoryAllocOpen,
    resetForm,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    handleDelete,
  } = useModifierManager();
  const [deleteRecord, setDeleteRecord] = React.useState<ModifierRecord | null>(null);

  const canAdd = hasPermission("Modifier Master", "Add");
  const canEdit = hasPermission("Modifier Master", "Edit");
  const canDelete = hasPermission("Modifier Master", "Delete");

  return (
    <PageShell
      title="Modifier Master">
      <RecordTableCard
        title="Saved Modifier List"
        search={search}
        onSearchChange={setSearch}
        rowKey="id"
        data={filteredModifiers}
        actionLabel={canAdd ? "+ Add Modifier" : undefined}
        onAction={canAdd ? openCreateModal : undefined}
        loading={loading}
        autoFocusSearch
        columns={[
          { header: "Name", accessor: "name" },
          { header: "Arabic", accessor: "arabic" },
          { 
            header: "Price", 
            accessor: "price",
            render: (row) => <span>{formatCurrency(row.price || 0, decimalPart)}</span>
          },
          { 
            header: "Type", 
            accessor: "typeId",
            render: (row) => {
              const typeId = String(row.typeId || (row as any).type_id || "");
              const type = modifierTypes.find(t => String(t.typeId || (t as any).id) === typeId);
              return <span>{type?.name || typeId || "N/A"}</span>;
            }
          },
          {
            header: "Color",
            accessor: "color",
            render: (row) => (
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-4 w-4 rounded-full border border-gray-300"
                  style={{ backgroundColor: row.color || "#cccccc" }}
                />
                <span className="text-xs">{row.color || "None"}</span>
              </div>
            ),
          },
          { 
            header: "Branches", 
            accessor: "branchIds",
            render: (row) => {
               const count = (row.branchIds || []).length;
               return (
                 <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                   {count} {count === 1 ? "branch" : "branches"}
                 </span>
               );
            }
          },
          {
            header: "Actions",
            accessor: "id",
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

      <Modal 
        isOpen={open} 
        onClose={closeModal} 
        title={editingId ? "Edit Modifier" : "Add Modifier"} 
        size="lg"
        footer={
          <div className="flex w-full flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
            <Button 
              variant="secondary" 
              onClick={resetForm} 
              disabled={saving} 
              tabIndex={-1}
              isAction
              icon={<RotateCcw size={18} />}
            >
              Clear
            </Button>
            <Button 
              onClick={handleSave} 
              loading={saving}
              isAction
              icon={<Save size={18} />}
            >
              Save
            </Button>
            {editingId && canDelete && (
              <Button
                variant="danger"
                onClick={() => {
                  const record = filteredModifiers.find(r => r.id === editingId);
                  if (record) {
                    setDeleteRecord(record);
                    closeModal();
                  }
                }}
                disabled={saving}
                isAction
                icon={<Trash2 size={18} />}
              >
                Delete
              </Button>
            )}
          </div>
        }
      >
        <ModifierMasterForm
          form={form}
          loading={loading && Boolean(editingId)}
          branches={branches}
          categories={categories}
          modifierTypes={modifierTypes}
          branchAllocOpen={branchAllocOpen}
          categoryAllocOpen={categoryAllocOpen}
          onChange={setField}
          onToggleBranch={toggleBranch}
          onToggleCategory={toggleCategory}
          onToggleBranchAlloc={() => setBranchAllocOpen(!branchAllocOpen)}
          onToggleCategoryAlloc={() => setCategoryAllocOpen(!categoryAllocOpen)}
        />
      </Modal>

      <ConfirmDialog
        isOpen={deleteRecord !== null}
        onCancel={() => setDeleteRecord(null)}
        onConfirm={() => {
          if (deleteRecord) {
            handleDelete(deleteRecord);
            setDeleteRecord(null);
          }
        }}
        message="Are you sure you want to delete this modifier? This action cannot be undone."
      />
    </PageShell>
  );
};

export default ModifierPage;
