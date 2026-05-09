import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LogIn, LogOut, Sun, Moon, Clock, Calculator, ChevronRight, Receipt, ArrowLeft, Trash2, Pencil, LayoutDashboard, History, Edit3, SkipForward, Play } from "lucide-react";
import { cashierLogService, type CashierInStatus } from "../services/cashierLogService";
import { payInOutService } from "../../payInOut/services/payInOutService";
import { paymodeService } from "../../../general/paymode/services/paymodeService";
import { fetchDenominations, DEFAULT_DENOMS } from "../../../general/denomination/services/denominationService";
import { ConfirmDialog } from "../../../../components/common";
import type { DenominationItem } from "../../../general/denomination/types";
import { useToast } from "../../../../app/providers/useToast";
import { useCurrency } from "../../../../hooks/useCurrency";

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
  const payDescRef = useRef<HTMLInputElement>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  const step = 1 / Math.pow(10, decimalPart);

  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"SESSION" | "TRANSACTIONS">(
    (location.state as any)?.activeTab || "SESSION"
  );
  
  // Pay In / Out State
  const [payType, setPayType] = useState<"IN" | "OUT">("IN");
  const [payAmount, setPayAmount] = useState("");
  const [payDesc, setPayDesc] = useState("");
  const [paymodeId, setPaymodeId] = useState<string>("");
  const [paymodes, setPaymodes] = useState<{ value: string; label: string }[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transLoading, setTransLoading] = useState(false);

  // Filters
  const [fFromDate, setFFromDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
  const [fToDate, setFToDate] = useState(new Date().toISOString().split("T")[0]);
  const [fDesc, setFDesc] = useState("");
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [selectedTransId, setSelectedTransId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Entry Mode Support
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
        const finalDenoms = denomData.length > 0 ? denomData : DEFAULT_DENOMS;
        setDenoms(finalDenoms);
        const init: Record<number, number> = {};
        finalDenoms.forEach((d: any) => { if (d.id) init[d.id] = 0; });
        setCounts(init);
      } catch (dErr) {
        setDenoms(DEFAULT_DENOMS);
        const init: Record<number, number> = {};
        DEFAULT_DENOMS.forEach((d: any) => { if (d.id) init[d.id] = 0; });
        setCounts(init);
      }

    } catch (err: any) {
      console.error("Cashier status error:", err);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const loadPayData = useCallback(async () => {
    try {
      const counterId = Number(localStorage.getItem("systemCounterId")) || 1;
      const pms = await paymodeService.listByCounter(counterId);
      setPaymodes(pms.map(p => ({ value: String(p.paymodeId), label: p.paymodeName })));
      if (pms.length > 0) setPaymodeId(String(pms[0].paymodeId));

      const tx = await payInOutService.list({ 
        fromDate: fFromDate + "T00:00:00Z", 
        toDate: fToDate + "T23:59:59Z",
        description: fDesc
      });
      setTransactions(tx.data || []);
    } catch (err) {
      console.error("Pay data load failed:", err);
    }
  }, [fFromDate, fToDate, fDesc]);

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
          const finalDenoms = data.length > 0 ? data : DEFAULT_DENOMS;
          setDenoms(finalDenoms);
          const init: Record<number, number> = {};
          finalDenoms.forEach(d => { if (d.id) init[d.id] = 0; });
          setCounts(init);
        })
        .finally(() => setStatusLoading(false));
    } else {
      void loadAll();
    }
    void loadPayData();
  }, [initialStatus, loadAll, loadPayData, onSessionReady]);

  // Autofocus logic
  useEffect(() => {
    if (activeTab === "SESSION") {
      if (entryMode === "DENOM" && denoms.length > 0) {
        setTimeout(() => firstDenoRef.current?.focus(), 100);
      } else if (entryMode === "MANUAL") {
        setTimeout(() => manualInputRef.current?.focus(), 100);
      }
    } else if (activeTab === "TRANSACTIONS") {
      setTimeout(() => payDescRef.current?.focus(), 100);
    }
  }, [activeTab, denoms.length, entryMode]);

  const handlePaySave = async () => {
    if (!payDesc || !payAmount || !cashierStatus) return;
    setTransLoading(true);
    try {
      if (editingId) {
        await payInOutService.update(editingId, {
          transId: editingId,
          inOut: payType,
          voucherDate: new Date().toISOString(),
          description: payDesc,
          amount: Number(payAmount),
          paymodeId: Number(paymodeId),
          updatedAt: new Date().toISOString()
        });
        showToast("Updated", "success");
      } else {
        await payInOutService.create({
          inOut: payType,
          voucherDate: new Date().toISOString(),
          description: payDesc,
          amount: Number(payAmount),
          paymodeId: Number(paymodeId),
          dayId: cashierStatus.dayId,
          shiftId: cashierStatus.shiftId,
          createdAt: new Date().toISOString()
        });
        showToast("Saved", "success");
      }
      
      setEditingId(null);
      setPayDesc("");
      setPayAmount("");
      setCounts(prev => Object.fromEntries(Object.keys(prev).map(k => [k, 0])));
      void loadPayData();
      // Refocus description for next entry
      setTimeout(() => payDescRef.current?.focus(), 100);
    } catch (err: any) {
      showToast(err.message || "Error", "error");
    } finally {
      setTransLoading(false);
    }
  };

  const handleEdit = (t: any) => {
    setEditingId(t.transId);
    setPayType(t.inOut);
    setPayDesc(t.description);
    setPayAmount(Number(t.amount).toFixed(decimalPart));
    // Find paymodeId if possible or just set it
    // Note: t.paymode is a string name, we might need to match it or check if t has paymodeId
    // Actually PayInOutItem from service has transId, sNo, inOut, vchNo, date, description, amount, paymode
    // But backend GET /api/pay-in-out/pay-in-out-list might not return paymodeId.
    // If not, we might need getById.
    void startEditing(t.transId);
  };

  const startEditing = async (id: number) => {
    setTransLoading(true);
    try {
      const resp = await payInOutService.getById(id);
      const d = resp.data;
      setEditingId(id);
      setPayType(d.inOut);
      setPayDesc(d.description);
      setPayAmount(Number(d.amount).toFixed(decimalPart));
      setPaymodeId(String(d.paymodeId));
      payDescRef.current?.focus();
    } catch (err) {
      showToast("Failed to load details", "error");
    } finally {
      setTransLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedTransId) return;
    setIsCancelConfirmOpen(false);
    setTransLoading(true);
    try {
      await payInOutService.cancel(selectedTransId);
      showToast("Transaction cancelled", "success");
      void loadPayData();
    } catch (err: any) {
      showToast(err.message || "Failed to cancel", "error");
    } finally {
      setTransLoading(false);
      setSelectedTransId(null);
    }
  };

  const openCancelConfirm = (transId: number) => {
    setSelectedTransId(transId);
    setIsCancelConfirmOpen(true);
  };

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
      const denominations: any[] = Object.entries(counts)
        .filter(([_, count]) => count > 0)
        .map(([id, count]) => ({
          denominationId: Number(id),
          cashCount: count
        }));

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
        await cashierLogService.closeShift({ dayId: cashierStatus.dayId, shiftId: cashierStatus.shiftId, closingBal: totalAmount, endDate: isoString, denominations });
        showToast("Shift Closed Successfully. Logging out...", "success");
        
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("activeShift");
        
        setTimeout(() => {
          window.location.href = "/cashier/in";
        }, 1500);

      } else if (mode === "CLOSE_DAY") {
        if (!cashierStatus.isShiftClosed) {
          throw new Error("Cannot close Business Day while a Shift is still active. Please close your Shift first.");
        }
        await cashierLogService.closeDay({ dayId: cashierStatus.dayId, shiftId: cashierStatus.shiftId, closingBal: totalAmount, endDate: isoString, denominations });
        showToast("Business Day Closed Successfully. Logging out...", "success");
        
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("activeShift");
        
        setTimeout(() => {
          window.location.href = "/cashier/in";
        }, 1500);
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

      {/* Top bar */}
      <div style={S.topBar}>
        <button onClick={() => navigate("/pos")} style={S.backBtn}>
          <ArrowLeft size={14} />
          Terminal
        </button>
        <div style={S.brandDot} />
        <h1 style={S.brandLabel}>Cashier Dashboard</h1>
        
        <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
          <div style={S.dashboardTabs}>
            <button 
              onClick={() => setActiveTab("SESSION")}
              style={{ ...S.dashboardTab, ...(activeTab === "SESSION" ? S.dashboardTabOn : S.dashboardTabOff) }}
            >
              <LayoutDashboard size={14} />
              Session
            </button>
            <button 
              onClick={() => setActiveTab("TRANSACTIONS")}
              style={{ ...S.dashboardTab, ...(activeTab === "TRANSACTIONS" ? S.dashboardTabOn : S.dashboardTabOff) }}
            >
              <History size={14} />
              Transactions
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px", borderLeft: "1px solid #e2e8f0", color: "#64748b" }}>
            <Clock size={14} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>
      </div>

      {activeTab === "SESSION" ? (
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
      ) : (
        /* Transactions Tab — Left sidebar + Right panel (matches Session tab style) */
        <div style={S.layout}>

          {/* ── Left Sidebar ── */}
          <div style={{ width: 340, flexShrink: 0, display: "flex", flexDirection: "column", gap: 12, background: "linear-gradient(165deg, #49293e 0%, #2d1a27 100%)", padding: "40px 32px", color: "#fff", overflowY: "auto", borderRight: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8 }}>Cash movement entry</p>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", margin: "0 0 12px", letterSpacing: "-0.02em" }}>Pay In / Out</h1>
              <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 16, padding: "16px 20px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginBottom: 6, letterSpacing: "0.05em" }}>Total Amount</p>
                <div style={{ fontSize: 32, fontWeight: 900, color: "#10b981", letterSpacing: "-0.04em" }}>{formatAmount(Number(payAmount) || 0)}</div>
              </div>
            </div>


            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 24, padding: "24px 20px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 12 }}>Transaction Form</p>
              
              {/* IN / OUT Toggle */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <button onClick={() => setPayType("IN")} style={{ padding: "10px 0", borderRadius: 12, border: payType === "IN" ? "none" : "1px solid rgba(255,255,255,0.1)", cursor: "pointer", fontSize: 12, fontWeight: 800, letterSpacing: "0.05em", transition: "all 0.15s", background: payType === "IN" ? "linear-gradient(135deg, #10b981, #059669)" : "rgba(255,255,255,0.05)", color: "#fff", boxShadow: payType === "IN" ? "0 4px 12px rgba(16,185,129,0.35)" : "none" }}>
                    ↑ IN
                  </button>
                  <button onClick={() => setPayType("OUT")} style={{ padding: "10px 0", borderRadius: 12, border: payType === "OUT" ? "none" : "1px solid rgba(255,255,255,0.1)", cursor: "pointer", fontSize: 12, fontWeight: 800, letterSpacing: "0.05em", transition: "all 0.15s", background: payType === "OUT" ? "linear-gradient(135deg, #ef4444, #dc2626)" : "rgba(255,255,255,0.05)", color: "#fff", boxShadow: payType === "OUT" ? "0 4px 12px rgba(239,68,68,0.35)" : "none" }}>
                    ↓ OUT
                  </button>
                </div>
              </div>

            {/* Description */}
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>Description <span style={{ color: "#f87171" }}>*</span></p>
              <input
                ref={payDescRef}
                placeholder="e.g. Petty cash, purchase..."
                value={payDesc}
                onChange={e => setPayDesc(e.target.value)}
                style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.95)", color: "#000", fontSize: 13, fontWeight: 700, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
              />
            </div>

            {/* Amount */}
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>Amount <span style={{ color: "#f87171" }}>*</span></p>
              <input
                type="number" step={step} placeholder="0.000"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                onBlur={() => setPayAmount(prev => prev ? Number(prev).toFixed(decimalPart) : "")}
                style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.95)", color: payType === "IN" ? "#059669" : "#dc2626", fontSize: 16, fontWeight: 800, outline: "none", textAlign: "right", boxSizing: "border-box" }}
              />
            </div>

            {/* Paymode */}
            <div>
              <p style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>Pay Mode</p>
              <select
                value={paymodeId}
                onChange={e => setPaymodeId(e.target.value)}
                style={{ width: "100%", padding: "12px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.95)", color: "#000", fontSize: 13, fontWeight: 700, outline: "none", boxSizing: "border-box", cursor: "pointer" }}
              >
                <option value="" disabled style={{ background: "#1e293b" }}>Select pay mode...</option>
                {paymodes.map(m => <option key={m.value} value={m.value} style={{ background: "#1e293b" }}>{m.label}</option>)}
              </select>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "2px 0" }} />

            {/* Submit */}
            <button
              onClick={handlePaySave}
              disabled={transLoading || !payDesc || !payAmount}
              style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", background: transLoading || !payDesc || !payAmount ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#fff", fontSize: 12, fontWeight: 800, cursor: transLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.2s", boxShadow: transLoading || !payDesc || !payAmount ? "none" : "0 4px 14px rgba(99,102,241,0.4)", letterSpacing: "0.03em" }}
            >
              {transLoading
                ? <span style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", display: "inline-block" }} />
                : <ChevronRight size={14} />}
              {transLoading ? "Saving..." : (editingId ? "Update Transaction" : "Record Transaction")}
            </button>

            {editingId && (
              <button
                onClick={() => { setEditingId(null); setPayDesc(""); setPayAmount(""); }}
                style={{ width: "100%", padding: "8px 0", borderRadius: 9, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </div>


          {/* ── Right Panel ── */}
          <div style={S.right}>
            <div style={{ maxWidth: 1100, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
              
              {/* Denomination Breakdown */}
              <div style={{ ...S.tableCard, flexShrink: 0, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.02)" }}>
                <div style={S.tableHead}>
                  <Calculator size={13} color="#94a3b8" />
                  <span style={S.tableHeadTxt}>Denomination Breakdown</span>
                </div>
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
                      const count = counts[d.id!] || 0;
                      const sub = count * d.value;
                      return (
                        <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                          <td style={S.td}>
                            <span style={S.dName}>{d.name}</span>
                            <span style={S.dSub}>{formatAmount(d.value)} each</span>
                          </td>
                          <td style={S.td}>
                            <input type="number" min="0" placeholder="0"
                              value={count === 0 ? "" : count}
                              onChange={e => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                const newCounts = { ...counts, [d.id!]: val };
                                setCounts(newCounts);
                                const total = denoms.reduce((sum, den) => sum + (newCounts[den.id!] || 0) * den.value, 0);
                                setPayAmount(total.toFixed(decimalPart));
                              }}
                              onFocus={e => e.target.select()}
                              style={S.input}
                            />
                          </td>
                          <td style={{ ...S.td, textAlign: "right" }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: sub > 0 ? "#49293e" : "#cbd5e1" }}>{formatAmount(sub)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#f8fafc", borderTop: "2px solid #e2e8f0" }}>
                      <td colSpan={2} style={{ ...S.td, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#94a3b8" }}>Total</td>
                      <td style={{ ...S.td, textAlign: "right" }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: "#49293e", letterSpacing: "-0.03em" }}>{formatAmount(Number(payAmount) || 0)}</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Recent Transactions */}
              <div style={{ ...S.tableCard, flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.02)" }}>
                <div style={{ ...S.tableHead, flexShrink: 0 }}>
                  <Receipt size={13} color="#94a3b8" />
                  <span style={S.tableHeadTxt}>Recent Transactions</span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="date" value={fFromDate} onChange={e => setFFromDate(e.target.value)} style={{ ...S.filterInput, borderRadius: 8 }} />
                    <input type="date" value={fToDate} onChange={e => setFToDate(e.target.value)} style={{ ...S.filterInput, borderRadius: 8 }} />
                    <input type="text" placeholder="Search..." value={fDesc} onChange={e => setFDesc(e.target.value)} style={{ ...S.filterInput, width: 120, borderRadius: 8 }} />
                    <button onClick={() => void loadPayData()} style={{ ...S.filterBtn, borderRadius: 8 }}>Filter</button>
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead style={{ position: "sticky", top: 0, zIndex: 10, background: "#f8fafc" }}>
                      <tr>
                        <th style={S.th}>#Vch</th>
                        <th style={S.th}>Type</th>
                        <th style={S.th}>Description</th>
                        <th style={S.th}>Date</th>
                        <th style={{ ...S.th, textAlign: "right" }}>Amount</th>
                        <th style={{ ...S.th, textAlign: "center", width: 70 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={S.empty}>No transactions recorded</td>
                        </tr>
                      ) : transactions.map((t, i) => (
                        <tr key={t.transId} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                          <td style={S.td}><span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", fontFamily: "monospace" }}>{t.vchNo || "—"}</span></td>
                          <td style={S.td}>
                            <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 20, background: t.inOut === "IN" ? "#d1fae5" : "#fee2e2", color: t.inOut === "IN" ? "#065f46" : "#991b1b" }}>{t.inOut}</span>
                          </td>
                          <td style={S.td}><span style={S.dName}>{t.description}</span></td>
                          <td style={S.td}><span style={{ fontSize: 11, color: "#64748b" }}>{new Date(t.date).toLocaleDateString()}</span></td>
                          <td style={{ ...S.td, textAlign: "right" }}>
                            <span style={{ fontWeight: 800, fontSize: 13, color: t.inOut === "IN" ? "#10b981" : "#ef4444" }}>{formatAmount(t.amount)}</span>
                          </td>
                          <td style={{ ...S.td, textAlign: "center" }}>
                            <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                              <button onClick={() => handleEdit(t)} title="Edit" style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Pencil size={12} /></button>
                              <button onClick={() => openCancelConfirm(t.transId)} title="Cancel" style={{ width: 28, height: 28, borderRadius: 8, border: "1px solid #fee2e2", background: "#fff", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Trash2 size={12} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}





      <ConfirmDialog 
        isOpen={isCancelConfirmOpen}
        title="Cancel Transaction"
        message="Are you sure you want to cancel this transaction? This action cannot be undone."
        confirmLabel="Yes, Cancel"
        cancelLabel="No, Keep it"
        onConfirm={handleCancel}
        onCancel={() => setIsCancelConfirmOpen(false)}
        confirmVariant="danger"
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
  
  dashboardTabs: { display: "flex", gap: 4, background: "#f1f5f9", padding: 4, borderRadius: 16 },
  dashboardTab: { display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 12, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em", transition: "all 0.1s" },
  dashboardTabOn: { background: "#fff", color: "#49293e", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  dashboardTabOff: { background: "transparent", color: "#94a3b8" },

  payForm: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 24, padding: 20, display: "flex", flexDirection: "column", gap: 12 },
  payTypeSelector: { display: "flex", gap: 8, marginBottom: 4 },
  payTypeBtn: { flex: 1, padding: "10px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 12, fontWeight: 800, cursor: "pointer", transition: "all 0.1s" },
  payTypeBtnIn: { background: "#10b981", color: "#fff", borderColor: "#10b981" },
  payTypeBtnOut: { background: "#ef4444", color: "#fff", borderColor: "#ef4444" },
  payInput: { width: "100%", padding: "12px", borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", textAlign: "right" },
  paySubmit: { padding: "14px", borderRadius: 16, border: "none", background: "#49293e", color: "#fff", fontWeight: 700, cursor: "pointer", marginTop: 8 },

  modeTab: { display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 12, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.1s" },
  modeTabOn: { background: "#49293e", color: "#fff" },
  modeTabOff: { background: "#e2e8f0", color: "#64748b" },

  backBtn: { display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 12, borderWidth: 1, borderStyle: "solid", borderColor: "#e2e8f0", background: "#fff", color: "#49293e", fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", marginRight: 12, transition: "all 0.1s" },
  
  filterLabel: { display: "block", fontSize: 9, fontWeight: 800, textTransform: "uppercase", color: "#94a3b8", marginBottom: 4, letterSpacing: "0.05em" },
  filterInput: { width: "100%", padding: "8px 12px", borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, outline: "none", background: "#fff" },
  filterBtn: { padding: "8px 20px", borderRadius: 12, border: "none", background: "#49293e", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.1s", boxShadow: "0 4px 12px rgba(73,41,62,0.2)" }
};

export default CashierSessionPage;