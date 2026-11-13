import ConfirmDialog from "../../../../components/common/ConfirmDialog";

interface ClearFormDialogProps {
  isOpen: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  confirmLabel?: string;
  confirmVariant?: "danger";
}

/** "Clear Form" question of the document pages. */
export const ClearFormDialog = ({ isOpen, onConfirm, onCancel, confirmLabel = "Clear", confirmVariant }: ClearFormDialogProps) => (
  <ConfirmDialog
    isOpen={isOpen}
    title="Clear Form"
    message="Are you sure you want to clear the form? All unsaved data will be lost."
    confirmLabel={confirmLabel}
    {...(confirmVariant ? { confirmVariant } : {})}
    onConfirm={onConfirm}
    onCancel={onCancel}
  />
);
