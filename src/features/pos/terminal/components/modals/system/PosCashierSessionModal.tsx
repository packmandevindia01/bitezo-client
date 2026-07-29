import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Modal, ConfirmDialog } from "../../../../../../components/common";
import { cashierLogService, type CashierInStatus } from "../../../../cashier/services/cashierLogService";
import { fetchDenominations } from "../../../../../general/denomination/services/denominationService";
import type { DenominationItem } from "../../../../../general/denomination/types";
import { useToast } from "../../../../../../app/providers/useToast";
import { useCurrency } from "../../../../../../hooks/useCurrency";
import { LogIn, LogOut, Sun, Moon, ArrowRight, Loader2 } from "lucide-react";
import { generateEndReportHtml } from "../../../../utils/endReportTemplate";
import { useQueryClient } from "@tanstack/react-query";

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
  const [printState, setPrintState] = useState<{ type: "SHIFT" | "DAY"; step: number; dayId: number; shiftId: number } | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const [entryMode, setEntryMode] = useState<"DENOM" | "MANUAL">("MANUAL");
  const [manualAmount, setManualAmount] = useState<string>("");
  const manualInputRef = useRef<HTMLInputElement>(null);

  const hasFetched = useRef(false);

  const mode: Mode | null = useMemo(() => {
    if (!cashierStatus) return null;
    if (cashierStatus.isDayClosed) return "OPEN_DAY";
    if (cashierStatus.isShiftClosed) {
      return closeTab === "DAY" ? "CLOSE_DAY" : "OPEN_SHIFT";
    }
    return closeTab === "SHIFT" ? "CLOSE_SHIFT" : "CLOSE_DAY";
  }, [cashierStatus, closeTab]);

  const cfg = mode ? MODE_CONFIG[mode] : null;

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
        localStorage.setItem("activeShift", JSON.stringify({ status: "open", dayId: st.dayId, shiftId: st.shiftId }));
        setCloseTab("SHIFT");
      } else {
        localStorage.removeItem("activeShift");
      }

      try {
        const denomData = await fetchDenominations();
        const finalDenoms = denomData;
        setDenoms(finalDenoms);
        if (finalDenoms.length === 0) {
          setEntryMode("MANUAL");
        }
        const init: Record<number, number> = {};
        finalDenoms.forEach((d: any) => { if (d.id) init[d.id] = 0; });
        setCounts(init);
      } catch (dErr) {
        setDenoms([]);
        setEntryMode("MANUAL");
        setCounts({});
      }
    } catch (err: any) {
      console.error("Cashier status error:", err);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => { 
    if (isOpen) {
      void loadAll();
    } else {
      hasFetched.current = false;
      setManualAmount("");
      setPrintState(null);
    }
  }, [isOpen, loadAll]);

  const handleCountChange = (id: number, val: string) => {
    setCounts(prev => ({ ...prev, [id]: Math.max(0, parseInt(val) || 0) }));
  };

  const executeSubmit = async () => {
    if (!mode || !cashierStatus) return;
    setSubmitting(true);
    try {
      const userId    = Number(localStorage.getItem("userId"))            || cashierStatus.userId || 0;
      const branchId  = Number(localStorage.getItem("systemBranchId"))   || 0;

      if (!branchId || !userId) throw new Error("Missing Branch or User. Please re-login.");

      const now        = new Date();
      const isoString  = now.toISOString();
      const dateOnly   = isoString.split("T")[0] + "T00:00:00Z";
      
      const denominations: any[] = (mode === "CLOSE_DAY" || entryMode !== "DENOM") 
        ? []
        : Object.entries(counts).map(([id, count]) => ({
            denominationId: Number(id),
            cashCount: count
          }));

      if (mode === "OPEN_DAY") {
        const res = await cashierLogService.openDay({ startDate: isoString, transDate: dateOnly, openingBal: totalAmount, denominations });
        if (res.data?.shiftId) {
          localStorage.setItem("activeShift", JSON.stringify({ status: "open", dayId: res.data.dayId, shiftId: res.data.shiftId }));
        }
        await queryClient.invalidateQueries({ queryKey: ["cashierStatus"] });
        showToast("Business Day Opened Successfully", "success");
        onSessionReady?.();
        onClose();

      } else if (mode === "OPEN_SHIFT") {
        const res = await cashierLogService.openShift({ dayId: cashierStatus.dayId, startDate: isoString, transDate: dateOnly, openingBal: totalAmount, denominations });
        if (res.data?.shiftId || cashierStatus.dayId) {
          localStorage.setItem("activeShift", JSON.stringify({ status: "open", dayId: cashierStatus.dayId, shiftId: res.data?.shiftId || 0 }));
        }
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
        await cashierLogService.closeDay({ dayId: cashierStatus.dayId, shiftId: cashierStatus.shiftId, closingBal: 0, endDate: isoString, denominations: [] });
        setPrintState({ type: "DAY", step: 1, dayId: cashierStatus.dayId, shiftId: cashierStatus.shiftId });
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
      const isoString  = now.toISOString();
      const denominations: any[] = entryMode === "DENOM" 
        ? Object.entries(counts).map(([id, count]) => ({
            denominationId: Number(id),
            cashCount: count
          }))
        : [];

      const payload = { dayId: cashierStatus.dayId, shiftId: cashierStatus.shiftId, closingBal: totalAmount, endDate: isoString, denominations };
      
      await cashierLogService.closeShift(payload);
      
      await cashierLogService.closeDay({ ...payload, closingBal: 0, denominations: [] });
      
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
          const data = await cashierLogService.getShiftEndReport(printState.dayId, printState.shiftId);
          const html = await generateEndReportHtml(data, 'SHIFTEND');
          const { printHtmlReceipt } = await import("../../../../services/qzService");
          let defaultPrinter: string | undefined = undefined;
          try {
            const pData = JSON.parse(localStorage.getItem("posPrinterData") || "{}");
            defaultPrinter = pData?.billPrinter !== "No Printer" ? pData.billPrinter : undefined;
          } catch(e){}
          await printHtmlReceipt(html, defaultPrinter);
          showToast("Printing Shift End...", "success");
          await new Promise(res => setTimeout(res, 3000));
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
          const data = await cashierLogService.getDayEndReport(printState.dayId);
          const html = await generateEndReportHtml(data, 'DAYEND');
          const { printHtmlReceipt } = await import("../../../../services/qzService");
          let defaultPrinter: string | undefined = undefined;
          try {
            const pData = JSON.parse(localStorage.getItem("posPrinterData") || "{}");
            defaultPrinter = pData?.billPrinter !== "No Printer" ? pData.billPrinter : undefined;
          } catch(e){}
          await printHtmlReceipt(html, defaultPrinter);
          showToast("Printing Day End...", "success");
          await new Promise(res => setTimeout(res, 3000));
        } catch (e: any) {
          showToast(e.message || "Failed to print Day End", "error");
        }
      }
      finishLogout("Business Day Closed Successfully. Logging out...");
    }
    setIsPrinting(false);
  };

  const renderDenominations = () => {
    if (mode === "CLOSE_DAY") {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
          <LogOut size={48} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700">Ready to Close Business Day</h3>
          <p className="text-sm mt-2">
            {cashierStatus?.isShiftClosed 
              ? "No cash counting required because the shift is already closed."
              : "Closing the day will also close your active shift."}
          </p>
        </div>
      );
    }

    if (entryMode === "MANUAL") {
      return (
        <div className="flex flex-col gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-slate-700">Enter Total Amount Manually</label>
            {denoms.length > 0 && (
              <button 
                onClick={() => setEntryMode("DENOM")}
                className="text-xs font-bold text-[#3b82f6] hover:underline"
              >
                Use Denominations
              </button>
            )}
          </div>
          <input
            ref={manualInputRef}
            type="number"
            className="w-full text-3xl font-black text-[#49293e] bg-white border-2 border-slate-200 rounded-xl p-4 outline-none focus:border-[#49293e] transition-colors"
            placeholder="0.000"
            value={manualAmount}
            onChange={(e) => setManualAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !submitting) {
                e.preventDefault();
                if (mode === "CLOSE_SHIFT") {
                  setShowLogoutConfirm(true);
                } else {
                  executeSubmit();
                }
              }
            }}
            onFocus={(e) => e.target.select()}
            autoFocus
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3 pb-2">
        <div className="flex justify-end">
          <button 
            onClick={() => setEntryMode("MANUAL")}
            className="text-xs font-bold text-[#3b82f6] hover:underline"
          >
            Enter Amount Manually
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {denoms.map(d => (
          <div key={d.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center gap-3">
            <span className="text-xl font-bold text-[#49293e]">{d.name}</span>
            <input
              type="number"
              min="0"
              className="w-full text-center text-2xl font-bold border-2 border-slate-200 rounded-lg p-3 outline-none focus:border-[#49293e] focus:bg-white bg-slate-50 transition-colors"
              value={counts[d.id ?? 0] || ""}
              onChange={(e) => handleCountChange(d.id ?? 0, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !submitting) {
                  e.preventDefault();
                  if (mode === "CLOSE_SHIFT") {
                    setShowLogoutConfirm(true);
                  } else {
                    executeSubmit();
                  }
                }
              }}
              placeholder="0"
            />
            <span className="text-base font-semibold text-slate-500">
              {formatAmount((counts[d.id ?? 0] || 0) * d.value)}
            </span>
          </div>
          ))}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal isOpen={isOpen} onClose={() => !submitting && onClose()} title={cfg?.label || "Session"} size="xl" noPadding>
        <div className="p-6 sm:p-8 bg-white  flex flex-col rounded-xl">
          {statusLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
              <p className="text-slate-500 font-medium">Loading session status...</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: cfg?.bgColor, color: cfg?.color }}>
                    {cfg?.icon}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-[#49293e]">{cfg?.label}</h2>
                    <p className="text-sm font-medium text-slate-500">
                      {mode === "CLOSE_DAY" 
                        ? "Confirm Day End" 
                        : "Count your cash to proceed."}
                    </p>
                  </div>
                </div>

                  {(!cashierStatus?.isDayClosed) && (
                    <div className="flex p-1 bg-slate-100 rounded-lg">
                      <button
                        onClick={() => setCloseTab("SHIFT")}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${closeTab === "SHIFT" ? "bg-white text-[#49293e] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        {cashierStatus?.isShiftClosed ? "Open Shift" : "Close Shift"}
                      </button>
                      <button
                        onClick={() => setCloseTab("DAY")}
                        className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${closeTab === "DAY" ? "bg-white text-[#49293e] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        Close Day
                      </button>
                    </div>
                  )}
              </div>

              <div className="flex-1 overflow-y-auto mb-6 pr-2 custom-scrollbar">
                {renderDenominations()}
              </div>

              <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                {mode !== "CLOSE_DAY" ? (
                  <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 w-full sm:w-auto">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{cfg?.balLabel}</p>
                      <p className="text-xl font-black text-[#49293e] leading-none">
                        {formatAmount(totalAmount)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1" />
                )}

                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    onClick={onClose}
                    disabled={submitting}
                    className="flex-1 sm:flex-none px-6 py-4 text-sm font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                      onClick={() => {
                        if (mode === "CLOSE_SHIFT" || mode === "CLOSE_DAY") {
                          setShowLogoutConfirm(true);
                        } else {
                          executeSubmit();
                        }
                      }}
                      disabled={submitting}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-4 text-sm font-bold text-white rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 active:scale-95"
                    style={{ backgroundColor: cfg?.color }}
                  >
                    {submitting ? <Loader2 size={18} className="animate-spin" /> : cfg?.buttonLabel}
                    {!submitting && <ArrowRight size={18} />}
                  </button>
                </div>
              </div>

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
    </>
  );
};
