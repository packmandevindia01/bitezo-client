import { useEffect, useRef } from "react";
import Button from "./Button";
import Modal from "./Modal";

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  confirmVariant?: "primary" | "secondary" | "danger";
}

const ConfirmDialog = ({
  isOpen,
  title = "Confirm Delete",
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
  confirmVariant = "danger",
}: ConfirmDialogProps) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        cancelRef.current?.focus();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        confirmRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title}>
      <div className="space-y-4 text-center">
        <p className="text-gray-700">{message}</p>

        <div className="flex justify-center gap-3">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button ref={confirmRef} variant={confirmVariant} autoFocus onClick={onConfirm} disabled={loading}>
            {loading ? "Please wait..." : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
