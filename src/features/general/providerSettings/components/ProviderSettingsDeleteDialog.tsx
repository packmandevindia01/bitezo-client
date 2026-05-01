import { ConfirmDialog } from "../../../../components/common";
import type { ProviderSettingsListItem } from "../types";

interface Props {
  candidate: ProviderSettingsListItem | null;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ProviderSettingsDeleteDialog = ({ candidate, loading, onConfirm, onCancel }: Props) => (
  <ConfirmDialog
    isOpen={candidate !== null}
    title="Delete Pricing Config"
    message={`Are you sure you want to delete the pricing configuration for ${candidate?.provider} in ${candidate?.branch}?`}
    confirmLabel="Delete"
    cancelLabel="Cancel"
    onConfirm={onConfirm}
    onCancel={onCancel}
    loading={loading}
  />
);

export default ProviderSettingsDeleteDialog;