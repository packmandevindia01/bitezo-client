import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, LogOut, Sun, Moon, Clock, Calculator, ChevronRight, ArrowLeft, SkipForward, Play, Edit3 } from "lucide-react";
import { cashierLogService, type CashierInStatus } from "../services/cashierLogService";
import { fetchDenominations } from "../../../general/denomination/services/denominationService";
import { ConfirmDialog } from "../../../../components/common";
import type { DenominationItem } from "../../../general/denomination/types";
import { useToast } from "../../../../app/providers/useToast";
import { useCurrency } from "../../../../hooks/useCurrency";
import { generateEndReportHtml } from "../../utils/endReportTemplate";
import { TouchKeyboard } from "../../../../components/common/TouchKeyboard";

interface Props {
  onSessionReady: () => void;
  onSkip?: () => void;
  initialStatus?: CashierInStatus | null;
}

type Mode = "OPEN_DAY" | "OPEN_SHIFT" | "CLOSE_SHIFT" | "CLOSE_DAY";
type CloseTab = "SHIFT" | "DAY";

const MODE_CONFIG: Record<Mode, { label: string; buttonLabel: string; balLabel: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  OPEN_DAY:    { label: "Open Business Day",   buttonLabel: "Confirm & Open Day",    balLabel: "Opening Balance", color: "#10b981", bgColor: "#d1fae5", icon: <Sun size={20} /> },
  OPEN_SHIFT:  { label: "Open Shift",           buttonLabel: "Confirm & Open Shift",  balLabel: "Opening Balance", color: "#3b82f6", bgColor: "#dbeafe", icon: <LogIn size={20} /> },
  CLOSE_SHIFT: { label: "Close Shift",          buttonLabel: "Confirm Close Shift",   balLabel: "Closing Balance", color: "#3b82f6", bgColor: "#dbeafe", icon: <Moon size={20} /> },
  CLOSE_DAY:   { label: "Close Business Day",  buttonLabel: "Confirm Close Day",     balLabel: "Closing Balance", color: "#10b981", bgColor: "#d1fae5", icon: <LogOut size={20} /> },
};

const CashierSessionPage: React.FC<Props> = ({ onSessionReady, onSkip, initialStatus }) => {
  const { showToast } = useToast();
  const { formatAmount, decimalPart } = useCurrency();

  const [cashierStatus, setCashierStatus] = useState<CashierInStatus | null>(initialStatus ?? null);
  const [statusLoading, setStatusLoading] = useState(!initialStatus);
  const [denoms, setDenoms] = useState<DenominationItem[]>([]);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [closeTab, setCloseTab] = useState<CloseTab>("SHIFT");
  const hasFetched = useRef(false);
  const firstDenoRef = useRef<HTMLInputElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  const [printState, setPrintState] = useState<{ type: "SHIFT" | "DAY"; step: number; dayId: number; shiftId: number } | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const step = 1 / Math.pow(10, decimalPart);
  const navigate = useNavigate();

  const [entryMode, setEntryMode] = useState<"DENOM" | "MANUAL">("DENOM");
  const [manualAmount, setManualAmount] = useState<string>("");
  const [isKeyboardEnabled, setIsKeyboardEnabled] = useState(window.innerWidth >= 1024);
  const [showKeyboard, setShowKeyboard] = useState(window.innerWidth >= 1024);

  const mode: Mode | null = useMemo(() => {
    if (!cashierStatus) return null;
    if (cashierStatus.isDayClosed) return "OPEN_DAY";
    if (cashierStatus.isShiftClosed) {
      return closeTab === "DAY" ? "CLOSE_DAY" : "OPEN_SHIFT";
    }
    return closeTab === "SHIFT" ? "CLOSE_SHIFT" : "CLOSE_DAY";
  }, [cashierStatus, closeTab]);

  const cfg = mode ? MODE_CONFIG[mode] : null;
  const isOpening = mode === "OPEN_DAY" || mode === "OPEN_SHIFT";

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
      } else {
        localStorage.removeItem("activeShift");
      }

      // Load Denominations
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
    if (hasFetched.current) return;
    hasFetched.current = true;

    if (initialStatus) {
      if (!initialStatus.isDayClosed && !initialStatus.isShiftClosed) {
        onSessionReady();
        return;
      }
      setStatusLoading(true);
      fetchDenominations()
        .then(data => {
          const finalDenoms = data;
          setDenoms(finalDenoms);
          if (finalDenoms.length === 0) {
            setEntryMode("MANUAL");
          }
          const init: Record<number, number> = {};
          finalDenoms.forEach(d => { if (d.id) init[d.id] = 0; });
          setCounts(init);
        })
        .finally(() => setStatusLoading(false));
    } else {
      void loadAll();
    }
  }, [initialStatus, loadAll, onSessionReady]);

  // Autofocus logic
  useEffect(() => {
    if (entryMode === "DENOM" && denoms.length > 0) {
      setTimeout(() => firstDenoRef.current?.focus(), 100);
    } else if (entryMode === "MANUAL") {
      setTimeout(() => manualInputRef.current?.focus(), 100);
    }
  }, [denoms.length, entryMode]);

  const handleCountChange = (id: number, val: string) => {
    setCounts(prev => ({ ...prev, [id]: Math.max(0, parseInt(val) || 0) }));
  };

  const handleSubmit = async () => {
    if (!mode || !cashierStatus) return;
    setSubmitting(true);
    try {
      const userId    = Number(localStorage.getItem("userId"))            || cashierStatus.userId || 0;
      const branchId  = Number(localStorage.getItem("systemBranchId"))   || 0;

      if (!branchId || !userId) throw new Error("Missing Branch or User. Please re-login.");

      const now        = new Date();
      const isoString  = now.toISOString();
      const dateOnly   = isoString.split("T")[0] + "T00:00:00Z";
      const denominations: any[] = entryMode === "DENOM" 
        ? Object.entries(counts).map(([id, count]) => ({
            denominationId: Number(id),
            cashCount: count
          }))
        : [];

      if (mode === "OPEN_DAY") {
        const res = await cashierLogService.openDay({ startDate: isoString, transDate: dateOnly, openingBal: totalAmount, denominations });
        if (res.data?.shiftId) {
          localStorage.setItem("activeShift", JSON.stringify({ status: "open", dayId: res.data.dayId, shiftId: res.data.shiftId }));
        }
        showToast("Business Day Opened Successfully", "success");
        onSessionReady();

      } else if (mode === "OPEN_SHIFT") {
        const res = await cashierLogService.openShift({ dayId: cashierStatus.dayId, startDate: isoString, transDate: dateOnly, openingBal: totalAmount, denominations });
        if (res.data?.shiftId || cashierStatus.dayId) {
          localStorage.setItem("activeShift", JSON.stringify({ status: "open", dayId: cashierStatus.dayId, shiftId: res.data?.shiftId || 0 }));
        }
        showToast("Shift Opened Successfully", "success");
        onSessionReady();

      } else if (mode === "CLOSE_SHIFT") {
        const payload = { dayId: cashierStatus.dayId, shiftId: cashierStatus.shiftId, closingBal: totalAmount, endDate: isoString, denominations };
        await cashierLogService.closeShift(payload);
        setPrintState({ type: "SHIFT", step: 1, dayId: cashierStatus.dayId, shiftId: cashierStatus.shiftId });

      } else if (mode === "CLOSE_DAY") {
        if (!cashierStatus.isShiftClosed) {
          throw new Error("Cannot close Business Day while a Shift is still active. Please close your Shift first.");
        }
        await cashierLogService.closeDay({ dayId: cashierStatus.dayId, shiftId: cashierStatus.shiftId, closingBal: totalAmount, endDate: isoString, denominations });
        setPrintState({ type: "DAY", step: 1, dayId: cashierStatus.dayId, shiftId: cashierStatus.shiftId });
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        showToast("Session expired. Redirecting to login...", "error");
        setTimeout(() => window.location.href = '/', 2000);
      } else {
        showToast(err.message || "Action failed. Please try again.", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    showToast("Warning: No active session. Some POS features may be restricted.", "warning");
    onSkip?.();
  };

  const finishLogout = (msg: string) => {
    setPrintState(null);
    showToast(msg, "success");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("activeShift");
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
          const { printHtmlReceipt } = await import("../../services/qzService");
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
          const { printHtmlReceipt } = await import("../../services/qzService");
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

  if (statusLoading) {
    return (
      <div style={{ ...S.page, alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={S.spinner} />
          <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 16 }}>Loading session status…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page} className="mobile-page">
      <style>{`
        input:focus {
          border-color: #49293e !important;
          box-shadow: 0 0 0 3px rgba(73, 41, 62, 0.1) !important;
          outline: none !important;
          background: #fff !important;
        }
        input::placeholder {
          color: #94a3b8 !important;
          opacity: 1 !important;
        }
        .hover-btn:hover {
          background: #fff !important;
          color: #49293e !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
          transform: translateY(-1px);
        }
        .submit-hover:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

        /* Responsive Styles */
        @media (max-width: 850px) {
          .mobile-page {
            overflow-y: auto !important;
            height: 100dvh !important;
          }
          .mobile-layout {
            flex-direction: column !important;
            height: auto !important;
            overflow: visible !important;
            padding-bottom: 250px !important; /* space for fixed keyboard */
          }
          .mobile-left {
            width: 100% !important;
            flex-shrink: 0 !important;
            height: auto !important;
          }
          .mobile-right {
            overflow: visible !important;
            padding: 10px !important;
            box-shadow: none !important;
            background: transparent !important;
          }
          .mobile-scroll {
            overflow: visible !important;
          }
          .mobile-keyboard {
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            z-index: 100 !important;
            padding-bottom: env(safe-area-inset-bottom, 16px) !important;
            box-shadow: 0 -10px 30px rgba(0,0,0,0.1) !important;
          }
          .mobile-table-card {
            border: none !important;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05) !important;
          }
          .mobile-tabs {
            margin-bottom: 10px !important;
          }
        }
      `}</style>

      <div style={S.topBar}>
        {cashierStatus && !cashierStatus.isDayClosed && !cashierStatus.isShiftClosed && (
          <button onClick={() => navigate("/pos")} style={S.backBtn} tabIndex={-1}>
            <ArrowLeft size={14} />
            Terminal
          </button>
        )}
        <div style={S.brandDot} />
        <h1 style={S.brandLabel}>Cashier Dashboard</h1>
        
        <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
          <button 
            type="button"
            onClick={() => {
              const newVal = !isKeyboardEnabled;
              setIsKeyboardEnabled(newVal);
              setShowKeyboard(newVal);
            }}
            style={{
              display: "flex", alignItems: "center", gap: 8, fontSize: 10, fontWeight: 900, textTransform: "uppercase",
              padding: "6px 12px", borderRadius: 8, cursor: "pointer", transition: "all 0.1s",
              border: `1px solid ${isKeyboardEnabled ? "#e2e8f0" : "#49293e"}`,
              background: isKeyboardEnabled ? "#fff" : "#49293e",
              color: isKeyboardEnabled ? "#49293e" : "#fff"
            }}
            tabIndex={-1}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M11 19a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM19 9h-7.5a3 3 0 0 0-3 3v1h10.5a3 3 0 0 0 3-3V9ZM19 9h-7.5a3 3 0 0 0-3 3v1h10.5a3 3 0 0 0 3-3V9Z"/>
            </svg>
            {isKeyboardEnabled ? "Touch Keyboard" : "Native Keyboard"}
          </button>
          
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px", color: "#64748b" }}>
            <Clock size={14} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>
      </div>

      <div style={S.layout} className="mobile-layout">
          <div style={S.left} className="mobile-left">
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 8, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6 }}>Cashier Dashboard</p>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: "#fff", margin: "0 0 8px", letterSpacing: "-0.04em", lineHeight: 1.1 }}>{cfg?.label ?? "Session"}</h1>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.5 }}>
                {isOpening ? "This flow initializes your business day and shift. Count your opening cash to proceed." : "Count your closing cash before ending the session to reconcile your drawer."}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <StepCard 
                step="1" 
                label="Day Status" 
                value={cashierStatus?.isDayClosed ? "Closed" : "Open"} 
                active={!cashierStatus?.isDayClosed} 
              />
              <StepCard 
                step="2" 
                label="Shift Status" 
                value={cashierStatus?.isShiftClosed ? "Closed" : "Open"} 
                active={!cashierStatus?.isShiftClosed} 
              />
              <StepCard 
                step="3" 
                label={cfg?.balLabel ?? "Balance"} 
                value={formatAmount(totalAmount)} 
                active={totalAmount > 0} 
                isAmount 
              />
            </div>

            <div style={{ marginTop: "auto", paddingTop: 16 }}>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: 12, border: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontSize: 8, fontWeight: 800, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>System Context</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Branch</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>{localStorage.getItem("systemBranchName") || "MAIN"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Terminal</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>{localStorage.getItem("systemCounterName") || "C01"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={S.right} className="mobile-right">
            <div className="mobile-scroll" style={{ maxWidth: 800, margin: "0 auto", width: "100%", flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", paddingRight: 4 }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 16, justifyContent: "center" }}>
                <button onClick={() => setEntryMode("DENOM")} style={{ ...S.modeTab, padding: "6px 16px", ...(entryMode === "DENOM" ? S.modeTabOn : S.modeTabOff) }}>
                  <Calculator size={13} /> Denominations
                </button>
                <button onClick={() => setEntryMode("MANUAL")} style={{ ...S.modeTab, padding: "6px 16px", ...(entryMode === "MANUAL" ? S.modeTabOn : S.modeTabOff) }}>
                  <Edit3 size={13} /> Manual Amount
                </button>
              </div>

              {cashierStatus && !cashierStatus.isDayClosed && (
                <div className="mobile-tabs" style={{ ...S.tabs, maxWidth: 400, margin: "0 auto 16px", width: "100%" }}>
                  {(["SHIFT", "DAY"] as CloseTab[]).map(tab => {
                    if (tab === "SHIFT" && cashierStatus.isShiftClosed) return null;
                    return (
                      <button key={tab} onClick={() => setCloseTab(tab)}
                        style={{ ...S.tab, padding: "8px 10px", ...(closeTab === tab ? S.tabOn : S.tabOff) }}>
                        {tab === "SHIFT" ? <Moon size={12} /> : <LogOut size={12} />}
                        Close {tab === "SHIFT" ? "Shift" : "Day"}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="mobile-table-card" style={{ ...S.tableCard, boxShadow: "0 6px 15px -4px rgba(0,0,0,0.02)" }}>
                <div style={S.tableHead}>
                  <Calculator size={12} color="#94a3b8" />
                  <span style={S.tableHeadTxt}>{entryMode === "DENOM" ? "Cash Breakdown" : "Total Cash Entry"}</span>
                </div>

                {entryMode === "DENOM" ? (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        <th style={S.th}>Denomination</th>
                        <th style={{ ...S.th, width: 100 }}>Count</th>
                        <th style={{ ...S.th, textAlign: "right" }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {denoms.length === 0 ? (
                        <tr><td colSpan={3} style={S.empty}>No denominations configured</td></tr>
                      ) : denoms.map((d, i) => {
                        const count = counts[d.id ?? 0] ?? 0;
                        const sub   = count * d.value;
                        return (
                          <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                            <td style={S.td}>
                              <span style={S.dName}>{d.name}</span>
                              <span style={S.dSub}>{formatAmount(d.value)} each</span>
                            </td>
                            <td style={S.td}>
                              <input type="number" min="0" placeholder="0"
                                ref={i === 0 ? firstDenoRef : null}
                                value={count === 0 ? "" : count}
                                onChange={e => handleCountChange(d.id!, e.target.value)}
                                onFocus={e => { e.target.select(); if(isKeyboardEnabled) setShowKeyboard(true); }}
                                style={S.input}
                                inputMode={isKeyboardEnabled ? "none" : undefined}
                                readOnly={isKeyboardEnabled}
                              />
                            </td>
                            <td style={{ ...S.td, textAlign: "right" }}>
                              <span style={{ fontWeight: 700, fontSize: 12, color: sub > 0 ? "#49293e" : "#cbd5e1" }}>
                                {formatAmount(sub)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "#f8fafc", borderTop: "2px solid #e2e8f0" }}>
                        <td colSpan={2} style={{ ...S.td, fontSize: 10, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#94a3b8" }}>Grand Total</td>
                        <td style={{ ...S.td, textAlign: "right" }}>
                          <span style={{ fontSize: 18, fontWeight: 900, color: "#49293e", letterSpacing: "-0.04em" }}>{formatAmount(totalAmount)}</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <div style={{ padding: 20, background: "#fff", textAlign: "center" }}>
                    <p style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: 12, letterSpacing: "0.1em" }}>Enter Total Amount</p>
                    <input
                      type="number" ref={manualInputRef} step={step} placeholder="0.000"
                      value={manualAmount} 
                      onChange={e => setManualAmount(e.target.value)} 
                      onBlur={() => setManualAmount(prev => prev ? Number(prev).toFixed(decimalPart) : "")}
                      onFocus={e => { e.target.select(); if(isKeyboardEnabled) setShowKeyboard(true); }}
                      style={{ ...S.input, fontSize: 24, padding: "14px", height: "auto", maxWidth: 280, margin: "0 auto", textAlign: "center", borderRadius: 12 }}
                      inputMode={isKeyboardEnabled ? "none" : undefined}
                      readOnly={isKeyboardEnabled}
                    />
                    <p style={{ marginTop: 12, fontSize: 11, color: "#94a3b8", maxWidth: 360, margin: "12px auto 0", lineHeight: 1.5 }}>Entering the amount manually will bypass the denomination breakdown for this session.</p>
                  </div>
                )}

                <div style={{ padding: "16px 20px", display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid #e2e8f0", background: "#f8fafc" }}>
                  {onSkip && isOpening && (
                    <button onClick={handleSkip} style={S.skipBtn}>
                      <SkipForward size={12} /> Skip for now
                    </button>
                  )}
                  <button
                    disabled={submitting}
                    onClick={() => void handleSubmit()}
                    style={{ 
                      ...S.submitBtn, 
                      background: `linear-gradient(135deg, ${closeTab === 'DAY' ? '#49293e' : '#3b82f6'}, ${closeTab === 'DAY' ? '#2d1a27' : '#2563eb'})`,
                      boxShadow: `0 6px 15px -4px ${closeTab === 'DAY' ? 'rgba(73,41,62,0.4)' : 'rgba(59,130,246,0.4)'}`,
                      minWidth: 160,
                      justifyContent: "center"
                    }}
                  >
                    {submitting ? <span style={S.btnSpinner}></span> : (
                      <>
                        {isOpening ? <Play size={14} /> : (closeTab === "SHIFT" ? <Moon size={14} /> : <LogOut size={14} />)}
                        {isOpening ? `Open ${closeTab === "SHIFT" ? "Shift" : "Day"}` : `Confirm Close ${closeTab === "SHIFT" ? "Shift" : "Day"}`}
                        <ChevronRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Touch Keyboard Section */}
            {(showKeyboard && isKeyboardEnabled) && (
              <div className="mobile-keyboard" style={{ flexShrink: 0, width: "100%", background: "#f8f9fa", borderTop: "1px solid #e2e8f0", padding: "8px", zIndex: 50 }}>
                <div style={{ width: "100%", maxWidth: 350, margin: "0 auto", background: "linear-gradient(to bottom, #faf8f9, #f3edf0)", border: "1px solid #cbd5e1", borderRadius: "16px", padding: "8px", boxShadow: "0 10px 30px rgba(73,41,62,0.06)" }}>
                  <TouchKeyboard 
                    onClose={() => setShowKeyboard(false)} 
                    size="md"
                    embedded={true}
                    layout="numeric"
                    disableLayoutSwitch={true}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

      {/* Print Confirmations */}
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
    </div>
  );
};

// ─── Small helpers ────────────────────────────────────────────────────────────

const StepCard = ({ step, label, value, active, isAmount }: { step: string; label: string; value: string; active: boolean; isAmount?: boolean }) => (
  <div style={{ 
    display: "flex", 
    alignItems: "center", 
    gap: 10, 
    padding: "8px 12px", 
    borderRadius: 14, 
    background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)", 
    border: `1px solid ${active ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)"}`,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
  }}>
    <div style={{ 
      width: 24, 
      height: 24, 
      borderRadius: 6, 
      background: active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      fontSize: 10,
      fontWeight: 900,
      color: active ? "#fff" : "rgba(255,255,255,0.3)"
    }}>
      {step}
    </div>
    <div style={{ flex: 1 }}>
      <p style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 2px" }}>{label}</p>
      <p style={{ fontSize: isAmount ? 14 : 11, fontWeight: 800, color: active ? "#fff" : "rgba(255,255,255,0.5)", margin: 0 }}>{value}</p>
    </div>
  </div>
);



// ─── Styles ───────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page:       { height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", overflow: "hidden", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  spinner:    { width: 32, height: 32, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#49293e", animation: "spin 0.8s linear infinite", margin: "auto" },
  topBar:     { height: 50, flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "0 20px", borderBottom: "1px solid #e2e8f0", background: "#fff" },
  brandDot:   { width: 6, height: 6, borderRadius: "50%", background: "#49293e" },
  brandLabel: { fontSize: 11, fontWeight: 800, color: "#49293e", letterSpacing: "0.08em", textTransform: "uppercase" },
  layout:     { display: "flex", flex: 1, background: "#f1f5f9", height: "calc(100vh - 50px)", overflow: "hidden", padding: 10, gap: 10 },
  left:       { width: 250, flexShrink: 0, display: "flex", flexDirection: "column", background: "linear-gradient(165deg, #49293e 0%, #2d1a27 100%)", padding: "20px 16px", color: "#fff", overflowY: "auto", borderRadius: 16, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" },
  right:      { flex: 1, display: "flex", flexDirection: "column", padding: "16px 20px", overflow: "hidden", background: "#fff", borderRadius: 16, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" },
  modeIcon:   { width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  title:      { fontSize: 18, fontWeight: 800, color: "#1e293b", margin: "0 0 6px", letterSpacing: "-0.03em" },
  subtitle:   { fontSize: 11, color: "#64748b", margin: 0, lineHeight: 1.5 },
  statusCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden" },
  divider:    { height: 1, background: "#f1f5f9", margin: "0 12px" },
  mono:       { fontSize: 11, fontWeight: 700, color: "#1e293b", fontFamily: "monospace" },
  balCard:    { background: "#fff", borderWidth: 2, borderStyle: "solid", borderColor: "#e2e8f0", borderRadius: 16, padding: "10px 14px" },
  balLabel:   { fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", margin: "0 0 4px" },
  balAmount:  { fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: "-0.04em" },
  tabs:       { display: "flex", gap: 4, background: "#f1f5f9", padding: 4, borderRadius: 12 },
  tab:        { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "6px 10px", borderRadius: 8, border: "none", fontSize: 10, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.07em", transition: "all 0.15s" },
  tabOn:      { background: "#fff", color: "#49293e", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  tabOff:     { background: "transparent", color: "#94a3b8" },
  tableCard:  { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, overflow: "hidden" },
  tableHead:  { display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderBottom: "1px solid #f1f5f9" },
  tableHeadTxt: { fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b" },
  th:         { padding: "6px 12px", fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", textAlign: "left", borderBottom: "1px solid #e2e8f0" },
  td:         { padding: "6px 12px", verticalAlign: "middle" },
  empty:      { padding: "16px", textAlign: "center", color: "#94a3b8", fontSize: 11 },
  dName:      { display: "block", fontSize: 11, fontWeight: 600, color: "#1e293b" },
  dSub:       { display: "block", fontSize: 9, color: "#94a3b8", marginTop: 2 },
  input:      { width: "100%", padding: "6px 8px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12, fontWeight: 700, color: "#1e293b", outline: "none", background: "#f8fafc", textAlign: "right", boxSizing: "border-box", transition: "border-color 0.15s" },
  actions:    { display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, paddingTop: 4 },
  skipBtn:    { display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#94a3b8", fontSize: 10, fontWeight: 600, cursor: "pointer" },
  submitBtn:  { display: "flex", alignItems: "center", gap: 6, padding: "8px 20px", borderRadius: 10, border: "none", color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em", transition: "all 0.15s" },
  btnSpinner: { width: 12, height: 12, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", display: "inline-block", animation: "spin 0.8s linear infinite" },
  modeTab: { display: "flex", alignItems: "center", gap: 4, padding: "6px 14px", borderRadius: 8, border: "none", fontSize: 10, fontWeight: 700, cursor: "pointer", transition: "all 0.1s" },
  modeTabOn: { background: "#49293e", color: "#fff" },
  modeTabOff: { background: "#e2e8f0", color: "#64748b" },

  backBtn: { display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 8, borderWidth: 1, borderStyle: "solid", borderColor: "#e2e8f0", background: "#fff", color: "#49293e", fontSize: 9, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", marginRight: 10, transition: "all 0.1s" }
};

export default CashierSessionPage;