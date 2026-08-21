import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Modal, ConfirmDialog } from "../../../../../../components/common";
import { cashierLogService, type CashierInStatus } from "../../../../cashier/services/cashierLogService";
import { fetchDenominations } from "../../../../../general/denomination/services/denominationService";
import type { DenominationItem } from "../../../../../general/denomination/types";
import { useToast } from "../../../../../../app/providers/useToast";
import { useCurrency } from "../../../../../../hooks/useCurrency";
import { LogIn, LogOut, Sun, Moon, Loader2, Delete, Calculator, ArrowLeft, AlertTriangle, CheckCircle2, SkipForward } from "lucide-react";
import { getCurrencySymbol } from "../../../../../../utils/currency";
import { generateEndReportHtml } from "../../../../utils/endReportTemplate";
import { useQueryClient } from "@tanstack/react-query";
import { bulkSettlementApi } from "../../../../bulkSettlement/services/bulkSettlementApi";


interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSessionReady?: () => void;
}

type Mode = "OPEN_DAY" | "OPEN_SHIFT" | "CLOSE_SHIFT" | "CLOSE_DAY";
type CloseTab = "SHIFT" | "DAY";

const MODE_CONFIG: Record<Mode, { label: string; buttonLabel: string; balLabel: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  OPEN_DAY:    { label: "Open Business Day",   buttonLabel: "Confirm & Open Day",    balLabel: "Opening Balance", color: "#10b981", bgColor: "#d1fae5", icon: <Sun size={20} /> },
  OPEN_SHIFT:  { label: "Open Shift",           buttonLabel: "Confirm & Open Shift",  balLabel: "Opening Balance", color: "#3b82f6", bgColor: "#dbeafe", icon: <LogIn size={20} /> },
  CLOSE_SHIFT: { label: "Close Shift",          buttonLabel: "Confirm Close Shift",   balLabel: "Closing Balance", color: "#3b82f6", bgColor: "#dbeafe", icon: <Moon size={20} /> },
  CLOSE_DAY:   { label: "Close Business Day",  buttonLabel: "Confirm Close Day",     balLabel: "Closing Balance", color: "#10b981", bgColor: "#d1fae5", icon: <LogOut size={20} /> },
};

export const PosCashierSessionModal: React.FC<Props> = ({ isOpen, onClose, onSessionReady }) => {
  const { showToast } = useToast();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();

  const [cashierStatus, setCashierStatus] = useState<CashierInStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [denoms, setDenoms] = useState<DenominationItem[]>([]);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [closeTab, setCloseTab] = useState<CloseTab>("SHIFT");
  const [showCloseBothConfirm, setShowCloseBothConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showOpenCancelConfirm, setShowOpenCancelConfirm] = useState(false);
  const [printState, setPrintState] = useState<{ type: "SHIFT" | "DAY"; step: number; dayId: number; shiftId: number } | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const [entryMode, setEntryMode] = useState<"DENOM" | "MANUAL">("MANUAL");
  const [viewScreen, setViewScreen] = useState<"MANUAL" | "DENOMS">("MANUAL");
  const [manualAmount, setManualAmount] = useState<string>("");
  const [activeField, setActiveField] = useState<string | number>("TOTAL");
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const inputRefs = useRef<Record<string | number, HTMLInputElement | null>>({});
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const hasFetched = useRef(false);

  // ── Pending Order Settlement State ────────────────────────────────────────
  const [showPendingSettleModal, setShowPendingSettleModal] = useState(false);
  const [isSettlingPending, setIsSettlingPending] = useState(false);
  // Captures the close-day payload so we can resume after the pending modal
  const pendingCloseDayRef = useRef<{
    isoString: string;
    denominations: { denominationId: number; cashCount: number }[];
    isCombined: boolean; // true = came from handleConfirmCloseBoth
  } | null>(null);


  const mode: Mode | null = useMemo(() => {
    if (!cashierStatus) return null;
    if (cashierStatus.isDayClosed) return "OPEN_DAY";
    if (cashierStatus.isShiftClosed) {
      return closeTab === "DAY" ? "CLOSE_DAY" : "OPEN_SHIFT";
    }
    return closeTab === "SHIFT" ? "CLOSE_SHIFT" : "CLOSE_DAY";
  }, [cashierStatus, closeTab]);

  const cfg = mode ? MODE_CONFIG[mode] : null;

  const handleModalClose = () => {
    if (submitting) return;
    if (mode === "OPEN_DAY" || mode === "OPEN_SHIFT") {
      setShowOpenCancelConfirm(true);
    } else {
      onClose();
    }
  };

  const totalAmount = useMemo(() => {
    if (entryMode === "MANUAL") return Number(manualAmount) || 0;
    return denoms.reduce((sum, d) => sum + (counts[d.id ?? 0] ?? 0) * d.value, 0);
  }, [denoms, counts, entryMode, manualAmount]);

  const loadAll = useCallback(async () => {
    setStatusLoading(true);
    try {
      const branchId  = Number(localStorage.getItem("systemBranchId"))  || 0;
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
        setCloseTab("SHIFT");
      } else {
        localStorage.removeItem("activeShift");
        localStorage.removeItem("transDate");
      }

      try {
        const denomData = await fetchDenominations();
        const finalDenoms = denomData;
        setDenoms(finalDenoms);
        setEntryMode("MANUAL");
        setActiveField("TOTAL");
        setViewScreen("MANUAL");
        const init: Record<number, number> = {};
        finalDenoms.forEach((d: any) => { if (d.id) init[d.id] = 0; });
        setCounts(init);
      } catch (dErr) {
        setDenoms([]);
        setEntryMode("MANUAL");
        setActiveField("TOTAL");
        setCounts({});
      }
    } catch (err: any) {
      console.error("Cashier status error:", err);
    } finally {
      setStatusLoading(false);
    }
  }, []);

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
      setSelectedDate(new Date().toISOString().split("T")[0]);
      void loadAll();
    } else {
      hasFetched.current = false;
      setManualAmount("");
      setPrintState(null);
      setActiveField("TOTAL");
      setViewScreen("MANUAL");
    }
  }, [isOpen, loadAll]);

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

  const executeSubmit = async () => {
    if (!mode || !cashierStatus) return;
    setSubmitting(true);
    try {
      const userId    = Number(localStorage.getItem("userId"))            || cashierStatus.userId || 0;
      const branchId  = Number(localStorage.getItem("systemBranchId"))   || 0;

      if (!branchId || !userId) throw new Error("Missing Branch or User. Please re-login.");

      const now        = new Date();
      const timePart   = now.toISOString().split("T")[1] || "00:00:00.000Z";
      const isoString  = `${selectedDate}T${timePart}`;
      const dateOnly   = selectedDate;
      
      const denominations: any[] = (entryMode !== "DENOM") 
        ? []
        : Object.entries(counts).map(([id, count]) => ({
            denominationId: Number(id),
            cashCount: count
          }));

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
        try {
          const pendingStatus = await bulkSettlementApi.checkPendingOrderStatus(cashierStatus.dayId);
          if (pendingStatus.hasPendingOrder) {
            // Capture the payload so we can resume after user decides
            pendingCloseDayRef.current = { isoString, denominations, isCombined: false };
            setSubmitting(false);
            setShowPendingSettleModal(true);
            return; // Don't close yet — wait for the pending modal result
          }
        } catch {
          // If the check fails, proceed to close the day normally
        }

        // No pending orders (or check failed) — close day directly
        await cashierLogService.closeDay({ dayId: cashierStatus.dayId, shiftId: cashierStatus.shiftId, closingBal: totalAmount, endDate: isoString, denominations: denominations });
        setPrintState({ type: "DAY", step: 2, dayId: cashierStatus.dayId, shiftId: cashierStatus.shiftId });
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        showToast("Session expired. Redirecting to login...", "error");
        setTimeout(() => window.location.href = '/', 2000);
      } else {
        const apiMsg = err.response?.data?.message || (err.response?.data?.errors ? JSON.stringify(err.response.data.errors) : null);
        showToast(apiMsg || err.message || "Action failed. Please try again.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmCloseBoth = async () => {
    setShowCloseBothConfirm(false);
    if (!mode || !cashierStatus) return;
    setSubmitting(true);
    try {
      const userId    = Number(localStorage.getItem("userId"))            || cashierStatus.userId || 0;
      const branchId  = Number(localStorage.getItem("systemBranchId"))   || 0;
      if (!branchId || !userId) throw new Error("Missing Branch or User. Please re-login.");

      const now        = new Date();
      const timePart   = now.toISOString().split("T")[1] || "00:00:00.000Z";
      const isoString  = `${selectedDate}T${timePart}`;
      const denominations: any[] = entryMode === "DENOM" 
        ? Object.entries(counts).map(([id, count]) => ({
            denominationId: Number(id),
            cashCount: count
          }))
        : [];

      const payload = { dayId: cashierStatus.dayId, shiftId: cashierStatus.shiftId, closingBal: totalAmount, endDate: isoString, denominations };
      
      // Close shift first
      await cashierLogService.closeShift(payload);

      // ── Check for pending orders before closing the day ──────────────────
      try {
        const pendingStatus = await bulkSettlementApi.checkPendingOrderStatus(cashierStatus.dayId);
        if (pendingStatus.hasPendingOrder) {
          pendingCloseDayRef.current = { isoString, denominations, isCombined: true };
          setSubmitting(false);
          setShowPendingSettleModal(true);
          return; // Don't close day yet — wait for the pending modal result
        }
      } catch {
        // If the check fails, proceed to close the day normally
      }

      // No pending orders — close day directly
      await cashierLogService.closeDay({ ...payload, closingBal: totalAmount, denominations });
      setPrintState({ type: "DAY", step: 1, dayId: cashierStatus.dayId, shiftId: cashierStatus.shiftId });
    } catch (err: any) {
      if (err.response?.status === 401) {
        showToast("Session expired. Redirecting to login...", "error");
        setTimeout(() => window.location.href = '/', 2000);
      } else {
        const apiMsg = err.response?.data?.message || (err.response?.data?.errors ? JSON.stringify(err.response.data.errors) : null);
        showToast(apiMsg || err.message || "Action failed...", "error");
      }
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
      if (err.response?.status === 401) {
        showToast("Session expired. Redirecting to login...", "error");
        setTimeout(() => window.location.href = '/', 2000);
      } else {
        const apiMsg = err.response?.data?.message || (err.response?.data?.errors ? JSON.stringify(err.response.data.errors) : null);
        showToast(apiMsg || err.message || "Failed to close day.", "error");
      }
    } finally {
      setSubmitting(false);
      pendingCloseDayRef.current = null;
    }
  };

  const finishLogout = (msg: string) => {
    setPrintState(null);
    showToast(msg, "success");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("activeShift");
    onClose();
    setTimeout(() => {
      window.location.href = "/cashier/in";
    }, 1500);
  };

  const handlePrintStep = async (shouldPrint: boolean) => {
    if (!printState) return;
    setIsPrinting(true);
    if (printState.step === 1) {
      if (shouldPrint) {
        try {
          const { Capacitor } = await import("@capacitor/core");
          const reportData = await cashierLogService.getShiftEndReport(printState.dayId, printState.shiftId);
          if (Capacitor.isNativePlatform()) {
            // ── FAST PATH: ESC/POS native ──────────────────────────────────────
            const { printEscPosMarkup } = await import("../../../../services/qzService");
            const { generateEndReportMarkup } = await import("../../../../utils/escPosGenerator");
            const markup = generateEndReportMarkup(reportData, 'SHIFTEND');
            await printEscPosMarkup(markup);
          } else {
            // ── DESKTOP PATH: QZ Tray ──────────────────────────────────────────
            const html = await generateEndReportHtml(reportData, 'SHIFTEND');
            const { printHtmlReceipt } = await import("../../../../services/qzService");
            const defaultPrinter = localStorage.getItem('cachedBillPrinter') || undefined;
            await printHtmlReceipt(html, defaultPrinter);
            await new Promise(res => setTimeout(res, 3000));
          }
          showToast("Printing Shift End...", "success");
        } catch (e: any) {
          showToast(e.message || "Failed to print Shift End", "error");
        }
      }
      
      if (printState.type === "DAY") {
        setPrintState(prev => prev ? { ...prev, step: 2 } : null);
      } else {
        finishLogout("Shift Closed Successfully. Logging out...");
      }
    } else if (printState.step === 2) {
      if (shouldPrint) {
        try {
          const { Capacitor } = await import("@capacitor/core");
          const reportData = await cashierLogService.getDayEndReport(printState.dayId);
          if (Capacitor.isNativePlatform()) {
            const { printEscPosMarkup } = await import("../../../../services/qzService");
            const { generateEndReportMarkup } = await import("../../../../utils/escPosGenerator");
            const markup = generateEndReportMarkup(reportData, 'DAYEND');
            await printEscPosMarkup(markup);
          } else {
            const html = await generateEndReportHtml(reportData, 'DAYEND');
            const { printHtmlReceipt } = await import("../../../../services/qzService");
            const defaultPrinter = localStorage.getItem('cachedBillPrinter') || undefined;
            await printHtmlReceipt(html, defaultPrinter);
            await new Promise(res => setTimeout(res, 3000));
          }
          showToast("Printing Day End...", "success");
        } catch (e: any) {
          showToast(e.message || "Failed to print Day End", "error");
        }
      }
      finishLogout("Business Day Closed Successfully. Logging out...");
    }
    setIsPrinting(false);
  };

  const renderSessionContent = () => {
    // DEFAULT SCREEN: Dedicated Direct Manual Amount Entry
    if (viewScreen === "MANUAL") {
      return (
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">
          {/* LEFT PANEL: Default Manual Typing Section */}
          <div className="flex-1 border border-slate-200 rounded-xl bg-slate-50/50 p-6 flex flex-col justify-between min-h-[460px] max-h-[500px] shadow-xs">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <span className="text-sm font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#49293e]"></span>
                  Direct Manual Amount Entry
                </span>
              </div>

              <div className="my-6">
                <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">
                  {mode === "OPEN_DAY" || mode === "OPEN_SHIFT" ? "Opening Balance" : "Total Amount"} ({getCurrencySymbol()})
                </label>
                <div className="relative">
                  <input
                    ref={(el) => { inputRefs.current["TOTAL"] = el; }}
                    type="text"
                    tabIndex={1}
                    autoFocus={true}
                    maxLength={15}
                    className="w-full text-right text-5xl font-extrabold px-5 py-4 rounded-xl border border-slate-300 bg-white text-[#49293e] shadow-sm hover:border-slate-400 focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e] outline-none transition-all placeholder:text-slate-200"
                    placeholder="0.000"
                    value={entryMode === "MANUAL" ? manualAmount : formatAmount(totalAmount)}
                    onFocus={(e) => {
                      setActiveField("TOTAL");
                      setEntryMode("MANUAL");
                      if (!manualAmount && totalAmount > 0) {
                        setManualAmount(totalAmount.toString());
                      }
                      e.target.select();
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d*\.?\d*$/.test(val) && val.length <= 15) {
                        setManualAmount(val);
                        setEntryMode("MANUAL");
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !submitting) {
                        e.preventDefault();
                        submitButtonRef.current?.focus();
                      }
                    }}
                  />
                </div>
                <p className="text-xs font-medium text-slate-400 mt-2 text-right">
                  Type using physical keyboard or tap touch keypad on the right
                </p>
              </div>
            </div>

            {/* Switch to Denominations Screen Button */}
            <div className="mt-auto pt-4 border-t border-slate-200">
              <button
                type="button"
                tabIndex={-1}
                onClick={() => {
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
                }}
                className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl font-bold transition-all flex items-center justify-center gap-2.5 text-sm sm:text-base shadow-xs active:scale-[0.99] group"
              >
                <Calculator size={20} className="text-[#49293e] group-hover:scale-110 transition-transform" />
                <span>Switch Denomination</span>
              </button>
            </div>
          </div>

          {/* RIGHT PANEL: Touch Keypad and Action Buttons */}
          <div className="w-full lg:w-[320px] shrink-0 flex flex-col justify-between gap-4">
            {/* Touch Numpad */}
            <div className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col justify-center shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center mb-2">
                Touch Keypad
              </span>
              <div className="grid grid-cols-3 gap-2 shrink-0">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    tabIndex={-1}
                    onClick={() => handleKeypadPress(key)}
                    disabled={submitting}
                    className="h-12 rounded-lg text-lg font-bold bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 transition-all active:scale-95 shadow-2xs disabled:opacity-50"
                  >
                    {key}
                  </button>
                ))}
              </div>

              {/* Bottom Keypad Row: Clear, 0, ., Backspace */}
              <div className="grid grid-cols-4 gap-2 mt-2 shrink-0">
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => handleKeypadPress("Clear")}
                  disabled={submitting}
                  className="h-11 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all active:scale-95 shadow-2xs disabled:opacity-50 flex items-center justify-center uppercase"
                >
                  Clear
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => handleKeypadPress("0")}
                  disabled={submitting}
                  className="h-11 rounded-lg text-lg font-bold bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 transition-all active:scale-95 shadow-2xs disabled:opacity-50"
                >
                  0
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => handleKeypadPress(".")}
                  disabled={submitting}
                  className="h-11 rounded-lg text-xl font-extrabold bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 transition-all active:scale-95 shadow-2xs disabled:opacity-30 flex items-center justify-center pb-1"
                >
                  .
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => handleKeypadPress("Back")}
                  disabled={submitting}
                  title="Backspace"
                  className="h-11 rounded-lg text-base font-bold bg-slate-200 text-slate-700 border border-slate-300 hover:bg-slate-300 transition-all active:scale-95 shadow-2xs disabled:opacity-50 flex items-center justify-center"
                >
                  <Delete size={18} />
                </button>
              </div>
            </div>

            {/* Bottom Action Buttons (Submit & Close side by side) */}
            <div className="grid grid-cols-2 gap-2.5 shrink-0 pt-1">
              <button
                ref={submitButtonRef}
                type="button"
                tabIndex={2}
                onClick={() => {
                  if (mode === "CLOSE_SHIFT") {
                    setShowLogoutConfirm(true);
                  } else {
                    executeSubmit();
                  }
                }}
                disabled={submitting}
                className="py-3.5 px-4 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 text-sm outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#49293e]/50 disabled:opacity-50 text-center leading-tight"
                style={{ backgroundColor: cfg?.color || "#49293e" }}
              >
                {submitting ? <Loader2 size={18} className="animate-spin shrink-0" /> : cfg?.buttonLabel || "Submit"}
              </button>
              <button
                type="button"
                tabIndex={3}
                onClick={handleModalClose}
                disabled={submitting}
                className="py-3.5 px-4 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center text-sm disabled:opacity-50 text-center leading-tight"
              >
                {(mode === "OPEN_DAY" || mode === "OPEN_SHIFT") ? "Cancel" : "Close"}
              </button>
            </div>
          </div>
        </div>
      );
    }

    // SCREEN 2: High-Density Professional Denominations Table
    return (
      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        {/* LEFT PANEL: High-Density Denominations Data Grid */}
        <div className="flex-1 border border-slate-200 rounded-xl bg-white shadow-xs overflow-hidden flex flex-col min-h-[460px] max-h-[500px]">
          {/* Table Column Headers */}
          <div className="flex items-center justify-between bg-slate-100 border-b border-slate-200 px-4 py-2.5 text-xs font-extrabold text-slate-600 uppercase tracking-wider shrink-0 select-none">
            <span className="w-24 text-left">Denom</span>
            <span className="w-32 text-right">Count</span>
            <span className="w-36 text-right">Amount</span>
          </div>

          {/* Scrollable Table Body with ultra-compact rows */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-0 custom-scrollbar">
            {denoms.length === 0 ? (
              <div className="py-16 text-center text-slate-400 font-medium text-sm">
                No denominations configured. Switch to Manual Entry on the right.
              </div>
            ) : (
              denoms.map((d, idx) => {
                const dId = d.id ?? 0;
                const isSel = activeField === dId && entryMode === "DENOM";
                const countVal = counts[dId] || 0;
                const rowAmt = countVal * d.value;

                return (
                  <div
                    key={dId}
                    onClick={() => {
                      setActiveField(dId);
                      setEntryMode("DENOM");
                      inputRefs.current[dId]?.focus();
                    }}
                    className={`flex items-center justify-between px-4 py-1 transition-colors cursor-pointer ${
                      isSel
                        ? "bg-amber-50/50 hover:bg-amber-50"
                        : "bg-white hover:bg-slate-50/80"
                    }`}
                  >
                    {/* Denom Label (Left Aligned per POS Rule 3) */}
                    <span className={`w-24 text-left font-extrabold text-sm shrink-0 select-none ${isSel ? "text-[#49293e]" : "text-slate-800"}`}>
                      {d.name} x
                    </span>

                    {/* Count Input (Right Aligned per POS Rule 3) */}
                    <div className="w-32 flex justify-end">
                      <input
                        ref={(el) => { inputRefs.current[dId] = el; }}
                        type="number"
                        min="0"
                        tabIndex={idx + 1}
                        autoFocus={idx === 0}
                        className={`w-28 h-[28px] text-right text-sm font-bold border rounded-lg px-2.5 outline-none transition-all ${
                          isSel
                            ? "bg-white border-[#49293e] text-[#49293e] ring-1 ring-[#49293e]"
                            : "bg-white border-slate-300 text-slate-800 hover:border-slate-400 focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]"
                        }`}
                        value={counts[dId] || ""}
                        onFocus={(e) => {
                          setActiveField(dId);
                          setEntryMode("DENOM");
                          e.target.select();
                        }}
                        onChange={(e) => handleCountChange(dId, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === "ArrowDown") {
                            e.preventDefault();
                            const nextDenom = denoms[idx + 1];
                            if (nextDenom && nextDenom.id) {
                              inputRefs.current[nextDenom.id]?.focus();
                            } else {
                              submitButtonRef.current?.focus();
                            }
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            if (idx > 0) {
                              const prevDenom = denoms[idx - 1];
                              if (prevDenom && prevDenom.id) {
                                inputRefs.current[prevDenom.id]?.focus();
                              }
                            }
                          }
                        }}
                        placeholder="0"
                      />
                    </div>

                    {/* Row Calculated Amount Box (Right Aligned per POS Rule 3) */}
                    <div className="w-36 text-right font-bold text-sm text-slate-700 truncate select-none pr-1">
                      {formatAmount(rowAmt)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Switch to Manual, Total Display, Keypad, and Action Buttons */}
        <div className="w-full lg:w-[320px] shrink-0 flex flex-col justify-between gap-4">
          {/* Switch back to Manual & Total Display */}
          <div className="flex flex-col gap-2 shrink-0">
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                setViewScreen("MANUAL");
                setEntryMode("MANUAL");
                setActiveField("TOTAL");
                if (totalAmount > 0 && !manualAmount) {
                  setManualAmount(totalAmount.toString());
                }
                setTimeout(() => inputRefs.current["TOTAL"]?.focus(), 50);
              }}
              className="w-full py-2 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95"
            >
              <ArrowLeft size={16} className="text-[#49293e]" />
              <span>Back to Manual</span>
            </button>

            <div className="flex flex-col gap-1 bg-[#49293e]/5 border border-[#49293e]/20 rounded-xl p-3.5 shadow-2xs">
              <span className="text-xs font-bold text-[#49293e] uppercase tracking-wider">
                Calculated Total Amount
              </span>
              <div className="w-full text-right text-3xl font-extrabold px-3.5 py-1.5 rounded-lg bg-white text-[#49293e] border border-slate-300 select-none truncate">
                {formatAmount(totalAmount)}
              </div>
            </div>
          </div>

          {/* Touch Numpad */}
          <div className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col justify-center shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center mb-2">
              Touch Keypad
            </span>
            <div className="grid grid-cols-3 gap-2 shrink-0">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
                <button
                  key={key}
                  type="button"
                  tabIndex={-1}
                  onClick={() => handleKeypadPress(key)}
                  disabled={submitting}
                  className="h-12 rounded-lg text-lg font-bold bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 transition-all active:scale-95 shadow-2xs disabled:opacity-50"
                >
                  {key}
                </button>
              ))}
            </div>

            {/* Bottom Keypad Row: Clear, 0, ., Backspace */}
            <div className="grid grid-cols-4 gap-2 mt-2 shrink-0">
              <button
                type="button"
                tabIndex={-1}
                onClick={() => handleKeypadPress("Clear")}
                disabled={submitting}
                className="h-11 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all active:scale-95 shadow-2xs disabled:opacity-50 flex items-center justify-center uppercase"
              >
                Clear
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => handleKeypadPress("0")}
                disabled={submitting}
                className="h-11 rounded-lg text-lg font-bold bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 transition-all active:scale-95 shadow-2xs disabled:opacity-50"
              >
                0
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => handleKeypadPress(".")}
                disabled={true}
                title="Decimal points apply to total amount in Manual mode"
                className="h-11 rounded-lg text-xl font-extrabold bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 transition-all active:scale-95 shadow-2xs disabled:opacity-30 flex items-center justify-center pb-1"
              >
                .
              </button>
              <button
                type="button"
                tabIndex={-1}
                onClick={() => handleKeypadPress("Back")}
                disabled={submitting}
                title="Backspace"
                className="h-11 rounded-lg text-base font-bold bg-slate-200 text-slate-700 border border-slate-300 hover:bg-slate-300 transition-all active:scale-95 shadow-2xs disabled:opacity-50 flex items-center justify-center"
              >
                <Delete size={18} />
              </button>
            </div>
          </div>

          {/* Bottom Action Buttons (Submit & Close side by side) */}
          <div className="grid grid-cols-2 gap-2.5 shrink-0 pt-1">
            <button
              ref={submitButtonRef}
              type="button"
              tabIndex={denoms.length + 2}
              onClick={() => {
                if (mode === "CLOSE_SHIFT") {
                  setShowLogoutConfirm(true);
                } else {
                  executeSubmit();
                }
              }}
              disabled={submitting}
              className="py-3.5 px-4 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 text-sm outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#49293e]/50 disabled:opacity-50 text-center leading-tight"
              style={{ backgroundColor: cfg?.color || "#49293e" }}
            >
              {submitting ? <Loader2 size={18} className="animate-spin shrink-0" /> : cfg?.buttonLabel || "Submit"}
            </button>
            <button
              type="button"
              tabIndex={denoms.length + 3}
              onClick={handleModalClose}
              disabled={submitting}
              className="py-3.5 px-4 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center text-sm disabled:opacity-50 text-center leading-tight"
            >
              {(mode === "OPEN_DAY" || mode === "OPEN_SHIFT") ? "Cancel" : "Close"}
            </button>
          </div>
        </div>
      </div>
    );
  };

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
              {/* Top Banner & Mode Toggle + Date Picker at Top */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-inner shrink-0" style={{ backgroundColor: cfg?.bgColor, color: cfg?.color }}>
                    {cfg?.icon}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-[#49293e] tracking-tight">{cfg?.label}</h2>
                    <p className="text-sm font-medium text-slate-500">
                      {mode === "CLOSE_DAY" 
                        ? "Confirm Day End" 
                        : "Count your cash to proceed with session."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Opening Date prominently placed at the very top */}
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 px-3 py-2 rounded-xl text-slate-700 shadow-2xs focus-within:border-[#49293e] hover:border-slate-400 transition-all cursor-pointer">
                    <span className="text-xs font-bold text-slate-500 mr-0.5 uppercase tracking-wide">
                      {mode === "OPEN_DAY" || mode === "OPEN_SHIFT" ? "Opening Date:" : "Closing Date:"}
                    </span>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-transparent text-sm font-bold text-[#49293e] outline-none cursor-pointer"
                    />
                  </div>

                  {(!cashierStatus?.isDayClosed) && (
                    <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-center">
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setCloseTab("SHIFT")}
                        className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${closeTab === "SHIFT" ? "bg-white text-[#49293e] shadow-xs font-extrabold" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        {cashierStatus?.isShiftClosed ? "Open Shift" : "Close Shift"}
                      </button>
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setCloseTab("DAY")}
                        className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${closeTab === "DAY" ? "bg-white text-[#49293e] shadow-xs font-extrabold" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        Close Day
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* High-Density Two-Column Layout */}
              {renderSessionContent()}
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
        onConfirm={() => {
          setShowOpenCancelConfirm(false);
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("activeShift");
          window.location.replace("/cashier/in");
        }}
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

      {/* ── Pending Orders Settlement Modal ─────────────────────────────── */}
      {showPendingSettleModal && (
        <Modal
          isOpen={showPendingSettleModal}
          onClose={() => {/* Intentionally blocked — cashier must choose */}}
          title="Pending Orders Found"
          size="sm"
        >
          <div className="flex flex-col items-center gap-5 py-2">
            {/* Warning Icon */}
            <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
              <AlertTriangle size={32} className="text-amber-500" />
            </div>

            {/* Message */}
            <div className="text-center px-2">
              <h3 className="text-base font-black text-slate-800 mb-1">Unsettled Orders Detected</h3>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                There are pending orders for today that haven't been settled yet.
                Do you want to <span className="font-bold text-[#49293e]">settle all pending orders</span> before closing the day?
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full pt-1">
              <button
                type="button"
                onClick={() => handlePendingModalResult(true)}
                disabled={isSettlingPending || submitting}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-5 bg-[#49293e] hover:bg-[#382030] text-white rounded-xl font-bold text-sm transition-all active:scale-95 shadow-md disabled:opacity-60"
              >
                {isSettlingPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                {isSettlingPending ? "Settling..." : "Settle All & Close Day"}
              </button>

              <button
                type="button"
                onClick={() => handlePendingModalResult(false)}
                disabled={isSettlingPending || submitting}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all active:scale-95 border border-slate-300 disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <SkipForward size={16} />
                )}
                Skip & Close Day
              </button>
            </div>

            <p className="text-[11px] text-slate-400 font-medium text-center">
              Either way, the business day will be closed after your choice.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
};
