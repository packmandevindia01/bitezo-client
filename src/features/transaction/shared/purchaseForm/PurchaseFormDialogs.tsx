import { Modal } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import { BackofficeMultiPayModal } from "../components/BackofficeMultiPayModal";
import { PurchasePrintPreviewModal } from "../components/PurchasePrintPreviewModal";
import SupplierForm from "../../../general/supplier/components/SupplierForm";
import { ClearFormDialog } from "../documentForm/ClearFormDialog";
import type { PurchaseDoc, PurchaseFormPage, PurchaseKind } from "./usePurchaseFormPage";

interface PurchaseFormDialogsProps {
  kind: PurchaseKind;
  doc: PurchaseDoc;
  page: PurchaseFormPage;
}

/** Save and Clear questions, the split-payment window, the print preview and the new-supplier window. */
export const PurchaseFormDialogs = ({ kind, doc, page }: PurchaseFormDialogsProps) => {
  const {
    payments, totals, paymodeList, multiPayId, isMultiPayOpen, setIsMultiPayOpen, setSelectedPaymodeId, handleSinglePayment,
    handleSettlementSubmit, showClearConfirm, setShowClearConfirm, handleReset,
  } = doc;
  const {
    cfg, showSaveConfirm, setShowSaveConfirm, doSave, isPrintModalOpen, handlePrintModalClose, printData,
    isSupplierModalOpen, setIsSupplierModalOpen, creatingSupplier, handleCreateSupplier, previousPaymodeIdRef, setPaymodeSelectKey,
  } = page;

  const supplierForm = (
    <SupplierForm
      onSubmit={handleCreateSupplier}
      onCancel={() => setIsSupplierModalOpen(false)}
      submitting={creatingSupplier}
    />
  );

  return (
    <>
      <ConfirmDialog
        isOpen={showSaveConfirm}
        title={cfg.saveTitle}
        message={cfg.saveMessage}
        confirmLabel="Save"
        onConfirm={doSave}
        onCancel={() => setShowSaveConfirm(false)}
      />

      <ClearFormDialog
        isOpen={showClearConfirm}
        onConfirm={handleReset}
        onCancel={() => setShowClearConfirm(false)}
      />

      <BackofficeMultiPayModal
        isOpen={isMultiPayOpen}
        paymodes={paymodeList}
        initialPayments={
          payments
            ?.filter((p: any) => p.paymodeId && parseFloat(p.amount) > 0)
            .map((p: any) => ({ paymodeId: p.paymodeId, amount: parseFloat(p.amount) || 0 }))
        }
        onClose={() => {
          // Restore previous paymode selection; re-mount dropdown to clear stale display
          setIsMultiPayOpen(false);
          setSelectedPaymodeId(previousPaymodeIdRef.current);
          setPaymodeSelectKey(k => k + 1);
          // If reverting to a single paymode, restore its payment amount too
          if (previousPaymodeIdRef.current > 0 && previousPaymodeIdRef.current !== multiPayId) {
            const prev = (paymodeList as { paymodeId: number; paymodeName: string }[]).find(p => p.paymodeId === previousPaymodeIdRef.current);
            if (prev) handleSinglePayment(prev.paymodeId, prev.paymodeName, totals.grandTotal);
          }
        }}
        totalDue={totals.grandTotal}
        onSubmit={(settled) => {
          handleSettlementSubmit(settled);
          // Focus Save button after MultiPay modal submits
          setTimeout(() => document.getElementById(`${cfg.prefix}-save-btn`)?.focus(), 200);
        }}
      />

      <PurchasePrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={handlePrintModalClose}
        data={printData}
      />

      {kind === "invoice" ? (
        <Modal isOpen={isSupplierModalOpen} onClose={() => setIsSupplierModalOpen(false)} title="Supplier Creation" size="2xl">
          <div className="p-1">{supplierForm}</div>
        </Modal>
      ) : (
        <Modal isOpen={isSupplierModalOpen} onClose={() => setIsSupplierModalOpen(false)} title="Add New Supplier" size="2xl">
          {supplierForm}
        </Modal>
      )}
    </>
  );
};
