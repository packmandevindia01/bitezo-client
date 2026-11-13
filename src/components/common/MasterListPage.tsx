import { useState, type ReactNode } from "react";
import Loader from "./Loader";
import { AlertCircle, Pencil, Trash2 } from "lucide-react";
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
  /** Name the permission check uses. Left out: every action is allowed. */
  moduleName?: string;
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
  /** Called after the confirm. Not needed with `deleteFlow`. */
  onDelete?: (row: T) => unknown;
  editingId: unknown;
  closeForm: () => void;
  deleteDialog: MasterDeleteDialog<T>;
  /** Banners between the search box and the table. */
  notices?: ReactNode;
  /** What the row is, when it must not be changed, e.g. "Core system unit". */
  lockedAs?: (row: T) => string | undefined;
  /** Key of the row being deleted: its button shows a spinner. */
  deletingKey?: unknown;
  /** For hooks that hold the record being deleted themselves. */
  deleteFlow?: { candidate: T | null; request: (row: T) => void; confirm: () => unknown; cancel: () => void };
  /** Text of the Add button (default "Add New"). */
  addLabel?: string;
  /** Actions column centred, like the other centred columns of the list. */
  centered?: boolean;
  /** While loading, show this loading card instead of the table. */
  loadingText?: string;
  /** More row buttons, between Edit and Delete (e.g. Change password). */
  extraActions?: (row: T) => ReactNode;
  /** The add / edit form. `deleteEditing` asks to delete the record being edited. */
  renderForm: (deleteEditing: () => void, canDelete: boolean) => ReactNode;
}

/** A list that failed to load: the reason, and a way to try again. */
export const MasterLoadError = ({ message, onRetry }: { message: string; onRetry: () => void }) => (
  <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
    <AlertCircle size={16} className="mt-0.5 shrink-0" />
    <span className="flex-1">{message}</span>
    <button type="button" onClick={onRetry} className="shrink-0 rounded p-0.5 hover:bg-amber-100">
      <span className="underline">Retry</span>
    </button>
  </div>
);

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
  notices,
  lockedAs,
  deletingKey,
  deleteFlow,
  renderForm,
  addLabel,
  centered,
  loadingText,
  extraActions,
}: MasterListPageProps<T>) => {
  const { hasPermission } = usePermissions();
  const [deleteRecord, setDeleteRecord] = useState<T | null>(null);

  const canAdd = !moduleName || hasPermission(moduleName, "Add");
  const canEdit = !moduleName || hasPermission(moduleName, "Edit");
  const canDelete = !moduleName || hasPermission(moduleName, "Delete");

  const pendingDelete = deleteFlow ? deleteFlow.candidate : deleteRecord;

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
      <ListHeader search={search} onSearchChange={onSearchChange} searchPlaceholder={searchPlaceholder} autoFocusSearch canAdd={canAdd} onAdd={onAdd} {...(addLabel ? { addLabel } : {})} />

      {notices}

      {loadingText && loading ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-10 shadow-sm">
          <Loader text={loadingText} />
        </div>
      ) : (
      <RecordTableCard<T>
        title={tableTitle}
        rowKey={rowKey}
        data={records}
        loading={loadingText ? false : loading}
        columns={[
          ...columns,
          {
            header: "Actions",
            accessor: rowKey,
            ...(centered ? { align: "center" } : {}),
            render: (row) => {
              const locked = lockedAs?.(row);
              const deleting = deletingKey !== undefined && deletingKey !== null && row[rowKey] === deletingKey;
              return (
                <div className={centered ? "flex justify-center gap-2" : "flex gap-2"}>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => void onEdit(row)}
                      disabled={!!locked}
                      className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label={`Edit ${getName(row)}`}
                      title={locked ? `${locked} cannot be edited` : `Edit ${getName(row)}`}
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {extraActions?.(row)}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => (deleteFlow ? deleteFlow.request(row) : setDeleteRecord(row))}
                      disabled={!!locked || deleting}
                      className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label={`Delete ${getName(row)}`}
                      title={locked ? `${locked} cannot be deleted` : `Delete ${getName(row)}`}
                    >
                      {deleting ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  )}
                </div>
              );
            },
          },
        ]}
      />
      )}

      {renderForm(deleteEditing, canDelete)}

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title={deleteDialog.title}
        message={pendingDelete ? deleteDialog.message(pendingDelete) : ""}
        confirmLabel={deleteDialog.confirmLabel}
        cancelLabel={deleteDialog.cancelLabel}
        loading={deleteDialog.loading}
        onCancel={() => {
          if (deleteFlow) deleteFlow.cancel();
          else if (!deleteDialog.lockCancel) setDeleteRecord(null);
        }}
        onConfirm={() => {
          if (deleteFlow) {
            void deleteFlow.confirm();
          } else if (deleteRecord) {
            void onDelete?.(deleteRecord);
            setDeleteRecord(null);
          }
        }}
      />
    </PageShell>
  );
};

export default MasterListPage;
