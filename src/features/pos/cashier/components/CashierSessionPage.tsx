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

  const step = 1 / Math.pow(10, decimalPart);

  const navigate = useNavigate();

  const [entryMode, setEntryMode] = useState<"DENOM" | "MANUAL">("DENOM");
  const [manualAmount, setManualAmount] = useState<string>("");

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
        // Set active shift if returned (Day Open usually opens a shift too)
        if (res.data?.shiftId) {
          localStorage.setItem("activeShift", JSON.stringify({ status: "open", dayId: res.data.dayId, shiftId: res.data.shiftId }));
        }
        showToast("Business Day Opened Successfully", "success");
        onSessionReady();

      } else if (mode === "OPEN_SHIFT") {
        const res = await cashierLogService.openShift({ dayId: cashierStatus.dayId, startDate: isoString, transDate: dateOnly, openingBal: totalAmount, denominations });
        // Mark shift as active
        if (res.data?.shiftId || cashierStatus.dayId) {
          localStorage.setItem("activeShift", JSON.stringify({ status: "open", dayId: cashierStatus.dayId, shiftId: res.data?.shiftId || 0 }));
        }
        showToast("Shift Opened Successfully", "success");
        onSessionReady();

      } else if (mode === "CLOSE_SHIFT") {
        const payload = { dayId: cashierStatus.dayId, shiftId: cashierStatus.shiftId, closingBal: totalAmount, endDate: isoString, denominations };
        console.log("--- CLOSE SHIFT PAYLOAD ---", JSON.stringify(payload, null, 2));
        await cashierLogService.closeShift(payload);
        
        setPrintState({ type: "SHIFT", step: 1, dayId: cashierStatus.dayId, shiftId: cashierStatus.shiftId });

      } else if (mode === "CLOSE_DAY") {
        if (!cashierStatus.isShiftClosed) {
          throw new Error("Cannot close Business Day while a Shift is still active. Please close your Shift first.");
        }
        await cashierLogService.closeDay({ dayId: cashierStatus.dayId, shiftId: cashierStatus.shiftId, closingBal: totalAmount, endDate: isoString, denominations });
        
        // Start from step 1 to prompt for Shift End first, then Day End
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

    if (printState.step === 1) {
      if (shouldPrint) {
        try {
          const data = await cashierLogService.getShiftEndReport(printState.dayId, printState.shiftId);
          const html = generateEndReportHtml(data, 'SHIFTEND');
          const { printHtmlReceipt } = await import("../../services/qzService");
          const defaultPrinter = localStorage.getItem("posPrinter") || undefined;
          await printHtmlReceipt(html, defaultPrinter);
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
          const data = await cashierLogService.getDayEndReport(printState.dayId);
          const html = generateEndReportHtml(data, 'DAYEND');
          const { printHtmlReceipt } = await import("../../services/qzService");
          const defaultPrinter = localStorage.getItem("posPrinter") || undefined;
          await printHtmlReceipt(html, defaultPrinter);
          showToast("Printing Day End...", "success");
        } catch (e: any) {
          showToast(e.message || "Failed to print Day End", "error");
        }
      }
      finishLogout("Business Day Closed Successfully. Logging out...");
    }
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
    <div style={S.page}>
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
        
        <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px", color: "#64748b" }}>
            <Clock size={14} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>
      </div>

      <div style={S.layout}>
          <div style={S.left}>
            <div style={{ marginBottom: 40 }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>Cashier Dashboard</p>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: "#fff", margin: "0 0 16px", letterSpacing: "-0.04em", lineHeight: 1.1 }}>{cfg?.label ?? "Session"}</h1>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.6 }}>
                {isOpening ? "This flow initializes your business day and shift. Count your opening cash to proceed." : "Count your closing cash before ending the session to reconcile your drawer."}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
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

            <div style={{ marginTop: "auto", paddingTop: 32 }}>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 16, border: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>System Context</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Branch</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>{localStorage.getItem("systemBranchName") || "MAIN"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>Terminal</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>{localStorage.getItem("systemCounterName") || "C01"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div style={S.right}>
            <div style={{ maxWidth: 1000, margin: "0 auto", width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", gap: 12, marginBottom: 24, justifyContent: "center" }}>
                <button onClick={() => setEntryMode("DENOM")} style={{ ...S.modeTab, padding: "10px 24px", ...(entryMode === "DENOM" ? S.modeTabOn : S.modeTabOff) }}>
                  <Calculator size={14} /> Denominations
                </button>
                <button onClick={() => setEntryMode("MANUAL")} style={{ ...S.modeTab, padding: "10px 24px", ...(entryMode === "MANUAL" ? S.modeTabOn : S.modeTabOff) }}>
                  <Edit3 size={14} /> Manual Amount
                </button>
              </div>

              {cashierStatus && !cashierStatus.isDayClosed && (
                <div style={{ ...S.tabs, maxWidth: 600, margin: "0 auto 24px", width: "100%" }}>
                  {(["SHIFT", "DAY"] as CloseTab[]).map(tab => {
                    if (tab === "SHIFT" && cashierStatus.isShiftClosed) return null;
                    return (
                      <button key={tab} onClick={() => setCloseTab(tab)}
                        style={{ ...S.tab, padding: "12px 16px", ...(closeTab === tab ? S.tabOn : S.tabOff) }}>
                        {tab === "SHIFT" ? <Moon size={14} /> : <LogOut size={14} />}
                        Close {tab === "SHIFT" ? "Shift" : "Day"}
                      </button>
                    );
                  })}
                </div>
              )}

              <div style={{ ...S.tableCard, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.02)" }}>
                <div style={S.tableHead}>
                  <Calculator size={13} color="#94a3b8" />
                  <span style={S.tableHeadTxt}>{entryMode === "DENOM" ? "Cash Breakdown" : "Total Cash Entry"}</span>
                </div>

                {entryMode === "DENOM" ? (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        <th style={S.th}>Denomination</th>
                        <th style={{ ...S.th, width: 130 }}>Count</th>
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
                                onFocus={e => e.target.select()}
                                style={S.input}
                              />
                            </td>
                            <td style={{ ...S.td, textAlign: "right" }}>
                              <span style={{ fontWeight: 700, fontSize: 13, color: sub > 0 ? "#49293e" : "#cbd5e1" }}>
                                {formatAmount(sub)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "#f8fafc", borderTop: "2px solid #e2e8f0" }}>
                        <td colSpan={2} style={{ ...S.td, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#94a3b8" }}>Grand Total</td>
                        <td style={{ ...S.td, textAlign: "right" }}>
                          <span style={{ fontSize: 24, fontWeight: 900, color: "#49293e", letterSpacing: "-0.04em" }}>{formatAmount(totalAmount)}</span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  <div style={{ padding: 40, background: "#fff", textAlign: "center" }}>
                    <p style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: 16, letterSpacing: "0.1em" }}>Enter Total Amount</p>
                    <input
                      type="number" ref={manualInputRef} step={step} placeholder="0.000"
                      value={manualAmount} 
                      onChange={e => setManualAmount(e.target.value)} 
                      onBlur={() => setManualAmount(prev => prev ? Number(prev).toFixed(decimalPart) : "")}
                      onFocus={e => e.target.select()}
                      style={{ ...S.input, fontSize: 36, padding: "24px", height: "auto", maxWidth: 400, margin: "0 auto", textAlign: "center", borderRadius: 20 }}
                    />
                    <p style={{ marginTop: 20, fontSize: 13, color: "#94a3b8", maxWidth: 500, margin: "20px auto 0", lineHeight: 1.6 }}>Entering the amount manually will bypass the denomination breakdown for this session.</p>
                  </div>
                )}
              </div>

              <div style={{ marginTop: "auto", paddingTop: 32, display: "flex", justifyContent: "flex-end", gap: 16 }}>
                {onSkip && isOpening && (
                  <button onClick={handleSkip} style={S.skipBtn}>
                    <SkipForward size={14} /> Skip for now
                  </button>
                )}
                <button
                  disabled={submitting}
                  onClick={() => void handleSubmit()}
                  style={{ 
                    ...S.submitBtn, 
                    background: `linear-gradient(135deg, ${closeTab === 'DAY' ? '#49293e' : '#3b82f6'}, ${closeTab === 'DAY' ? '#2d1a27' : '#2563eb'})`,
                    boxShadow: `0 8px 20px -4px ${closeTab === 'DAY' ? 'rgba(73,41,62,0.4)' : 'rgba(59,130,246,0.4)'}`,
                    minWidth: 240,
                    justifyContent: "center"
                  }}
                >
                  {submitting ? <span style={S.btnSpinner}></span> : (
                    <>
                      {isOpening ? <Play size={16} /> : (closeTab === "SHIFT" ? <Moon size={16} /> : <LogOut size={16} />)}
                      {isOpening ? `Open ${closeTab === "SHIFT" ? "Shift" : "Day"}` : `Confirm Close ${closeTab === "SHIFT" ? "Shift" : "Day"}`}
                      <ChevronRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
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
      />
      <ConfirmDialog
        isOpen={printState?.step === 2 && printState?.type === 'DAY'}
        title="Print Day End"
        message="Do you want to print Day End?"
        confirmLabel="Print"
        cancelLabel="Skip"
        onConfirm={() => handlePrintStep(true)}
        onCancel={() => handlePrintStep(false)}
      />
    </div>
  );
};

// ─── Small helpers ────────────────────────────────────────────────────────────

const StepCard = ({ step, label, value, active, isAmount }: { step: string; label: string; value: string; active: boolean; isAmount?: boolean }) => (
  <div style={{ 
    display: "flex", 
    alignItems: "center", 
    gap: 16, 
    padding: "16px 20px", 
    borderRadius: 24, 
    background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)", 
    border: `1px solid ${active ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)"}`,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
  }}>
    <div style={{ 
      width: 32, 
      height: 32, 
      borderRadius: 8, 
      background: active ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.05)", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      fontSize: 12,
      fontWeight: 900,
      color: active ? "#fff" : "rgba(255,255,255,0.3)"
    }}>
      {step}
    </div>
    <div style={{ flex: 1 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 2px" }}>{label}</p>
      <p style={{ fontSize: isAmount ? 18 : 14, fontWeight: 800, color: active ? "#fff" : "rgba(255,255,255,0.5)", margin: 0 }}>{value}</p>
    </div>
  </div>
);



// ─── Styles ───────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page:       { height: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc", overflow: "hidden", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  spinner:    { width: 36, height: 36, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#49293e", animation: "spin 0.8s linear infinite", margin: "auto" },
  topBar:     { height: 65, flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "0 32px", borderBottom: "1px solid #e2e8f0", background: "#fff" },
  brandDot:   { width: 8, height: 8, borderRadius: "50%", background: "#49293e" },
  brandLabel: { fontSize: 12, fontWeight: 800, color: "#49293e", letterSpacing: "0.08em", textTransform: "uppercase" },
  layout:     { display: "flex", flex: 1, background: "#f1f5f9", height: "calc(100vh - 65px)", overflow: "hidden", padding: 12, gap: 12 },
  left:       { width: 340, flexShrink: 0, display: "flex", flexDirection: "column", background: "linear-gradient(165deg, #49293e 0%, #2d1a27 100%)", padding: "40px 32px", color: "#fff", overflowY: "auto", borderRadius: 24, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" },
  right:      { flex: 1, display: "flex", flexDirection: "column", padding: "32px 40px", overflow: "hidden", background: "#fff", borderRadius: 24, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" },
  modeIcon:   { width: 46, height: 46, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title:      { fontSize: 22, fontWeight: 800, color: "#1e293b", margin: "0 0 8px", letterSpacing: "-0.03em" },
  subtitle:   { fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.6 },
  statusCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 24, overflow: "hidden" },
  divider:    { height: 1, background: "#f1f5f9", margin: "0 16px" },
  mono:       { fontSize: 13, fontWeight: 700, color: "#1e293b", fontFamily: "monospace" },
  balCard:    { background: "#fff", borderWidth: 2, borderStyle: "solid", borderColor: "#e2e8f0", borderRadius: 24, padding: "16px 20px" },
  balLabel:   { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", margin: "0 0 6px" },
  balAmount:  { fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: "-0.04em" },
  tabs:       { display: "flex", gap: 6, background: "#f1f5f9", padding: 4, borderRadius: 16 },
  tab:        { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 16px", borderRadius: 12, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.07em", transition: "all 0.15s" },
  tabOn:      { background: "#fff", color: "#49293e", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  tabOff:     { background: "transparent", color: "#94a3b8" },
  tableCard:  { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 24, overflow: "hidden" },
  tableHead:  { display: "flex", alignItems: "center", gap: 8, padding: "13px 20px", borderBottom: "1px solid #f1f5f9" },
  tableHeadTxt: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b" },
  th:         { padding: "10px 20px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", textAlign: "left", borderBottom: "1px solid #e2e8f0" },
  td:         { padding: "11px 20px", verticalAlign: "middle" },
  empty:      { padding: "28px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 },
  dName:      { display: "block", fontSize: 13, fontWeight: 600, color: "#1e293b" },
  dSub:       { display: "block", fontSize: 11, color: "#94a3b8", marginTop: 2 },
  input:      { width: "100%", padding: "8px 12px", borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 14, fontWeight: 700, color: "#1e293b", outline: "none", background: "#f8fafc", textAlign: "right", boxSizing: "border-box", transition: "border-color 0.15s" },
  actions:    { display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, paddingTop: 4 },
  skipBtn:    { display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#fff", color: "#94a3b8", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  submitBtn:  { display: "flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 16, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, letterSpacing: "0.03em", transition: "all 0.15s" },
  btnSpinner: { width: 15, height: 15, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", display: "inline-block", animation: "spin 0.8s linear infinite" },
  modeTab: { display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 12, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.1s" },
  modeTabOn: { background: "#49293e", color: "#fff" },
  modeTabOff: { background: "#e2e8f0", color: "#64748b" },

  backBtn: { display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 12, borderWidth: 1, borderStyle: "solid", borderColor: "#e2e8f0", background: "#fff", color: "#49293e", fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", marginRight: 12, transition: "all 0.1s" }
};

export default CashierSessionPage;