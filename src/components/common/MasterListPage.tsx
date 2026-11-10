import { useState, type ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import ListHeader from "./ListHeader";
import PageShell from "./PageShell";
import RecordTableCard from "./RecordTableCard";
import { usePermissions } from "../../hooks/usePermissions";

export interface MasterColumn<T> {
  header: string;
  accessor: keyof T;
  render?: (row: T, index: number) => ReactNode;
  align?: string;
}

interface MasterDeleteDialog<T> {
  message: (row: T) => string;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  /** True while a delete is running: Cancel does nothing. */
  lockCancel?: boolean;
}

export interface MasterListPageProps<T> {
  /** Name the permission check uses. */
  moduleName: string;
  title: string;
  tableTitle: string;
  searchPlaceholder: string;
  rowKey: keyof T;
  /** The name shown in the buttons' labels. */
  getName: (row: T) => string;
  /** The columns before Actions. */
  columns: MasterColumn<T>[];
  records: T[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onAdd: () => void;
  onEdit: (row: T) => unknown;
  onDelete: (row: T) => unknown;
  editingId: unknown;
  closeForm: () => void;
  deleteDialog: MasterDeleteDialog<T>;
  /** The add / edit form. `deleteEditing` asks to delete the record being edited. */
  renderForm: (deleteEditing: () => void) => ReactNode;
}

/** List screen of a simple master: search, table, edit and delete by permission, and a confirm before deleting. */
const MasterListPage = <T,>({
  moduleName,
  title,
  tableTitle,
  searchPlaceholder,
  rowKey,
  getName,
  columns,
  records,
  loading,
  search,
  onSearchChange,
  onAdd,
  onEdit,
  onDelete,
  editingId,
  closeForm,
  deleteDialog,
  renderForm,
}: MasterListPageProps<T>) => {
  const { hasPermission } = usePermissions();
  const [deleteRecord, setDeleteRecord] = useState<T | null>(null);

  const canAdd = hasPermission(moduleName, "Add");
  const canEdit = hasPermission(moduleName, "Edit");
  const canDelete = hasPermission(moduleName, "Delete");

  const deleteEditing = () => {
    if (!canDelete) return;
    const record = records.find((row) => row[rowKey] === editingId);
    if (record) {
      setDeleteRecord(record);
      closeForm();
    }
  };

  return (
    <PageShell title={title}>
      <ListHeader search={search} onSearchChange={onSearchChange} searchPlaceholder={searchPlaceholder} autoFocusSearch canAdd={canAdd} onAdd={onAdd} />

      <RecordTableCard<T>
        title={tableTitle}
        rowKey={rowKey}
        data={records}
        loading={loading}
        columns={[
          ...columns,
          {
            header: "Actions",
            accessor: rowKey,
            render: (row) => (
              <div className="flex gap-2">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => void onEdit(row)}
                    className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10"
                    aria-label={`Edit ${getName(row)}`}
                  >
                    <Pencil size={16} />
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setDeleteRecord(row)}
                    className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50"
                    aria-label={`Delete ${getName(row)}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />

      {renderForm(deleteEditing)}

      <ConfirmDialog
        isOpen={deleteRecord !== null}
        title={deleteDialog.title}
        message={deleteRecord ? deleteDialog.message(deleteRecord) : ""}
        confirmLabel={deleteDialog.confirmLabel}
        cancelLabel={deleteDialog.cancelLabel}
        loading={deleteDialog.loading}
        onCancel={() => {
          if (!deleteDialog.lockCancel) setDeleteRecord(null);
        }}
        onConfirm={() => {
          if (deleteRecord) {
            void onDelete(deleteRecord);
            setDeleteRecord(null);
          }
        }}
      />
    </PageShell>
  );
};

export default MasterListPage;
