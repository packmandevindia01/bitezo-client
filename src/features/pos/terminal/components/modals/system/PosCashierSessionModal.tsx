import React from "react";
import { Modal, ConfirmDialog } from "../../../../../../components/common";
import { Loader2 } from "lucide-react";
import { PosPreSessionMoreModal } from "./PosPreSessionMoreModal";
import { MODE_CONFIG, type CloseTab } from "./cashierSession/cashierSessionModes";
import { useCashierSession } from "./cashierSession/useCashierSession";
import { SessionHeader } from "./cashierSession/SessionHeader";
import { ManualAmountPanel } from "./cashierSession/ManualAmountPanel";
import { DenominationPanel } from "./cashierSession/DenominationPanel";
import { PendingOrdersModal } from "./cashierSession/PendingOrdersModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSessionReady?: () => void;
  initialTab?: CloseTab;
  onOpenReport?: () => void;
  requestAuthorization?: (options: any) => void;
}

/**
 * Open / close the business day and the shift (split 2026-11-13). State and server steps: useCashierSession;
 * screens: cashierSession/ (header, typed total, denomination count, pending orders window).
 */
export const PosCashierSessionModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSessionReady,
  initialTab = "SHIFT",
  onOpenReport,
  requestAuthorization
}) => {
  const session = useCashierSession({ isOpen, onClose, onSessionReady, initialTab });
  const {
    mode, statusLoading, viewScreen, submitting, handleModalClose, executeSubmit, handleConfirmCloseBoth,
    showLogoutConfirm, setShowLogoutConfirm, showOpenCancelConfirm, setShowOpenCancelConfirm, logoutFromOpenWindow,
    showCloseBothConfirm, setShowCloseBothConfirm, printState, isPrinting, handlePrintStep,
    pendingCheckFailed, retryPendingCheck, closeDayAnyway, showPendingSettleModal, isSettlingPending, handlePendingModalResult,
    showPreSessionMore, setShowPreSessionMore,
  } = session;
  const cfg = mode ? MODE_CONFIG[mode] : null;

  if (!isOpen) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleModalClose} title={cfg?.label || "Session"} size="xl" noPadding>
        <div className="p-6 sm:p-8 bg-white flex flex-col rounded-xl">
          {statusLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
              <p className="text-slate-500 font-medium">Loading session status...</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <SessionHeader session={session} />
              {viewScreen === "MANUAL" ? <ManualAmountPanel session={session} /> : <DenominationPanel session={session} />}
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        title="Logout Confirmation"
        message="Do you want to logout?"
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          executeSubmit();
        }}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showOpenCancelConfirm}
        title="Logout from POS"
        message="Do you want to logout?"
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={logoutFromOpenWindow}
        onCancel={() => setShowOpenCancelConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showCloseBothConfirm}
        title="Close Shift & Day"
        message="Your Shift is still active. Closing the Business Day will also close your Shift. Do you want to proceed?"
        confirmLabel="Yes, Close Both"
        cancelLabel="Cancel"
        onConfirm={handleConfirmCloseBoth}
        onCancel={() => setShowCloseBothConfirm(false)}
        loading={submitting}
      />
      <ConfirmDialog
        isOpen={printState?.step === 1}
        title="Print Shift End"
        message="Do you want to print Shift End?"
        confirmLabel="Print"
        cancelLabel="Skip"
        onConfirm={() => handlePrintStep(true)}
        onCancel={() => handlePrintStep(false)}
        loading={isPrinting}
      />
      <ConfirmDialog
        isOpen={printState?.step === 2 && printState?.type === 'DAY'}
        title="Print Day End"
        message="Do you want to print Day End?"
        confirmLabel="Print"
        cancelLabel="Skip"
        onConfirm={() => handlePrintStep(true)}
        onCancel={() => handlePrintStep(false)}
        loading={isPrinting}
      />

      <ConfirmDialog
        isOpen={pendingCheckFailed}
        title="Could Not Check Pending Orders"
        message="The system could not check for unsettled orders, so open orders may be left behind. Try again, or close the day anyway."
        confirmLabel="Close Day Anyway"
        cancelLabel="Try Again"
        loading={submitting}
        onConfirm={closeDayAnyway}
        onCancel={() => void retryPendingCheck()}
      />

      <PendingOrdersModal
        isOpen={showPendingSettleModal}
        isSettling={isSettlingPending}
        submitting={submitting}
        onChoose={(shouldSettle) => handlePendingModalResult(shouldSettle)}
      />

      <PosPreSessionMoreModal
        isOpen={showPreSessionMore}
        onClose={() => setShowPreSessionMore(false)}
        onOpenReport={() => {
          setShowPreSessionMore(false);
          onOpenReport?.();
        }}
        requestAuthorization={requestAuthorization}
      />
    </>
  );
};
