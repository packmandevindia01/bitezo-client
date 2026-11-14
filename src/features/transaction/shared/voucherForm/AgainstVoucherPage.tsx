import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFieldArray } from "react-hook-form";
import { Save, RotateCcw, Trash2, X, Plus, Printer } from "lucide-react";

import { PageShell, Button, FormInput, SearchableSelect } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import { useToast } from "../../../../app/providers/useToast";
import type { InvoiceRecord } from "../components/MultiInvoiceSelectionModal";
import { MultiInvoiceSelectionModal } from "../components/MultiInvoiceSelectionModal";
import { BackofficeMultiPayModal } from "../components/BackofficeMultiPayModal";
import { VoucherPrintPreviewModal } from "../components/VoucherPrintPreviewModal";
import type { VoucherPrintData } from "../components/VoucherPrintTemplate";
import { useCurrency } from "../../../../hooks/useCurrency";
import { getDecimalPart } from "../../../../utils/currency";
import { numberToWords } from "../../../../utils/numberToWords";
import { formatDateOnly } from "../purchaseDocument";
import { toLocalDateString } from "../../../../utils/date";
import type { useAgainstVoucherForm } from "../useAgainstVoucherForm";
import type { createAgainstVoucherApi } from "../againstVoucherApi";
import { useAppSelector } from "../../../../app/hooks";
import { selectActiveBranchId } from "../../../auth/store/authSlice";
import { useBranchScope } from "../../../../hooks/useBranchScope";

export type AgainstVoucherKind = "payment" | "receipt";

const AGAINST_KIND = {
  payment: { prefix: "pav", title: "Payment Against Voucher", listPath: "/dashboard/payment-against-voucher", party: "Supplier", partyId: "supplier", againstVerb: "pay against", totalLabel: "Payment", printType: "PAYMENT AGAINST", cashName: "CASH PAYMENT", invoiceType: "PAYMENT" },
  receipt: { prefix: "rav", title: "Receipt Against Voucher", listPath: "/dashboard/receipt-against-voucher", party: "Customer", partyId: "customer", againstVerb: "receive against", totalLabel: "Receipt", printType: "RECEIPT AGAINST", cashName: "CASH RECEIPT", invoiceType: "RECEIPT" },
} as const;

/** Receipt: pending invoices may come with other field names; read them all into one shape. */
const normalizePendingInvoice = (inv: any) => {
  const invoiceId = Number(inv.invoiceId ?? inv.InvoiceId ?? inv.id ?? inv.Id ?? 0);
  const invoiceNo = String(inv.invoiceNo || inv.InvoiceNo || inv.vchNo || inv.VchNo || inv.voucherNo || inv.VoucherNo || inv.invNo || inv.InvNo || (invoiceId ? `INV #${invoiceId}` : "")).trim();
  const voucherType = String(inv.voucherType || inv.VoucherType || inv.vchType || inv.VchType || "").trim();
  const invoiceDate = String(inv.invoiceDate || inv.InvoiceDate || inv.date || "").split("T")[0];
  const invoiceAmount = Number(inv.invoiceAmount ?? inv.InvoiceAmount ?? inv.invAmnt ?? inv.amount ?? 0);
  const balance = Number(inv.balance ?? inv.Balance ?? (invoiceAmount - Number(inv.paid || 0)));
  return {
    ...inv,
    invoiceId,
    invoiceNo,
    voucherType,
    invoiceDate,
    invoiceAmount,
    balance,
  };
};

interface AgainstVoucherPageProps {
  kind: AgainstVoucherKind;
  transId?: number;
  doc: ReturnType<typeof useAgainstVoucherForm>;
  api: ReturnType<typeof createAgainstVoucherApi>;
}

/**
 * Payment Against Voucher and Receipt Against Voucher page (2026-11-13; the two pages were copies). Differences kept:
 * Supplier / Customer wording; Receipt reads pending invoices with any of the field names the server may send, shows
 * "-" for a missing invoice type or date and prints the invoice date as stored; Payment formats the dates and shows a
 * save error's own message first.
 */
export const AgainstVoucherPage = ({ kind, transId, doc, api }: AgainstVoucherPageProps) => {
  const cfg = AGAINST_KIND[kind];
  const p = cfg.prefix;
  const isReceipt = kind === "receipt";
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const { showToast } = useToast();
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const fallbackBranch = useAppSelector(selectActiveBranchId) || 0;
  const branchId = isBranchLocked ? initialBranchId : fallbackBranch;

  const { 
    form, 
    masterData, 
    employeeList,
    accounts, 
    pendingInvoices,
    paymodeList,
    branchList,
    isLoading, 
    isSaving, 
    saveMutation,
    savedAt
  } = doc;
  
  const handleBranchChange = (val: string) => {
    const newBranchId = Number(val);
    if (newBranchId === Number(form.getValues("branchId"))) return;
    form.setValue("branchId", newBranchId, { shouldValidate: true });
    form.setValue("seriesId", 0);
    form.setValue("vchNo", "");
    remove();
    setManualItem({
      invoiceId: 0,
      voucherType: "",
      invoiceNo: "",
      invoiceAmount: "",
      paid: "",
      balance: "",
      amount: "",
    });
  };
  
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "details"
  });

  const availablePendingInvoices = useMemo(() => {
    if (isReceipt) {
      return (pendingInvoices || [])
        .map(normalizePendingInvoice)
        .filter((inv: any) => !fields.some((f: any) => Number(f.invoiceId) === Number(inv.invoiceId)));
    }
    return pendingInvoices?.filter((inv: any) => !fields.some((f: any) => f.invoiceId === inv.invoiceId)) || [];
  }, [pendingInvoices, fields, isReceipt]);

  /** Receipt: a line without its invoice number takes it from the pending invoices. */
  const getInvoiceNo = (item: any) => {
    if (item.invoiceNo) return item.invoiceNo;
    const found = (pendingInvoices || []).find((pi: any) =>
      Number(pi.invoiceId ?? pi.InvoiceId ?? pi.id ?? pi.Id) === Number(item.invoiceId)
    );
    if (found) {
      return found.invoiceNo || found.InvoiceNo || found.vchNo || found.VchNo || found.voucherNo || found.VoucherNo || found.invNo || found.InvNo || "";
    }
    return item.invoiceId ? `INV #${item.invoiceId}` : "-";
  };

  const [isMultiPayOpen, setIsMultiPayOpen] = useState(false);
  const [isMultiPaymodeOpen, setIsMultiPaymodeOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  const [manualItem, setManualItem] = useState<{
    invoiceId?: number;
    voucherType: string;
    invoiceNo: string;
    invoiceAmount: string;
    paid: string;
    balance: string;
    amount: string;
  }>({
    invoiceId: 0,
    voucherType: "",
    invoiceNo: "",
    invoiceAmount: "",
    paid: "",
    balance: "",
    amount: "",
  });

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent, nextId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextId) {
        const el = document.getElementById(nextId);
        if (el) {
          el.focus();
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            el.select?.();
          }
        }
      }
    }
  };

  const setManualField = (key: string, value: string) => {
    if (key === "amount" || key === "invoiceAmount" || key === "paid" || key === "balance") {
      if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;
    }
    setManualItem(prev => ({ ...prev, [key]: value }));
  };

  const handleManualAdd = () => {
    if (!manualItem.invoiceId) {
      showToast("Please select a valid Invoice No from the dropdown.", "error", "Validation Error");
      return;
    }
    if (!manualItem.amount || Number(manualItem.amount) <= 0) {
      showToast("Please enter a valid Amount.", "error", "Validation Error");
      return;
    }
    if (fields.some(f => f.invoiceId === manualItem.invoiceId)) {
      showToast("This invoice has already been added.", "error", "Validation Error");
      return;
    }
    if (Number(manualItem.amount) > Number(manualItem.balance)) {
      showToast("Amount cannot exceed the balance.", "error", "Validation Error");
      return;
    }
    
    append({
      invoiceId: manualItem.invoiceId || 0,
      voucherType: manualItem.voucherType,
      invoiceNo: manualItem.invoiceNo,
      invoiceDate: isReceipt ? toLocalDateString() : formatDateOnly(new Date()),
      invoiceAmount: Number(manualItem.invoiceAmount) || 0,
      balance: Number(manualItem.balance) || 0,
      amount: Number(manualItem.amount).toFixed(getDecimalPart()),
    });
    
    setManualItem({
      invoiceId: 0,
      voucherType: "",
      invoiceNo: "",
      invoiceAmount: "",
      paid: "",
      balance: "",
      amount: "",
    });
    document.getElementById(`${p}-manual-vchNo`)?.focus();
  };

  const handleReset = () => {
    form.reset({
      ...form.getValues(),
      accountId: 0,
      paymodeId: 0,
      voucherDate: formatDateOnly(new Date()),
      discount: 0,
      refNo: "",
      narration: "",
      details: [],
      paymodes: [],
    });
    remove(); // Explicitly remove all items from useFieldArray
    
    setManualItem({
      invoiceId: 0,
      voucherType: "",
      invoiceNo: "",
      invoiceAmount: "",
      paid: "",
      balance: "",
      amount: "",
    });
    setShowClearConfirm(false);
    setTimeout(() => document.getElementById(!isBranchLocked ? `${p}-page-branch` : `${p}-page-series`)?.focus(), 0);
  };

  const handleClearClick = () => {
    setShowClearConfirm(true);
  };

  const onSubmit = (data: any) => {
    if (fields.length === 0) {
      showToast(`Please add at least one invoice to ${cfg.againstVerb}.`, "error", "Error");
      return;
    }

    const totalAmount = data.details.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
    if (totalAmount < 0) {
      showToast(`Total ${cfg.totalLabel} Amount cannot be negative.`, "error", "Validation Error");
      return;
    }

    const payload = {
      ...data,
      details: data.details.map((item: any) => ({
        ...item,
        amount: Number(item.amount) || 0,
      }))
    };

    saveMutation.mutate(payload, {
      onSuccess: () => {
        showToast(`${cfg.title} ${transId ? 'updated' : 'saved'} successfully`, "success", "Success");
        navigate(cfg.listPath);
      },
      onError: (error: any) => {
        showToast((isReceipt ? error?.response?.data?.message : error.message || error?.response?.data?.message) || "Failed to save voucher", "error", "Error");
      }
    });
  };

  const onInvalid = (errors: any) => {
    if (errors.details?.message) {
      showToast(errors.details.message, "error", "Validation Error");
      return;
    }
    // Inline field errors (red border + label) already show what's missing — no toast needed
  };

  const handleMultiSelect = (selectedInvoices: InvoiceRecord[]) => {
    selectedInvoices.forEach(inv => {
      const existingIndex = fields.findIndex(f => f.invoiceId === inv.id);
      if (existingIndex === -1) {
        append({
          invoiceId: inv.id,
          voucherType: inv.vchType,
          invoiceNo: inv.vchNo,
          invoiceDate: inv.invoiceDate || "",
          invoiceAmount: inv.invAmnt,
          balance: inv.balance,
          amount: Number(inv.amount).toFixed(getDecimalPart()),
        });
      } else {
        const existingField = fields[existingIndex];
        update(existingIndex, {
          ...existingField,
          amount: Number(inv.amount).toFixed(getDecimalPart()),
        });
      }
    });
  };

  const selectedAccountId = form.watch("accountId");
  const selectedAccountName = accounts.find((a: any) => a.accountId === selectedAccountId)?.accountName || "";

  const multiPayId = useMemo(() => {
    const multi = paymodeList.find(p => p.paymodeName?.toLowerCase().includes("multi"));
    return multi ? multi.paymodeId : 0;
  }, [paymodeList]);

  const totalAmount = fields.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const printData: Partial<VoucherPrintData> = useMemo(() => {
    const vals = form.getValues();
    const paymode = paymodeList.find(p => p.paymodeId === Number(vals.paymodeId));

    return {
      voucherType: cfg.printType as any,
      voucherNo: vals.vchNo || "",
      date: vals.voucherDate ? formatDateOnly(vals.voucherDate) : "",
      savedAt,
      paymentType: paymode?.paymodeName || cfg.cashName,
      partyName: selectedAccountName || "",
      amount: totalAmount,
      amountInWords: numberToWords(totalAmount).toUpperCase(),
      narration: vals.narration || "",
      discount: Number(vals.discount) || 0,
      netAmount: totalAmount - (Number(vals.discount) || 0),
      receiptDetails: fields.map((f, i) => ({
        sNo: i + 1,
        voucherType: f.voucherType,
        invoiceNo: f.invoiceNo || "",
        invoiceDate: isReceipt ? (f.invoiceDate || "") : (f.invoiceDate ? formatDateOnly(f.invoiceDate) : ""),
        invoiceAmount: Number(f.invoiceAmount) || 0,
        receivedAmount: Number(f.amount) || 0,
      }))
    };
  }, [form.watch(), selectedAccountName, masterData, fields, totalAmount, savedAt]);

  if (isLoading) {
    return (
      <PageShell title={cfg.title}>
        <div className="flex h-64 items-center justify-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </PageShell>
    );
  }

  const handlePaymodeChange = (val: string) => {
    const selectedId = Number(val);
    const isMulti = selectedId === multiPayId || paymodeList.find(p => p.paymodeId === selectedId)?.paymodeName?.toLowerCase().includes("multi");

    form.setValue("paymodeId", selectedId, { shouldValidate: true });
    
    if (isMulti && !transId) {
      setIsMultiPaymodeOpen(true);
    } else {
      form.setValue("paymodes", []);
    }
  };

  return (
    <PageShell title={cfg.title}>
      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm flex flex-col relative" style={{ height: "calc(100vh - 120px)" }}>
        
        <button 
          type="button" 
          onClick={() => navigate(cfg.listPath)} 
          className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-20" 
          title="Close"
        >
          <X size={18} />
        </button>
        <div className="flex-1 overflow-hidden p-2 md:p-3 flex flex-col">
          <form id={`${p}-form`} onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="flex flex-col h-full gap-2">
            
            <div className="grid gap-x-2 gap-y-2 md:grid-cols-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,2.5fr)] flex-none items-end pr-8">
              <SearchableSelect className="!h-8 !px-2 !text-xs"
                id={`${p}-page-branch`}
                label="Branch"
                placeholder="Select Branch"
                required
                options={branchList.map((b) => ({ value: String(b.branchId), label: b.branchName }))}
                value={String(form.watch("branchId") || "")}
                onChange={(val) => {
                  handleBranchChange(val);
                  setTimeout(() => document.getElementById(`${p}-page-series`)?.focus(), 50);
                }}
                onKeyDown={(e) => handleKeyDown(e, `${p}-page-series`)}
                disabled={!!transId || isBranchLocked}
                error={form.formState.errors.branchId?.message}
                autoFocus={!isBranchLocked}
              />

              <div
                onMouseDownCapture={(e) => {
                  if (!form.watch("branchId")) {
                    e.stopPropagation();
                    e.preventDefault();
                    showToast("Please select a Branch first.", "warning", "Warning");
                  }
                }}
              >
                <SearchableSelect className="!h-8 !px-2 !text-xs"
                  id={`${p}-page-series`}
                  label="Series"
                  placeholder="Select Series"
                  required
                  options={masterData?.series?.map((s: any) => ({ value: String(s.seriesId), label: s.seriesName })) || []}
                  value={String(form.watch("seriesId") || "")}
                  onChange={(val) => {
                    form.setValue("seriesId", Number(val) || 0, { shouldValidate: true });
                    setTimeout(() => document.getElementById(`${p}-page-date`)?.focus(), 50);
                  }}
                  onKeyDown={(e) => handleKeyDown(e, `${p}-page-date`)}
                  disabled={!!transId}
                  error={form.formState.errors.seriesId?.message}
                  autoFocus={isBranchLocked}
                />
              </div>

              <FormInput inputClassName="!h-8 !px-2 !text-xs" 
                id={`${p}-page-vchNo`} 
                label="Vch No" 
                {...form.register("vchNo")} 
                disabled 
              />
              
              <FormInput inputClassName="!h-8 !px-2 !text-xs" 
                id={`${p}-page-date`} 
                label="Date" 
                required
                type="date" 
                max={formatDateOnly(new Date())}
                {...form.register("voucherDate", {
                  onChange: (e) => form.setValue("voucherDate", e.target.value, { shouldValidate: true })
                })}
                onKeyDown={(e) => handleKeyDown(e, `${p}-page-employee`)}
                error={form.formState.errors.voucherDate?.message}
              />

              <SearchableSelect className="!h-8 !px-2 !text-xs"
                id={`${p}-page-employee`}
                label="Employee"
                placeholder="Select Employee"
                required
                options={employeeList.map((e: any) => ({ value: String(e.employeeId), label: e.employeeName }))}
                value={String(form.watch("employeeId") || "")}
                onChange={(val) => {
                  form.setValue("employeeId", Number(val) || 0, { shouldValidate: true });
                  setTimeout(() => document.getElementById(`${p}-page-${cfg.partyId}`)?.focus(), 50);
                }}
                onKeyDown={(e) => handleKeyDown(e, `${p}-page-${cfg.partyId}`)}
                disabled={!!transId}
                error={form.formState.errors.employeeId?.message}
              />
              
              <div className="flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  <SearchableSelect className="!h-8 !px-2 !text-xs"
                    id={`${p}-page-${cfg.partyId}`}
                    label={cfg.party}
                    required
                    options={accounts.map((a: any) => ({ value: String(a.accountId), label: `${a.code} - ${a.accountName}` }))}
                    value={String(form.watch("accountId") || "")}
                    onChange={(val) => {
                      form.setValue("accountId", Number(val), { shouldValidate: true });
                      setTimeout(() => document.getElementById(`${p}-manual-vchNo`)?.focus(), 50);
                    }}
                    onKeyDown={(e) => handleKeyDown(e, `${p}-manual-vchNo`)}
                    disabled={!!transId}
                    error={form.formState.errors.accountId?.message}
                  />
                </div>
                <div className="mb-1 shrink-0">
                  <Button 
                    type="button"
                    variant="secondary" 
                    className="h-8 px-3 text-xs font-bold" 
                    onClick={() => {
                      if (!form.watch("accountId")) {
                        showToast(`Please select a ${cfg.partyId} first`, "error", "Error");
                        return;
                      }
                      setIsMultiPayOpen(true);
                    }}
                  >
                    MULTI
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50/70 p-2 flex-none">
              <div className="grid gap-x-2 gap-y-1 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_auto]">
                <div 
                  onMouseDownCapture={(e) => {
                    if (!form.getValues("accountId")) {
                      e.stopPropagation();
                      e.preventDefault();
                      showToast(`Please select a ${cfg.party} first.`, "warning", "Warning");
                    }
                  }}
                  onFocusCapture={(e) => {
                    if (!form.getValues("accountId")) {
                      e.stopPropagation();
                      e.preventDefault();
                      document.getElementById(`${p}-page-${cfg.partyId}`)?.focus();
                      showToast(`Please select a ${cfg.party} first.`, "warning", "Warning");
                    }
                  }}
                >
                  <SearchableSelect className="!h-8 !px-2 !text-xs"
                    id={`${p}-manual-vchNo`}
                    label="INV NO"
                    options={availablePendingInvoices.map((inv: any) => ({ value: inv.invoiceNo, label: isReceipt ? `${inv.invoiceNo}${inv.voucherType ? ` | ${inv.voucherType}` : ""}` : `${inv.invoiceNo} | ${inv.voucherType}` }))}
                    value={manualItem.invoiceNo}
                    onChange={(val) => {
                      const selected = availablePendingInvoices.find((i: any) => i.invoiceNo === val);
                      if (selected) {
                        setManualItem(prev => ({
                          ...prev,
                          voucherType: selected.voucherType || prev.voucherType,
                          invoiceNo: val,
                          invoiceAmount: String(selected.invoiceAmount || 0),
                          paid: String((Number(selected.invoiceAmount) || 0) - (Number(selected.balance) || 0)),
                          balance: String(selected.balance || 0),
                          amount: String(selected.balance || 0),
                          invoiceId: selected.invoiceId || 0,
                        }));
                        setTimeout(() => {
                          const amtEl = document.getElementById(`${p}-manual-amount`) as HTMLInputElement;
                          if (amtEl) {
                            amtEl.focus();
                            amtEl.select?.();
                          }
                        }, 50);
                      } else {
                        setManualField("invoiceNo", val);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (manualItem.invoiceId || manualItem.invoiceNo) {
                          e.preventDefault();
                          document.getElementById(`${p}-manual-amount`)?.focus();
                        } else {
                          e.preventDefault();
                          document.getElementById(`${p}-page-narration`)?.focus();
                        }
                      }
                    }}
                  />
                </div>
                <FormInput id={`${p}-manual-vchType`} label="INV TYPE" value={manualItem.voucherType} disabled inputClassName="!h-8 !px-2 !text-xs bg-gray-50 cursor-not-allowed" />
                <FormInput id={`${p}-manual-invAmnt`} label="Inv Amnt" value={manualItem.invoiceAmount ? formatAmount(Number(manualItem.invoiceAmount)) : ""} placeholder={formatAmount(0)} disabled inputClassName="!h-8 !px-2 !text-xs text-right font-mono bg-gray-50 cursor-not-allowed" />
                <FormInput id={`${p}-manual-paid`} label="Paid" value={manualItem.paid ? formatAmount(Number(manualItem.paid)) : ""} placeholder={formatAmount(0)} disabled inputClassName="!h-8 !px-2 !text-xs text-right font-mono bg-gray-50 cursor-not-allowed" />
                <FormInput id={`${p}-manual-balance`} label="Balance" value={manualItem.balance ? formatAmount(Number(manualItem.balance)) : ""} placeholder={formatAmount(0)} disabled inputClassName="!h-8 !px-2 !text-xs text-right font-mono bg-gray-50 cursor-not-allowed" />
                <FormInput 
                  id={`${p}-manual-amount`} 
                  label="Amount" 
                  type="text"
                  inputMode="decimal"
                  value={manualItem.amount} 
                  placeholder={formatAmount(0)} 
                  inputClassName="!h-8 !px-2 !text-xs text-right font-bold font-mono text-[#49293e]" 
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "" || /^\d*\.?\d*$/.test(val)) {
                      setManualField("amount", val);
                    }
                  }} 
                  onFocus={(e) => e.target.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (manualItem.invoiceId && Number(manualItem.amount) > 0) {
                        handleManualAdd();
                      } else if (fields.length > 0) {
                        document.getElementById(`${p}-page-narration`)?.focus();
                      } else {
                        handleManualAdd();
                      }
                    }
                  }} 
                />
                <div className="flex items-end mb-1">
                  <Button
                    id={`${p}-manual-add-btn`}
                    onClick={handleManualAdd}
                    type="button"
                    className="h-8 w-full"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleManualAdd();
                      }
                    }}
                    icon={<Plus size={18} />}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white flex-1 flex flex-col min-h-0">
              <div className="overflow-auto flex-1 relative">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/50">
                      {["INV NO", "INV TYPE", "Invoice Date", "Inv Amnt", "Balance", "Amount"].map(
                        (column) => (
                          <th
                            key={column}
                            className={`sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 ${column === "Inv Amnt" || column === "Balance" || column === "Amount" ? "text-right" : "text-center"}`}
                          >
                            {column}
                          </th>
                        ),
                      )}
                      <th className="sticky top-0 bg-gray-50 z-10 w-10 px-4 py-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {fields.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="h-40 px-4 text-center text-sm text-gray-400">
                          No vouchers added
                        </td>
                      </tr>
                    ) : (
                      fields.map((item, index) => (
                        <tr key={item.id} className="hover:bg-[#49293e]/5">
                          <td className="border-l-[3px] border-l-[#49293e] px-3 py-1.5 font-medium text-gray-900 text-center">
                            {isReceipt ? getInvoiceNo(item) : item.invoiceNo}
                          </td>
                          <td className="px-3 py-1.5 text-center">{isReceipt ? (item.voucherType || "-") : item.voucherType}</td>
                          <td className="px-3 py-1.5 text-gray-500 text-center">{isReceipt ? (item.invoiceDate || "-") : (item.invoiceDate ? formatDateOnly(item.invoiceDate) : "")}</td>
                          <td className="px-3 py-1.5 text-right font-mono">{formatAmount(item.invoiceAmount || 0)}</td>
                          <td className="px-3 py-1.5 text-right font-mono">{formatAmount(item.balance || 0)}</td>
                          <td className="px-2 py-2">
                            <input
                              id={`${p}-table-amount-${index}`}
                              type="number"
                              max={isReceipt ? (item.balance || undefined) : item.balance}
                              step={Math.pow(10, -getDecimalPart()).toString()}
                              className="w-full text-right font-mono font-semibold text-gray-900 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]"
                              {...form.register(`details.${index}.amount`)}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  if (index < fields.length - 1) {
                                    const nextInput = document.getElementById(`${p}-table-amount-${index + 1}`) as HTMLInputElement;
                                    nextInput?.focus();
                                    nextInput?.select();
                                  } else {
                                    document.getElementById(`${p}-page-narration`)?.focus();
                                  }
                                }
                              }}
                            />
                          </td>
                          <td className="px-3 py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors inline-flex"
                              tabIndex={-1}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex-none">
              <FormInput inputClassName="!h-8 !px-2 !text-xs" 
                  id={`${p}-page-narration`} 
                  label="Narration" 
                  {...form.register("narration")} 
                  onKeyDown={(e) => handleKeyDown(e, `${p}-page-paymode`)}
                />
            </div>

          </form>
        </div>

        <div className="flex flex-wrap items-end gap-4 border-t border-gray-100 bg-white px-3 py-2 rounded-b-3xl">
          <div className="w-48">
            <SearchableSelect className="!h-8 !px-2 !text-xs" 
                  id={`${p}-page-paymode`} 
                  label="Paymode" 
                  placeholder="Select Paymode"
                  required
                  options={paymodeList.map(p => ({ value: String(p.paymodeId), label: p.paymodeName }))}
                  value={String(form.watch("paymodeId") || "")}
                  onChange={(val) => {
                    handlePaymodeChange(val);
                    setTimeout(() => document.getElementById(`${p}-save-btn`)?.focus(), 50);
                  }}
                  onKeyDown={(e) => handleKeyDown(e, `${p}-save-btn`)}
                  disabled={!!transId}
                  error={form.formState.errors.paymodeId?.message}
                />
          </div>
          <div className="flex flex-wrap items-center gap-4 justify-end flex-1">
            <div className="flex items-baseline gap-2 bg-white px-4 py-1.5 rounded-lg border border-gray-200 shadow-sm">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Amount</span>
              <span className="text-xl font-bold text-[#49293e] leading-none">{formatAmount(totalAmount)}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:border-l border-gray-300 sm:pl-4">
          {transId && (
            <Button
              type="button"
              variant="danger"
              onClick={() => api.cancel(transId).then(() => {
                showToast("Voucher deleted successfully", "success", "Success");
                navigate(cfg.listPath);
              })}
              isAction
              icon={<Trash2 size={16} />}
            >
              Delete
            </Button>
          )}
          <Button
            id={`${p}-save-btn`}
            type="submit"
            form={`${p}-form`}
            disabled={isSaving}
            variant="primary"
            isAction
            icon={<Save size={16} />}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button
            id={`${p}-print`}
            type="button"
            variant="secondary"
            onClick={() => setIsPrintModalOpen(true)}
            isAction
            tabIndex={-1}
            disabled={!transId || isSaving}
            icon={<Printer size={16} />}
          >
            Print
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleClearClick}
            isAction
            tabIndex={-1}
            icon={<RotateCcw size={16} />}
          >
            Clear
          </Button>
            </div>
          </div>
        </div>
      </div>

      <VoucherPrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        data={printData}
      />

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear Form"
        message="Are you sure you want to clear the form? All unsaved data will be lost."
        confirmLabel="Clear"
        onConfirm={handleReset}
        onCancel={() => setShowClearConfirm(false)}
      />

      <MultiInvoiceSelectionModal
        isOpen={isMultiPayOpen}
        onClose={() => setIsMultiPayOpen(false)}
        onSelect={handleMultiSelect}
        partyName={selectedAccountName}
        fetchInvoices={(fromDate, toDate) => 
          api.getPendingInvoicesDetails(Number(form.watch("branchId") || branchId || 0), selectedAccountId, transId ? Number(transId) : undefined, fromDate, toDate)
        }
        type={cfg.invoiceType}
      />

      <BackofficeMultiPayModal
        isOpen={isMultiPaymodeOpen}
        onClose={() => {
          setIsMultiPaymodeOpen(false);
          const currentPaymodes = form.getValues("paymodes") || [];
          if (currentPaymodes.length === 0) {
            form.setValue("paymodeId", 1, { shouldValidate: true });
          }
        }}
        totalDue={totalAmount}
        paymodes={paymodeList}
        onSubmit={(payments: any) => {
          form.setValue("paymodes", payments);
          setIsMultiPaymodeOpen(false);
        }}
        initialPayments={form.watch("paymodes") || []}
      />
    </PageShell>
  );
};


