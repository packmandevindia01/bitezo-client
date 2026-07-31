import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFieldArray } from "react-hook-form";
import { Save, RotateCcw, Trash2, X, Plus, Printer } from "lucide-react";

import { PageShell, Button, FormInput, SearchableSelect, SelectInput } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import { useToast } from "../../../../app/providers/useToast";
import type { InvoiceRecord } from "../../shared/components/MultiInvoiceSelectionModal";
import { MultiInvoiceSelectionModal } from "../../shared/components/MultiInvoiceSelectionModal";
import { BackofficeMultiPayModal } from "../../shared/components/BackofficeMultiPayModal";
import { VoucherPrintPreviewModal } from "../../shared/components/VoucherPrintPreviewModal";
import type { VoucherPrintData } from "../../shared/components/VoucherPrintTemplate";
import { useCurrency } from "../../../../hooks/useCurrency";
import { getDecimalPart } from "../../../../utils/currency";
import { numberToWords } from "../../../../utils/numberToWords";
import { usePaymentAgainstVoucherForm } from "../hooks/usePaymentAgainstVoucherForm";
import { paymentAgainstVoucherApi } from "../services/paymentAgainstVoucherApi";
import { useAppSelector } from "../../../../app/hooks";
import { selectActiveBranchId } from "../../../auth/store/authSlice";
import { useBranchScope } from "../../../../hooks/useBranchScope";

const PaymentAgainstVoucherPage = () => {
  const { id } = useParams<{ id: string }>();
  const transId = id ? parseInt(id, 10) : undefined;
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const { showToast } = useToast();
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const fallbackBranch = useAppSelector(selectActiveBranchId) || 0;
  const branchId = isBranchLocked ? initialBranchId : fallbackBranch;

  const { 
    form, 
    masterData, 
    accounts, 
    pendingInvoices,
    isLoading, 
    isSaving, 
    saveMutation
  } = usePaymentAgainstVoucherForm(transId);
  
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "details"
  });

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

  const handleManualKeyDown = (e: React.KeyboardEvent, nextId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextId) document.getElementById(nextId)?.focus();
    }
  };

  const setManualField = (key: string, value: string) => {
    setManualItem(prev => ({ ...prev, [key]: value }));
  };

  const handleManualAdd = () => {
    if (!manualItem.invoiceId) {
      showToast("Please select a valid Invoice No from the dropdown.", "error", "Validation Error");
      return;
    }
    if (!manualItem.amount || Number(manualItem.amount) === 0) {
      showToast("Please enter a valid Amount.", "error", "Validation Error");
      return;
    }
    
    append({
      invoiceId: manualItem.invoiceId || 0,
      voucherType: manualItem.voucherType,
      invoiceNo: manualItem.invoiceNo,
      invoiceDate: new Date().toISOString().split("T")[0],
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
    document.getElementById("pav-manual-vchNo")?.focus();
  };

  const handleReset = () => {
    form.reset({
      ...form.getValues(),
      accountId: 0,
      paymodeId: 0,
      voucherDate: new Date().toISOString().split("T")[0],
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
    setTimeout(() => document.getElementById("pav-page-series")?.focus(), 0);
  };

  const handleClearClick = () => {
    setShowClearConfirm(true);
  };

  const onSubmit = (data: any) => {
    if (fields.length === 0) {
      showToast("Please add at least one invoice to pay against.", "error", "Error");
      return;
    }

    const totalAmount = data.details.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);
    if (totalAmount < 0) {
      showToast("Total Payment Amount cannot be negative.", "error", "Validation Error");
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
        showToast(`Payment Against Voucher ${transId ? 'updated' : 'saved'} successfully`, "success", "Success");
        navigate("/dashboard/payment-against-voucher");
      },
      onError: (error: any) => {
        showToast(error?.response?.data?.message || "Failed to save voucher", "error", "Error");
      }
    });
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
  const selectedAccountName = accounts.find(a => a.accountId === selectedAccountId)?.accountName || "";

  const multiPayId = useMemo(() => {
    const multi = masterData?.paymodes?.find(p => p.paymodeName?.toLowerCase().includes("multi"));
    return multi ? multi.paymodeId : 0;
  }, [masterData]);

  const totalAmount = fields.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const printData: Partial<VoucherPrintData> = useMemo(() => {
    const vals = form.getValues();
    const paymode = masterData?.paymodes?.find(p => p.paymodeId === Number(vals.paymodeId));

    return {
      voucherType: "PAYMENT AGAINST",
      voucherNo: vals.vchNo || "",
      date: vals.voucherDate || "",
      paymentType: paymode?.paymodeName || "CASH PAYMENT",
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
        invoiceDate: f.invoiceDate || "",
        invoiceAmount: Number(f.invoiceAmount) || 0,
        receivedAmount: Number(f.amount) || 0,
      }))
    };
  }, [form.watch(), selectedAccountName, masterData, fields, totalAmount]);

  if (isLoading) {
    return (
      <PageShell title="Payment Against Voucher">
        <div className="flex h-64 items-center justify-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      </PageShell>
    );
  }

  const handlePaymodeChange = (val: string) => {
    const selectedId = Number(val);
    const isMulti = selectedId === multiPayId || masterData?.paymodes?.find(p => p.paymodeId === selectedId)?.paymodeName?.toLowerCase().includes("multi");

    form.setValue("paymodeId", selectedId, { shouldValidate: true });
    
    if (isMulti && !transId) {
      setIsMultiPaymodeOpen(true);
    } else {
      form.setValue("paymodes", []);
    }
  };

  return (
    <PageShell title="Payment Against Voucher">
      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm flex flex-col relative" style={{ height: "calc(100vh - 120px)" }}>
        
        <button 
          type="button" 
          onClick={() => navigate("/dashboard/payment-against-voucher")} 
          className="absolute top-2 right-2 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-20" 
          title="Close"
        >
          <X size={20} />
        </button>
        <div className="flex-1 overflow-hidden p-3 md:p-4 pt-10 md:pt-12 flex flex-col">
          <form id="pav-form" onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full gap-4">
            
            <div className="grid gap-x-3 gap-y-2 md:grid-cols-4 xl:grid-cols-5 flex-none">
              <div
                onMouseDownCapture={(e) => {
                  if (!branchId) {
                    e.stopPropagation();
                    e.preventDefault();
                    showToast("Please select a Branch first.", "warning", "Warning");
                  }
                }}
              >
                <SelectInput 
                  id="pav-page-series" 
                  label="Series" 
                  options={masterData?.series?.map((s: any) => ({ value: String(s.seriesId), label: s.seriesName })) || []}
                  value={String(form.watch("seriesId") || "")}
                  {...form.register("seriesId", { 
                    onChange: (e) => form.setValue("seriesId", Number(e.target.value) || 0, { shouldValidate: true }) 
                  })}
                  disabled={!!transId}
                  error={form.formState.errors.seriesId?.message}
                  autoFocus
                />
              </div>
              
              <FormInput 
                id="pav-page-vchNo" 
                label="Vch No" 
                {...form.register("vchNo")} 
                disabled 
              />
              
              <FormInput 
                id="pav-page-date" 
                label="Date" 
                type="date" 
                max={new Date().toISOString().split("T")[0]}
                {...form.register("voucherDate")}
                error={form.formState.errors.voucherDate?.message}
              />
              
              <div className="md:col-span-2 flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  <SearchableSelect
                    id="pav-page-supplier"
                    label="Supplier"
                    options={accounts.map((a: any) => ({ value: String(a.accountId), label: `${a.code} - ${a.accountName}` }))}
                    value={String(form.watch("accountId") || "")}
                    onChange={(val) => form.setValue("accountId", Number(val), { shouldValidate: true })}
                    disabled={!!transId}
                    error={form.formState.errors.accountId?.message}
                  />
                </div>
                <div className="flex items-end pb-1">
                  <Button 
                    type="button"
                    variant="secondary" 
                    className="h-10.5 px-3 text-xs font-bold" 
                    onClick={() => {
                      if (!form.watch("accountId")) {
                        showToast("Please select a supplier first", "error", "Error");
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
                      showToast("Please select a Supplier first.", "warning", "Warning");
                    }
                  }}
                  onFocusCapture={(e) => {
                    if (!form.getValues("accountId")) {
                      e.stopPropagation();
                      e.preventDefault();
                      document.getElementById("pav-page-supplier")?.focus();
                      showToast("Please select a Supplier first.", "warning", "Warning");
                    }
                  }}
                >
                  <SearchableSelect
                    id="pav-manual-vchNo"
                    label="INV NO"
                    options={pendingInvoices?.map((inv: any) => ({ value: inv.invoiceNo, label: `${inv.invoiceNo} | ${inv.voucherType}` })) || []}
                    value={manualItem.invoiceNo}
                    onChange={(val) => {
                      const selected = pendingInvoices.find((i: any) => i.invoiceNo === val);
                      if (selected) {
                        setManualItem(prev => ({
                          ...prev,
                          voucherType: selected.voucherType || prev.voucherType,
                          invoiceNo: val,
                          invoiceAmount: String(selected.invoiceAmount || 0),
                          paid: String((Number(selected.invoiceAmount) || 0) - (Number(selected.balance) || 0)),
                          balance: String(selected.balance || 0),
                          invoiceId: selected.invoiceId || 0,
                        }));
                        setTimeout(() => document.getElementById("pav-manual-amount")?.focus(), 10);
                      } else {
                        setManualField("invoiceNo", val);
                      }
                    }}
                  />
                </div>
                <FormInput id="pav-manual-vchType" label="INV TYPE" value={manualItem.voucherType} disabled onChange={(e) => setManualField("voucherType", e.target.value)} onKeyDown={(e) => handleManualKeyDown(e, "pav-manual-invAmnt")} />
                <FormInput id="pav-manual-invAmnt" label="Inv Amnt" value={manualItem.invoiceAmount} placeholder={(0).toFixed(getDecimalPart())} inputClassName="text-right" onChange={(e) => setManualField("invoiceAmount", e.target.value)} onKeyDown={(e) => handleManualKeyDown(e, "pav-manual-paid")} />
                <FormInput id="pav-manual-paid" label="Paid" value={manualItem.paid} placeholder={(0).toFixed(getDecimalPart())} inputClassName="text-right" onChange={(e) => setManualField("paid", e.target.value)} onKeyDown={(e) => handleManualKeyDown(e, "pav-manual-balance")} />
                <FormInput id="pav-manual-balance" label="Balance" value={manualItem.balance} placeholder={(0).toFixed(getDecimalPart())} inputClassName="text-right" onChange={(e) => setManualField("balance", e.target.value)} onKeyDown={(e) => handleManualKeyDown(e, "pav-manual-amount")} />
                <FormInput id="pav-manual-amount" label="Amount" value={manualItem.amount} placeholder={(0).toFixed(getDecimalPart())} inputClassName="text-right font-bold text-[#49293e]" onChange={(e) => setManualField("amount", e.target.value)} onKeyDown={(e) => handleManualKeyDown(e, "pav-manual-add-btn")} />
                <div className="flex items-end pb-1">
                  <Button
                    id="pav-manual-add-btn"
                    onClick={handleManualAdd}
                    type="button"
                    className="h-10.5 w-full"
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
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/50">
                      {["INV NO", "INV TYPE", "Invoice Date", "Inv Amnt", "Balance", "Amount"].map(
                        (column) => (
                          <th
                            key={column}
                            className={`sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 ${column === "Inv Amnt" || column === "Balance" || column === "Amount" ? "text-right" : ""}`}
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
                          <td className="border-l-[3px] border-l-[#49293e] px-4 py-3 font-medium text-gray-900">
                            {item.invoiceNo}
                          </td>
                          <td className="px-4 py-3">{item.voucherType}</td>
                          <td className="px-4 py-3 text-gray-500">{item.invoiceDate}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatAmount(item.invoiceAmount || 0)}</td>
                          <td className="px-4 py-3 text-right font-mono">{formatAmount(item.balance || 0)}</td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              step={Math.pow(10, -getDecimalPart()).toString()}
                              className="w-full text-right font-mono font-semibold text-gray-900 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]"
                              {...form.register(`details.${index}.amount`)}
                              onFocus={(e) => e.target.select()}
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
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

            <div className="grid gap-3 lg:grid-cols-[1fr_300px] flex-none">
              <div className="grid gap-x-3 gap-y-1 md:grid-cols-2">
                <FormInput 
                  id="pav-page-narration" 
                  label="Narration" 
                  {...form.register("narration")} 
                />
                <div className="flex gap-2 items-end">
                  <div className="flex-1 min-w-0">
                    <SearchableSelect 
                      id="pav-page-paymode" 
                      label="Paymode" 
                      options={masterData?.paymodes?.map(p => ({ value: String(p.paymodeId), label: p.paymodeName })) || []}
                      value={String(form.watch("paymodeId") || "")}
                      onChange={handlePaymodeChange}
                      disabled={!!transId}
                      error={form.formState.errors.paymodeId?.message}
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-2 px-2">
              <div className="flex flex-col items-end">
                <div className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                  <span>Total Amount</span>
                </div>
                <div>
                  <p className="text-2xl font-bold font-mono tracking-tight text-[#49293e]">
                    {formatAmount(totalAmount)}
                  </p>
                </div>
              </div>
            </div>
            </div>

          </form>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 bg-white px-6 py-4 rounded-b-3xl">
          {transId && (
            <Button
              type="button"
              variant="danger"
              onClick={() => paymentAgainstVoucherApi.cancelPaymentAgainstVoucher(transId).then(() => {
                showToast("Voucher deleted successfully", "success", "Success");
                navigate("/dashboard/payment-against-voucher");
              })}
              className="w-32"
              icon={<Trash2 size={16} />}
            >
              Delete
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={handleClearClick}
            className="w-32"
            tabIndex={-1}
            icon={<RotateCcw size={16} />}
          >
            Clear
          </Button>
          <Button
            id="pav-print"
            type="button"
            variant="secondary"
            onClick={() => setIsPrintModalOpen(true)}
            className="w-32"
            tabIndex={-1}
            disabled={!transId || isSaving}
            icon={<Printer size={16} />}
          >
            Print
          </Button>
          <Button
            type="submit"
            form="pav-form"
            disabled={isSaving}
            variant="primary"
            className="w-32"
            icon={<Save size={16} />}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
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
          paymentAgainstVoucherApi.getPendingInvoicesDetails(Number(branchId), selectedAccountId, transId ? Number(transId) : undefined, fromDate, toDate)
        }
        type="PAYMENT"
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
        paymodes={masterData?.paymodes || []}
        onSubmit={(payments: any) => {
          form.setValue("paymodes", payments);
          setIsMultiPaymodeOpen(false);
        }}
        initialPayments={form.watch("paymodes") || []}
      />
    </PageShell>
  );
};

export default PaymentAgainstVoucherPage;
