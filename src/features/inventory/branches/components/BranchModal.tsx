import { Modal } from "../../../../components/common";
import type { BranchPayload, BranchRecord } from "../types";
import BranchForm from "./BranchForm";

interface Props {
  isOpen: boolean;
  editingBranch: BranchRecord | null;
  onClose: () => void;
  onSave: (payload: BranchPayload) => void;
  onDelete?: () => void;
}

const BranchModal = ({ isOpen, editingBranch, onClose, onSave, onDelete }: Props) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingBranch ? "Edit Branch" : "Add Branch"}
      size="2xl"
    >
      <BranchForm
        key={editingBranch?.id ?? "new-branch"}
        initialData={
          editingBranch
            ? {
                branchName: editingBranch.branchName,
                lines: editingBranch.lines,
                isActive: editingBranch.isActive,
              }
            : null
        }
        onSubmit={onSave}
        onCancel={onClose}
        onDelete={onDelete}
        showTitle={false}
      />
    </Modal>
  );
};

export default BranchModal;