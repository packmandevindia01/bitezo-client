import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { LogIn, LogOut, Sun, Moon, Clock, Calculator, ChevronRight, AlertCircle, CheckCircle2, Receipt, ArrowLeft, Trash2, Pencil } from "lucide-react";
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
  const { formatAmount } = useCurrency();

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

  const decimalPart = Number(localStorage.getItem("decimalPart")) || 2;
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
        showToast("Transaction updated", "success");
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
        showToast("Transaction recorded", "success");
      }
      
      setEditingId(null);
      setPayDesc("");
      setPayAmount("");
      void loadPayData();
      // Refocus description for next entry
      setTimeout(() => payDescRef.current?.focus(), 100);
    } catch (err: any) {
      showToast(err.message || "Failed to save", "error");
    } finally {
      setTransLoading(false);
    }
  };

  const handleEdit = (t: any) => {
    setEditingId(t.transId);
    setPayType(t.inOut);
    setPayDesc(t.description);
    setPayAmount(String(t.amount));
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
      setPayAmount(String(d.amount));
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
      const denominations: any[] = [];

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
        showToast("Shift Closed Successfully", "success");
        setCounts(prev => Object.fromEntries(Object.keys(prev).map(k => [k, 0])));
        hasFetched.current = false; // Allow one more fetch after action
        void loadAll();

      } else if (mode === "CLOSE_DAY") {
        // Validation: Cannot close Day if Shift is still open
        if (!cashierStatus.isShiftClosed) {
          throw new Error("Cannot close Business Day while a Shift is still active. Please close your Shift first.");
        }
        await cashierLogService.closeDay({ dayId: cashierStatus.dayId, shiftId: cashierStatus.shiftId, closingBal: totalAmount, endDate: isoString, denominations });
        showToast("Business Day Closed Successfully. Logging out...", "success");
        
        // Clear session and redirect to login since the business day is over
        localStorage.removeItem("accessToken");
        localStorage.removeItem("activeShift");
        setTimeout(() => {
          window.location.href = "/cashier/in";
        }, 2000);
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
        {/* Back to POS Button (Always visible as an exit/skip path) */}
        <button 
          onClick={() => navigate("/pos")}
          style={S.backBtn}
          className="hover-btn"
        >
          <ArrowLeft size={16} />
          <span>Terminal</span>
        </button>
        
        <div style={S.brandDot} />
        <span style={S.brandLabel}>Cashier Dashboard</span>

        <div style={{ flex: 1 }} />
        
        {/* Navigation Tabs */}
        <div style={S.dashboardTabs}>
          <button 
            onClick={() => setActiveTab("SESSION")}
            style={{ ...S.dashboardTab, ...(activeTab === "SESSION" ? S.dashboardTabOn : S.dashboardTabOff) }}
          >
            <Calculator size={14} /> Session
          </button>
          <button 
            onClick={() => setActiveTab("TRANSACTIONS")}
            style={{ ...S.dashboardTab, ...(activeTab === "TRANSACTIONS" ? S.dashboardTabOn : S.dashboardTabOff) }}
          >
            <Receipt size={14} /> Transactions
          </button>
        </div>

        <div style={{ flex: 1 }} />
        <Clock size={13} color="#94a3b8" />
        <span style={{ color: "#94a3b8", fontSize: 12 }}>
          {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {activeTab === "SESSION" ? (
        <div style={S.layout}>
          {/* ... existing session layout ... */}
          <div style={S.left}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ ...S.modeIcon, background: cfg?.bgColor ?? "#f1f5f9" }}>
                <span style={{ color: cfg?.color ?? "#64748b" }}>{cfg?.icon}</span>
              </div>
              <h1 style={S.title}>{cfg?.label ?? "Cashier Session"}</h1>
              <p style={S.subtitle}>
                {isOpening ? "Enter your opening cash to begin the session." : "Count your closing cash before ending the session."}
              </p>
            </div>

            <div style={S.statusCard}>
              <Row label="Day Status"   value={<Badge text={cashierStatus?.isDayClosed   ? "Closed" : "Open"} green={!cashierStatus?.isDayClosed} />} />
              <div style={S.divider} />
              <Row label="Shift Status" value={<Badge text={cashierStatus?.isShiftClosed ? "Closed" : "Open"} green={!cashierStatus?.isShiftClosed} />} />
            </div>

            <div style={{ ...S.balCard, borderColor: cfg?.color ?? "#e2e8f0" }}>
              <p style={S.balLabel}>{cfg?.balLabel ?? "Balance"}</p>
              <p style={{ ...S.balAmount, color: cfg?.color ?? "#1e293b" }}>
                {formatAmount(totalAmount)}
              </p>
            </div>
          </div>

          <div style={S.right}>
            {/* Entry Mode Toggle */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button 
                onClick={() => setEntryMode("DENOM")}
                style={{ ...S.modeTab, ...(entryMode === "DENOM" ? S.modeTabOn : S.modeTabOff) }}
              >
                <Calculator size={13} /> Denominations
              </button>
              <button 
                onClick={() => setEntryMode("MANUAL")}
                style={{ ...S.modeTab, ...(entryMode === "MANUAL" ? S.modeTabOn : S.modeTabOff) }}
              >
                <Calculator size={13} /> Manual Amount
              </button>
            </div>

            {cashierStatus && !cashierStatus.isDayClosed && (
              <div style={S.tabs}>
                {(["SHIFT", "DAY"] as CloseTab[]).map(tab => {
                  if (tab === "SHIFT" && cashierStatus.isShiftClosed) return null;
                  return (
                    <button key={tab} onClick={() => setCloseTab(tab)}
                      className={closeTab !== tab ? "hover-btn" : ""}
                      style={{ ...S.tab, ...(closeTab === tab ? S.tabOn : S.tabOff) }}>
                      {tab === "SHIFT" ? <Moon size={13} /> : <LogOut size={13} />}
                      Close {tab === "SHIFT" ? "Shift" : "Day"}
                    </button>
                  );
                })}
              </div>
            )}

            <div style={S.tableCard}>
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
                      <td colSpan={2} style={{ ...S.td, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#94a3b8" }}>
                        Grand Total
                      </td>
                      <td style={{ ...S.td, textAlign: "right" }}>
                        <span style={{ fontSize: 20, fontWeight: 800, color: "#49293e", letterSpacing: "-0.03em" }}>
                          {formatAmount(totalAmount)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <div style={{ padding: 24, background: "#fff" }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", marginBottom: 8 }}>
                    Enter Total Amount
                  </label>
                  <input 
                    type="number"
                    ref={manualInputRef}
                    step={step}
                    placeholder="0.000"
                    value={manualAmount}
                    onChange={e => setManualAmount(e.target.value)}
                    onFocus={e => e.target.select()}
                    style={{ ...S.input, fontSize: 24, padding: "16px 20px", height: "auto" }}
                  />
                  <p style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>
                    Entering the amount manually will bypass the denomination breakdown for this session.
                  </p>
                </div>
              )}
            </div>

            <div style={S.actions}>
              {onSkip && isOpening && (
                <button onClick={handleSkip} style={S.skipBtn}>
                  <AlertCircle size={13} /> Skip for now
                </button>
              )}
              <button onClick={handleSubmit} disabled={submitting || !mode}
                className="submit-hover"
                style={{ ...S.submitBtn, background: submitting ? "#94a3b8" : (cfg?.color ?? "#49293e"), cursor: submitting ? "not-allowed" : "pointer", boxShadow: submitting ? "none" : `0 4px 14px ${cfg?.color ?? "#49293e"}40` }}>
                {submitting ? <span style={S.btnSpinner} /> : <span style={{ display: "flex" }}>{cfg?.icon}</span>}
                {submitting ? "Processing…" : (cfg?.buttonLabel ?? "Confirm")}
                {!submitting && <ChevronRight size={15} />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Transactions Tab Content */
        <div style={S.layout}>
          <div style={S.left}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ ...S.modeIcon, background: "#f1f5f9" }}>
                <span style={{ color: "#64748b" }}><Receipt size={20} /></span>
              </div>
              <h1 style={S.title}>Pay In / Out</h1>
              <p style={S.subtitle}>Record cash movements during your shift.</p>
            </div>
            
            <div style={S.payForm}>
              <div style={S.payTypeSelector}>
                <button onClick={() => setPayType("IN")} style={{ ...S.payTypeBtn, ...(payType === "IN" ? S.payTypeBtnIn : {}) }}>IN</button>
                <button onClick={() => setPayType("OUT")} style={{ ...S.payTypeBtn, ...(payType === "OUT" ? S.payTypeBtnOut : {}) }}>OUT</button>
              </div>
              <input 
                ref={payDescRef}
                placeholder="Description" 
                value={payDesc} 
                onChange={e => setPayDesc(e.target.value)} 
                style={{ ...S.payInput, textAlign: "left" }} 
              />
              <input 
                type="number" 
                placeholder="Amount" 
                step={step}
                value={payAmount} 
                onChange={e => setPayAmount(e.target.value)} 
                style={S.payInput} 
              />
              <select 
                value={paymodeId} 
                onChange={e => setPaymodeId(e.target.value)} 
                style={{ ...S.payInput, textAlign: "left" }}
              >
                {paymodes.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
               <button 
                onClick={handlePaySave} 
                disabled={transLoading}
                style={S.paySubmit}
              >
                {transLoading ? "Processing..." : (editingId ? "Update Transaction" : "Record Transaction")}
              </button>

              {editingId && (
                <button 
                  onClick={() => {
                    setEditingId(null);
                    setPayDesc("");
                    setPayAmount("");
                  }}
                  style={{ ...S.paySubmit, background: "#f1f5f9", color: "#64748b", marginTop: 4 }}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>

          <div style={S.right}>
            <div style={S.tableCard}>
              <div style={S.tableHead}>
                <Receipt size={13} color="#94a3b8" />
                <span style={S.tableHeadTxt}>Recent Transactions</span>
              </div>
              
              {/* Filter Bar */}
              <div style={{ padding: "12px 20px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9", display: "flex", gap: 12, alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={S.filterLabel}>From</label>
                  <input type="date" value={fFromDate} onChange={e => setFFromDate(e.target.value)} style={S.filterInput} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.filterLabel}>To</label>
                  <input type="date" value={fToDate} onChange={e => setFToDate(e.target.value)} style={S.filterInput} />
                </div>
                <div style={{ flex: 2 }}>
                  <label style={S.filterLabel}>Search Description</label>
                  <input type="text" placeholder="Search..." value={fDesc} onChange={e => setFDesc(e.target.value)} style={S.filterInput} />
                </div>
                <button onClick={() => void loadPayData()} style={S.filterBtn}>Filter</button>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={S.th}>#Vch</th>
                    <th style={S.th}>Type</th>
                    <th style={S.th}>Description</th>
                    <th style={{ ...S.th, textAlign: "right" }}>Amount</th>
                    <th style={{ ...S.th, textAlign: "center", width: 50 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr><td colSpan={5} style={S.empty}>No transactions recorded</td></tr>
                  ) : transactions.map((t, i) => (
                    <tr key={t.transId} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={S.td}>
                         <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>{t.vchNo || "—"}</span>
                      </td>
                      <td style={S.td}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: t.inOut === "IN" ? "#10b981" : "#ef4444" }}>{t.inOut}</span>
                      </td>
                      <td style={S.td}>
                        <span style={S.dName}>{t.description}</span>
                        <span style={S.dSub}>{new Date(t.date).toLocaleDateString()}</span>
                      </td>
                      <td style={{ ...S.td, textAlign: "right" }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{formatAmount(t.amount)}</span>
                      </td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                          <button 
                            onClick={() => handleEdit(t)}
                            style={{ border: "none", background: "none", color: "#94a3b8", cursor: "pointer", padding: 4 }}
                            className="hover-btn"
                            title="Edit Transaction"
                          >
                            <Pencil size={14} />
                          </button>
                          <button 
                            onClick={() => openCancelConfirm(t.transId)}
                            style={{ border: "none", background: "none", color: "#94a3b8", cursor: "pointer", padding: 4 }}
                            className="hover-btn"
                            title="Cancel Transaction"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px" }}>
    <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "#94a3b8" }}>{label}</span>
    {value}
  </div>
);

const Badge = ({ text, green }: { text: string; green: boolean }) => (
  <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, textTransform: "uppercase" as const, letterSpacing: "0.06em", background: green ? "#d1fae5" : "#fef3c7", color: green ? "#065f46" : "#92400e", display: "flex", alignItems: "center", gap: 4 }}>
    {green && <CheckCircle2 size={10} />}{text}
  </span>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page:       { minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  spinner:    { width: 36, height: 36, borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#49293e", animation: "spin 0.8s linear infinite", margin: "auto" },
  topBar:     { display: "flex", alignItems: "center", gap: 8, padding: "12px 32px", borderBottom: "1px solid #e2e8f0", background: "#fff" },
  brandDot:   { width: 8, height: 8, borderRadius: "50%", background: "#49293e" },
  brandLabel: { fontSize: 12, fontWeight: 800, color: "#49293e", letterSpacing: "0.08em", textTransform: "uppercase" },
  layout:     { display: "flex", flex: 1, gap: 48, maxWidth: 1080, margin: "0 auto", width: "100%", padding: "48px 32px", alignItems: "flex-start" },
  left:       { width: 272, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 },
  right:      { flex: 1, display: "flex", flexDirection: "column", gap: 20 },
  modeIcon:   { width: 46, height: 46, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  title:      { fontSize: 22, fontWeight: 800, color: "#1e293b", margin: "0 0 8px", letterSpacing: "-0.03em" },
  subtitle:   { fontSize: 13, color: "#64748b", margin: 0, lineHeight: 1.6 },
  statusCard: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" },
  divider:    { height: 1, background: "#f1f5f9", margin: "0 16px" },
  mono:       { fontSize: 13, fontWeight: 700, color: "#1e293b", fontFamily: "monospace" },
  balCard:    { background: "#fff", borderWidth: 2, borderStyle: "solid", borderColor: "#e2e8f0", borderRadius: 12, padding: "16px 20px" },
  balLabel:   { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#94a3b8", margin: "0 0 6px" },
  balAmount:  { fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: "-0.04em" },
  tabs:       { display: "flex", gap: 6, background: "#f1f5f9", padding: 4, borderRadius: 10 },
  tab:        { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 16px", borderRadius: 8, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.07em", transition: "all 0.15s" },
  tabOn:      { background: "#fff", color: "#49293e", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" },
  tabOff:     { background: "transparent", color: "#94a3b8" },
  tableCard:  { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" },
  tableHead:  { display: "flex", alignItems: "center", gap: 8, padding: "13px 20px", borderBottom: "1px solid #f1f5f9" },
  tableHeadTxt: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b" },
  th:         { padding: "10px 20px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", textAlign: "left", borderBottom: "1px solid #e2e8f0" },
  td:         { padding: "11px 20px", verticalAlign: "middle" },
  empty:      { padding: "28px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 },
  dName:      { display: "block", fontSize: 13, fontWeight: 600, color: "#1e293b" },
  dSub:       { display: "block", fontSize: 11, color: "#94a3b8", marginTop: 2 },
  input:      { width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, fontWeight: 700, color: "#1e293b", outline: "none", background: "#f8fafc", textAlign: "right", boxSizing: "border-box", transition: "border-color 0.15s" },
  actions:    { display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, paddingTop: 4 },
  skipBtn:    { display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#94a3b8", fontSize: 12, fontWeight: 600, cursor: "pointer" },
  submitBtn:  { display: "flex", alignItems: "center", gap: 8, padding: "12px 28px", borderRadius: 10, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, letterSpacing: "0.03em", transition: "all 0.15s" },
  btnSpinner: { width: 15, height: 15, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", display: "inline-block", animation: "spin 0.8s linear infinite" },
  
  dashboardTabs: { display: "flex", gap: 4, background: "#f1f5f9", padding: 4, borderRadius: 10 },
  dashboardTab: { display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em", transition: "all 0.1s" },
  dashboardTabOn: { background: "#fff", color: "#49293e", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  dashboardTabOff: { background: "transparent", color: "#94a3b8" },

  payForm: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 12 },
  payTypeSelector: { display: "flex", gap: 8, marginBottom: 4 },
  payTypeBtn: { flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", fontSize: 12, fontWeight: 800, cursor: "pointer", transition: "all 0.1s" },
  payTypeBtnIn: { background: "#10b981", color: "#fff", borderColor: "#10b981" },
  payTypeBtnOut: { background: "#ef4444", color: "#fff", borderColor: "#ef4444" },
  payInput: { width: "100%", padding: "12px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box", textAlign: "right" },
  paySubmit: { padding: "14px", borderRadius: 10, border: "none", background: "#49293e", color: "#fff", fontWeight: 700, cursor: "pointer", marginTop: 8 },

  modeTab: { display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, border: "none", fontSize: 11, fontWeight: 700, cursor: "pointer", transition: "all 0.1s" },
  modeTabOn: { background: "#49293e", color: "#fff" },
  modeTabOff: { background: "#e2e8f0", color: "#64748b" },

  backBtn: { display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, borderWidth: 1, borderStyle: "solid", borderColor: "#e2e8f0", background: "#fff", color: "#49293e", fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", marginRight: 12, transition: "all 0.1s" },
  
  filterLabel: { display: "block", fontSize: 9, fontWeight: 800, textTransform: "uppercase", color: "#94a3b8", marginBottom: 4, letterSpacing: "0.05em" },
  filterInput: { width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 12, outline: "none" },
  filterBtn: { padding: "7px 16px", borderRadius: 6, border: "none", background: "#49293e", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }
};

export default CashierSessionPage;