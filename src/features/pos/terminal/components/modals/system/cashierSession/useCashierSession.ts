import { getSystemBranchId } from "@shared/config/device";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cashierLogService, type CashierInStatus } from "../../../../../cashier/services/cashierLogService";
import { fetchDenominations } from "../../../../../../general/denomination/services/denominationService";
import type { DenominationItem } from "../../../../../../general/denomination/types";
import { useToast } from "../../../../../../../app/providers/useToast";
import { bulkSettlementApi } from "../../../../../bulkSettlement/services/bulkSettlementApi";
import { checkPendingOrders } from "../../../../utils/pendingDayCheck";
import { roundCalc } from "../../../../utils/billing";
import { toLocalDateString, localDateAtCurrentTimeIso } from "../../../../../../../utils/date";
import { isOpeningMode, type CloseTab, type EntryMode, type Mode } from "./cashierSessionModes";
import { buildDenominationPayload, clearCashierLogin, printEndReport, showSessionActionError } from "./cashierSessionActions";

interface UseCashierSessionProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionReady?: () => void;
  initialTab: CloseTab;
}

type PrintState = { type: "SHIFT" | "DAY"; step: number; dayId: number; shiftId: number };
type PendingCloseDay = {
  isoString: string;
  denominations: { denominationId: number; cashCount: number }[];
  isCombined: boolean; // true = came from handleConfirmCloseBoth
};

/**
 * State and server steps of the cashier session window: open day, open shift, close shift, close day
 * (moved out of PosCashierSessionModal, 2026-11-13).
 * Closing a day first checks for unsettled orders; closing ends with the Shift End / Day End print questions
 * and a logout.
 */
export const useCashierSession = ({ isOpen, onClose, onSessionReady, initialTab }: UseCashierSessionProps) => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [cashierStatus, setCashierStatus] = useState<CashierInStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [denoms, setDenoms] = useState<DenominationItem[]>([]);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [closeTab, setCloseTab] = useState<CloseTab>(initialTab || "SHIFT");
  const [showCloseBothConfirm, setShowCloseBothConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showOpenCancelConfirm, setShowOpenCancelConfirm] = useState(false);
  const [printState, setPrintState] = useState<PrintState | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showPreSessionMore, setShowPreSessionMore] = useState(false);

  const [entryMode, setEntryMode] = useState<EntryMode>("MANUAL");
  const [viewScreen, setViewScreen] = useState<"MANUAL" | "DENOMS">("MANUAL");
  const [manualAmount, setManualAmount] = useState<string>("");
  const [activeField, setActiveField] = useState<string | number>("TOTAL");
  const [selectedDate, setSelectedDate] = useState<string>(() => toLocalDateString());
  const inputRefs = useRef<Record<string | number, HTMLInputElement | null>>({});
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const hasFetched = useRef(false);

  // ── Pending Order Settlement State ────────────────────────────────────────
  const [showPendingSettleModal, setShowPendingSettleModal] = useState(false);
  const [pendingCheckFailed, setPendingCheckFailed] = useState(false);
  const [isSettlingPending, setIsSettlingPending] = useState(false);
  // Captures the close-day payload so we can resume after the pending modal
  const pendingCloseDayRef = useRef<PendingCloseDay | null>(null);

  const mode: Mode | null = useMemo(() => {
    if (!cashierStatus) return null;
    if (cashierStatus.isDayClosed) return "OPEN_DAY";
    if (cashierStatus.isShiftClosed) {
      return closeTab === "DAY" ? "CLOSE_DAY" : "OPEN_SHIFT";
    }
    return closeTab === "SHIFT" ? "CLOSE_SHIFT" : "CLOSE_DAY";
  }, [cashierStatus, closeTab]);

  const resetSessionModalState = useCallback(() => {
    hasFetched.current = false;
    setManualAmount("");
    setCounts({});
    setEntryMode("MANUAL");
    setViewScreen("MANUAL");
    setActiveField("TOTAL");
    setPrintState(null);
    setSubmitting(false);
    setShowCloseBothConfirm(false);
    setShowLogoutConfirm(false);
    setShowOpenCancelConfirm(false);
    setShowPendingSettleModal(false);
    setShowPreSessionMore(false);
  }, []);

  const handleModalClose = () => {
    if (submitting) return;
    if (isOpeningMode(mode)) {
      setShowOpenCancelConfirm(true);
    } else {
      resetSessionModalState();
      onClose();
    }
  };

  const totalAmount = useMemo(() => {
    if (entryMode === "MANUAL") return roundCalc(Number(manualAmount) || 0);
    const sum = denoms.reduce((acc, d) => acc + (counts[d.id ?? 0] ?? 0) * d.value, 0);
    return roundCalc(sum);
  }, [denoms, counts, entryMode, manualAmount]);

  const loadAll = useCallback(async () => {
    setStatusLoading(true);
    try {
      const branchId  = getSystemBranchId()  || 0;
      const counterId = Number(localStorage.getItem("systemCounterId")) || 0;

      const response = await cashierLogService.checkStatus(branchId, counterId);
      const st = response.cashierInStatus;
      setCashierStatus(st);

      if (st && !st.isDayClosed && !st.isShiftClosed) {
        const formattedTransDate = st.transDate ? st.transDate.split("T")[0] : "";
        localStorage.setItem("activeShift", JSON.stringify({ status: "open", dayId: st.dayId, shiftId: st.shiftId, transDate: formattedTransDate }));
        if (formattedTransDate) {
          localStorage.setItem("transDate", formattedTransDate);
        }
        // Default closing date to session's transDate (not today) so the
        // backend close-shift / close-day matches the session that was opened
        if (formattedTransDate) {
          setSelectedDate(formattedTransDate);
        }
        setCloseTab(initialTab || "SHIFT");
      } else {
        localStorage.removeItem("activeShift");
        localStorage.removeItem("transDate");
      }

      try {
        const finalDenoms = await fetchDenominations();
        setDenoms(finalDenoms);
        setEntryMode("MANUAL");
        setActiveField("TOTAL");
        setViewScreen("MANUAL");
        const init: Record<number, number> = {};
        finalDenoms.forEach((d) => { if (d.id) init[d.id] = 0; });
        setCounts(init);
      } catch {
        setDenoms([]);
        setEntryMode("MANUAL");
        setActiveField("TOTAL");
        setCounts({});
      }
    } catch (err: unknown) {
      console.error("Cashier status error:", err);
    } finally {
      setStatusLoading(false);
    }
  }, [initialTab]);

  useEffect(() => {
    if (isOpen && !statusLoading && viewScreen === "MANUAL") {
      const timer = setTimeout(() => {
        inputRefs.current["TOTAL"]?.focus();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen, statusLoading, viewScreen]);

  useEffect(() => {
    if (isOpen) {
      resetSessionModalState();
      setCloseTab(initialTab || "SHIFT");
      setSelectedDate(toLocalDateString());
      void loadAll();
    } else {
      resetSessionModalState();
    }
  }, [isOpen, initialTab, loadAll, resetSessionModalState]);

  /** Callback ref for the total box ("TOTAL") or a denomination count box (its id). */
  const registerInput = (key: string | number) => (el: HTMLInputElement | null) => { inputRefs.current[key] = el; };

  const handleCountChange = (id: number, val: string) => {
    if (val.length > 5) return;
    setCounts(prev => ({ ...prev, [id]: Math.max(0, parseInt(val) || 0) }));
  };

  const handleKeypadPress = (key: string) => {
    if (submitting) return;

    if (activeField === "TOTAL" || entryMode === "MANUAL") {
      if (key === "Clear") {
        setManualAmount("");
      } else if (key === "Back") {
        setManualAmount((prev) => prev.slice(0, -1));
      } else if (key === ".") {
        setManualAmount((prev) => {
          const next = !prev.includes(".") ? (prev ? prev + "." : "0.") : prev;
          return next.length <= 15 ? next : prev;
        });
      } else {
        setManualAmount((prev) => {
          const next = prev === "0" ? key : prev + key;
          return next.length <= 15 ? next : prev;
        });
      }
      inputRefs.current["TOTAL"]?.focus();
    } else {
      const targetId = typeof activeField === "number" ? activeField : denoms[0]?.id;
      if (!targetId) return;

      const currentVal = String(counts[targetId] || 0);
      let nextVal = currentVal;

      if (key === "Clear") {
        nextVal = "0";
      } else if (key === "Back") {
        nextVal = currentVal.length > 1 ? currentVal.slice(0, -1) : "0";
      } else if (key === ".") {
        return; // integer counts only for denominations
      } else {
        nextVal = currentVal === "0" ? key : currentVal + key;
      }
      if (nextVal.length <= 5) {
        setCounts((prev) => ({ ...prev, [targetId]: Math.max(0, parseInt(nextVal) || 0) }));
      }
      inputRefs.current[targetId]?.focus();
    }
  };

  /** Denomination screen. */
  const showDenominations = () => {
    if (denoms.length > 0) {
      setViewScreen("DENOMS");
      setEntryMode("DENOM");
      const firstId = denoms[0]?.id;
      if (firstId) {
        setActiveField(firstId);
        setTimeout(() => inputRefs.current[firstId]?.focus(), 50);
      }
    } else {
      showToast("No denominations configured in master data", "info");
    }
  };

  /** Back to typing the total; a counted total is kept as the starting amount. */
  const showManualEntry = () => {
    setViewScreen("MANUAL");
    setEntryMode("MANUAL");
    setActiveField("TOTAL");
    if (totalAmount > 0 && !manualAmount) {
      setManualAmount(totalAmount.toString());
    }
    setTimeout(() => inputRefs.current["TOTAL"]?.focus(), 50);
  };

  const runPendingCheck = (dayId: number) => checkPendingOrders((id) => bulkSettlementApi.checkPendingOrderStatus(id), dayId);

  /** True when closing the day has to wait for the cashier: orders are pending, or the check itself failed. */
  const holdCloseForPendingCheck = async (close: PendingCloseDay): Promise<boolean> => {
    if (!cashierStatus) return false;
    const outcome = await runPendingCheck(cashierStatus.dayId);
    if (outcome === "clear") return false;
    pendingCloseDayRef.current = close;
    setSubmitting(false);
    if (outcome === "pending") setShowPendingSettleModal(true);
    else setPendingCheckFailed(true);
    return true;
  };

  const requireBranchAndUser = (status: CashierInStatus) => {
    const userId    = Number(localStorage.getItem("userId"))            || status.userId || 0;
    const branchId  = getSystemBranchId()   || 0;
    if (!branchId || !userId) throw new Error("Missing Branch or User. Please re-login.");
  };

  const executeSubmit = async () => {
    if (!mode || !cashierStatus) return;
    setSubmitting(true);
    try {
      requireBranchAndUser(cashierStatus);

      const isoString  = localDateAtCurrentTimeIso(selectedDate);
      const dateOnly   = selectedDate;
      const denominations = buildDenominationPayload(entryMode, counts);

      if (mode === "OPEN_DAY") {
        const res = await cashierLogService.openDay({ startDate: isoString, transDate: dateOnly, openingBal: totalAmount, denominations });
        const activeTransDate = res.data?.transDate || selectedDate;
        if (res.data?.shiftId) {
          localStorage.setItem("activeShift", JSON.stringify({ status: "open", dayId: res.data.dayId, shiftId: res.data.shiftId, transDate: activeTransDate }));
        }
        localStorage.setItem("transDate", activeTransDate);
        await queryClient.invalidateQueries({ queryKey: ["cashierStatus"] });
        showToast("Business Day Opened Successfully", "success");
        onSessionReady?.();
        onClose();

      } else if (mode === "OPEN_SHIFT") {
        const res = await cashierLogService.openShift({ dayId: cashierStatus.dayId, startDate: isoString, transDate: dateOnly, openingBal: totalAmount, denominations });
        const activeTransDate = res.data?.transDate || cashierStatus?.transDate || selectedDate;
        if (res.data?.shiftId || cashierStatus.dayId) {
          localStorage.setItem("activeShift", JSON.stringify({ status: "open", dayId: cashierStatus.dayId, shiftId: res.data?.shiftId || 0, transDate: activeTransDate }));
        }
        localStorage.setItem("transDate", activeTransDate);
        await queryClient.invalidateQueries({ queryKey: ["cashierStatus"] });
        showToast("Shift Opened Successfully", "success");
        onSessionReady?.();
        onClose();

      } else if (mode === "CLOSE_SHIFT") {
        const payload = { dayId: cashierStatus.dayId, shiftId: cashierStatus.shiftId, closingBal: totalAmount, endDate: isoString, denominations };
        await cashierLogService.closeShift(payload);
        setPrintState({ type: "SHIFT", step: 1, dayId: cashierStatus.dayId, shiftId: cashierStatus.shiftId });

      } else if (mode === "CLOSE_DAY") {
        if (!cashierStatus.isShiftClosed) {
          setShowCloseBothConfirm(true);
          setSubmitting(false);
          return;
        }

        // ── Check for pending orders before closing the day ──────────────────
        if (await holdCloseForPendingCheck({ isoString, denominations, isCombined: false })) return;

        // No pending orders: close the day directly
        await cashierLogService.closeDay({ dayId: cashierStatus.dayId, shiftId: cashierStatus.shiftId, closingBal: totalAmount, endDate: isoString, denominations: denominations });
        setPrintState({ type: "DAY", step: 2, dayId: cashierStatus.dayId, shiftId: cashierStatus.shiftId });
      }
    } catch (err: any) {
      showSessionActionError(err, showToast, "Action failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /** Submit key: closing a shift asks "Do you want to logout?" first. */
  const handleSubmitPress = () => {
    if (mode === "CLOSE_SHIFT") {
      setShowLogoutConfirm(true);
    } else {
      executeSubmit();
    }
  };

  const handleConfirmCloseBoth = async () => {
    setShowCloseBothConfirm(false);
    if (!mode || !cashierStatus) return;
    setSubmitting(true);
    try {
      requireBranchAndUser(cashierStatus);

      const isoString  = localDateAtCurrentTimeIso(selectedDate);
      const denominations = buildDenominationPayload(entryMode, counts);

      const payload = { dayId: cashierStatus.dayId, shiftId: cashierStatus.shiftId, closingBal: totalAmount, endDate: isoString, denominations };

      // Close shift first
      await cashierLogService.closeShift(payload);

      // ── Check for pending orders before closing the day ──────────────────
      if (await holdCloseForPendingCheck({ isoString, denominations, isCombined: true })) return;

      // No pending orders — close day directly
      await cashierLogService.closeDay({ ...payload, closingBal: totalAmount, denominations });
      setPrintState({ type: "DAY", step: 1, dayId: cashierStatus.dayId, shiftId: cashierStatus.shiftId });
    } catch (err: any) {
      showSessionActionError(err, showToast, "Action failed...");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Called by the Pending Orders Modal (Settle or Skip) ──────────────────
  const handlePendingModalResult = async (shouldSettle: boolean) => {
    setShowPendingSettleModal(false);
    const ref = pendingCloseDayRef.current;
    if (!ref || !cashierStatus) return;

    // If user chose to settle, call day-settlement API first
    if (shouldSettle) {
      setIsSettlingPending(true);
      try {
        const nowIso = new Date().toISOString();
        const seriesId = Number(localStorage.getItem("systemSeriesId")) || Number(localStorage.getItem("seriesId")) || 1;
        const prefix = localStorage.getItem("systemPrefix") || localStorage.getItem("prefix") || "";
        await bulkSettlementApi.submitDaySettlement({
          seriesId,
          prefix,
          dayId: cashierStatus.dayId,
          createdAt: nowIso,
          voucherDate: nowIso,
          transDate: nowIso,
        });
        showToast("Pending orders settled successfully", "success");
      } catch (err: any) {
        const apiMsg = err.response?.data?.message || err.message || "Settlement failed";
        showToast(`${apiMsg} — Proceeding to close day anyway.`, "error");
      } finally {
        setIsSettlingPending(false);
      }
    }

    // Now close the day (regardless of settlement outcome)
    setSubmitting(true);
    try {
      const payload = {
        dayId: cashierStatus.dayId,
        shiftId: cashierStatus.shiftId,
        closingBal: totalAmount,
        endDate: ref.isoString,
        denominations: ref.denominations,
      };
      await cashierLogService.closeDay(payload);
      // isCombined = from handleConfirmCloseBoth (shift+day), step 1 shows shift end print first
      // !isCombined = from executeSubmit CLOSE_DAY, step 2 shows day end print directly
      setPrintState({
        type: "DAY",
        step: ref.isCombined ? 1 : 2,
        dayId: cashierStatus.dayId,
        shiftId: cashierStatus.shiftId,
      });
    } catch (err: any) {
      showSessionActionError(err, showToast, "Failed to close day.");
    } finally {
      setSubmitting(false);
      pendingCloseDayRef.current = null;
    }
  };

  const retryPendingCheck = async () => {
    setPendingCheckFailed(false);
    if (!cashierStatus) return;
    setSubmitting(true);
    const outcome = await runPendingCheck(cashierStatus.dayId);
    setSubmitting(false);
    if (outcome === "pending") setShowPendingSettleModal(true);
    else if (outcome === "failed") setPendingCheckFailed(true);
    else void handlePendingModalResult(false);
  };

  const closeDayAnyway = () => {
    setPendingCheckFailed(false);
    void handlePendingModalResult(false);
  };

  const finishLogout = (msg: string) => {
    setPrintState(null);
    showToast(msg, "success");
    clearCashierLogin();
    onClose();
    setTimeout(() => {
      window.location.href = "/cashier/in";
    }, 1500);
  };

  /** Leaving an open-day / open-shift window logs out of the POS. */
  const logoutFromOpenWindow = () => {
    setShowOpenCancelConfirm(false);
    clearCashierLogin();
    window.location.replace("/cashier/in");
  };

  const handlePrintStep = async (shouldPrint: boolean) => {
    if (!printState) return;
    setIsPrinting(true);
    if (printState.step === 1) {
      if (shouldPrint) await printEndReport("SHIFT", printState.dayId, printState.shiftId, showToast);

      if (printState.type === "DAY") {
        setPrintState(prev => prev ? { ...prev, step: 2 } : null);
      } else {
        finishLogout("Shift Closed Successfully. Logging out...");
      }
    } else if (printState.step === 2) {
      if (shouldPrint) await printEndReport("DAY", printState.dayId, printState.shiftId, showToast);
      finishLogout("Business Day Closed Successfully. Logging out...");
    }
    setIsPrinting(false);
  };

  const selectTab = (tab: CloseTab) => {
    setCloseTab(tab);
    resetSessionModalState();
  };

  return {
    // status
    cashierStatus,
    statusLoading,
    mode,
    closeTab,
    selectTab,
    selectedDate,
    setSelectedDate,
    // amount entry
    denoms,
    counts,
    entryMode,
    setEntryMode,
    viewScreen,
    manualAmount,
    setManualAmount,
    activeField,
    setActiveField,
    totalAmount,
    inputRefs,
    registerInput,
    submitButtonRef,
    handleCountChange,
    handleKeypadPress,
    showDenominations,
    showManualEntry,
    // actions
    submitting,
    handleSubmitPress,
    handleModalClose,
    executeSubmit,
    handleConfirmCloseBoth,
    // dialogs
    showLogoutConfirm,
    setShowLogoutConfirm,
    showOpenCancelConfirm,
    setShowOpenCancelConfirm,
    logoutFromOpenWindow,
    showCloseBothConfirm,
    setShowCloseBothConfirm,
    printState,
    isPrinting,
    handlePrintStep,
    pendingCheckFailed,
    retryPendingCheck,
    closeDayAnyway,
    showPendingSettleModal,
    isSettlingPending,
    handlePendingModalResult,
    showPreSessionMore,
    setShowPreSessionMore,
  };
};

export type CashierSession = ReturnType<typeof useCashierSession>;
