import ConfirmDialog from "../../../../../../components/common/ConfirmDialog";
import { t } from "../../../../utils/posLocalization";

interface SettlePrintPromptProps {
  isOpen: boolean;
  onAnswer: (print: boolean) => void;
}

/** Asked after the sale is saved. Enter = Yes, Esc = No. */
export const SettlePrintPrompt = ({ isOpen, onAnswer }: SettlePrintPromptProps) => (
  <ConfirmDialog
    isOpen={isOpen}
    title={t("Print Receipt")}
    message={t("Do you want to print the receipt?")}
    confirmLabel={t("Yes")}
    cancelLabel={t("No")}
    confirmVariant="primary"
    onConfirm={() => onAnswer(true)}
    onCancel={() => onAnswer(false)}
  />
);
