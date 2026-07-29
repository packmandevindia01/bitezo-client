import { useParams, useNavigate } from "react-router-dom";
import { PageShell, FormInput, SearchableSelect, Button, ConfirmDialog } from "../../../../components/common";
import { useReceiptVoucher } from "../hooks/useReceiptVoucher";
import { BackofficeMultiPayModal } from "../../shared/components/BackofficeMultiPayModal";
import { VoucherPrintPreviewModal } from "../../shared/components/VoucherPrintPreviewModal";
import type { VoucherPrintData } from "../../shared/components/VoucherPrintTemplate";
import { X, Trash2, Printer } from "lucide-react";
import { useState, useMemo } from "react";
import { numberToWords } from "../../../../utils/numberToWords";

const ReceiptVoucherFormPage = () => {
  const { id } = useParams();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const {
    form,
    onSubmit,
    clearForm,
    isSaving,
    formBranchList,
    employeeList,
    seriesList,
    accountList,
    paymodeList,
    isCancelled,
    cancelMutation,
    isMultiPayOpen,
    setIsMultiPayOpen,
    isBranchLocked,
  } = useReceiptVoucher(Number(id) || undefined, () => navigate("/dashboard/receipt-voucher"));

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  


  const canSave = !isCancelled;

  const { watch, setValue } = form;
  const watchedAmount = watch("amount");

  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextFieldId) {
        document.getElementById(nextFieldId)?.focus();
      }
    }
  };

  const printData = useMemo<Partial<VoucherPrintData>>(() => {
    const vals = form.getValues();
    const account = accountList.find(a => a.accountId === Number(vals.accountId));
    const paymode = paymodeList.find(p => p.paymodeId === Number(vals.paymodeId));

    return {
      voucherType: "RECEIPT",
      voucherNo: vals.voucherNo || "",
      date: vals.voucherDate || "",
      paymentType: paymode?.paymodeName || "CASH RECEIPT",
      partyName: account?.accountName || "",
      amount: Number(vals.amount) || 0,
      amountInWords: numberToWords(Number(vals.amount) || 0).toUpperCase(),
      narration: vals.narration || "",
    };
  }, [form.watch(), accountList, paymodeList]);

  const handleCancelVoucher = async () => {
    if (id) {
      await cancelMutation.mutateAsync(Number(id));
      setCancelModalOpen(false);
      navigate("/dashboard/receipt-voucher");
    }
  };

  return (
    <PageShell title={isEditMode ? (isCancelled ? "View Receipt Voucher" : "Edit Receipt Voucher") : "Add Receipt Voucher"}>
      <div className="w-full max-w-5xl mx-auto pt-14 pb-6 px-6 bg-white border border-gray-200 rounded-2xl shadow-sm relative">
        <button 
          onClick={() => navigate("/dashboard/receipt-voucher")}
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          title="Close"
        >
          <X size={20} />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
          {/* Column 1 */}
          <div className="flex flex-col gap-4">
            <SearchableSelect
              id="rv-branch"
              label="BRANCH"
              autoFocus
              value={String(watch("branchId") || "")}
              onChange={(val) => setValue("branchId", Number(val))}
              placeholder="Select Branch"
              options={formBranchList.map((b: {branchId: number, branchName: string}) => ({ label: b.branchName, value: String(b.branchId) }))}
              onKeyDown={(e) => handleKeyDown(e as any, "rv-series")}
              tabIndex={1}
              disabled={!canSave || isBranchLocked}
            />
            
            <FormInput
              id="rv-date"
              label="DATE"
              type="date"
              max={new Date().toISOString().split("T")[0]}
              value={watch("voucherDate")}
              onChange={(e) => setValue("voucherDate", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "rv-employee")}
              tabIndex={3}
              readOnly={!canSave}
            />

            <FormInput
              id="rv-no"
              label="VCH NO"
              readOnly
              value={watch("voucherNo")}
              onChange={(e) => setValue("voucherNo", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "rv-refno")}
              tabIndex={5}
            />

            <SearchableSelect
              id="rv-account"
              label="ACCOUNT"
              value={String(watch("accountId") || "")}
              onChange={(val) => {
                const accId = Number(val);
                setValue("accountId", accId);
                const selectedAccount = accountList.find(a => a.accountId === accId);
                if (selectedAccount) setValue("accountName", selectedAccount.accountName);
              }}
              placeholder="Select Account"
              options={accountList.map(a => ({ label: a.accountName, value: String(a.accountId) }))}
              onKeyDown={(e) => handleKeyDown(e as any, "rv-amount")}
              tabIndex={7}
              disabled={!canSave}
            />

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <SearchableSelect
                  id="rv-paymode"
                  label="PAYMODE"
                  value={watch("paymodeId") === 3 ? "3" : String(watch("paymodeId") || "")}
                  onChange={(val) => setValue("paymodeId", Number(val))}
                  placeholder="Select Paymode"
                  options={paymodeList.map(p => ({ label: p.paymodeName, value: String(p.paymodeId) }))}
                  onKeyDown={(e) => handleKeyDown(e as any, "rv-narration")}
                  tabIndex={9}
                  disabled={!canSave}
                />
              </div>
              <div className="flex items-end pb-[2px]">
                <Button 
                  type="button" 
                  variant="secondary" 
                  className="h-10 px-3 bg-[#49293e]/10 text-[#49293e] border-[#49293e]/20 hover:bg-[#49293e]/20 text-xs font-bold" 
                  onClick={() => setIsMultiPayOpen(true)}
                  disabled={!canSave || !watch("amount")}
                  tabIndex={-1}
                >
                  MULTI
                </Button>
              </div>
            </div>
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-4">
            <SearchableSelect
              id="rv-series"
              label="SERIES"
              value={String(watch("seriesId") || "")}
              onChange={(val) => setValue("seriesId", Number(val))}
              placeholder="Select Series"
              options={seriesList.map(s => ({ label: s.seriesName, value: String(s.seriesId) }))}
              onKeyDown={(e) => handleKeyDown(e as any, "rv-date")}
              tabIndex={2}
              disabled={!canSave}
            />

            <SearchableSelect
              id="rv-employee"
              label="EMPLOYEE"
              value={String(watch("employeeId") || "")}
              onChange={(val) => setValue("employeeId", Number(val))}
              placeholder="Select Employee"
              options={employeeList.map(e => ({ label: e.employeeName, value: String(e.employeeId) }))}
              onKeyDown={(e) => handleKeyDown(e as any, "rv-no")}
              tabIndex={4}
              disabled={!canSave}
            />

            <FormInput
              id="rv-refno"
              label="REF NO"
              value={watch("refNo")}
              onChange={(e) => setValue("refNo", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "rv-account")}
              tabIndex={6}
              readOnly={!canSave}
            />

            <FormInput
              id="rv-amount"
              label="AMOUNT"
              type="number"
              inputClassName="text-right"
              value={watchedAmount}
              onChange={(e) => setValue("amount", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "rv-paymode")}
              tabIndex={8}
              readOnly={!canSave}
            />

            <div className="flex flex-col gap-1 mb-1 w-full relative">
              <label htmlFor="rv-narration" className="flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-0.5">
                NARRATION
              </label>
              <textarea
                id="rv-narration"
                value={watch("narration")}
                onChange={(e) => setValue("narration", e.target.value)}
                readOnly={!canSave}
                tabIndex={10}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    document.getElementById("rv-save-btn")?.focus();
                  }
                }}
                className="w-full text-sm rounded-md border border-gray-300 outline-none transition px-4 py-2 focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20"
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* Buttons matching image layout */}
        <div className="flex justify-end items-center mt-8 pt-4 border-t border-gray-100 gap-3">
          {isEditMode && !isCancelled && (
            <Button 
              variant="danger" 
              onClick={() => setCancelModalOpen(true)}
              icon={<Trash2 size={16} />}
              disabled={isSaving}
            >
              Delete
            </Button>
          )}
          <Button 
            variant="secondary" 
            onClick={clearForm}
            tabIndex={-1}
            disabled={isSaving || !canSave}
            className="w-32"
          >
            Clear
          </Button>
          <Button
            id="rv-print"
            type="button"
            variant="secondary"
            onClick={() => setIsPrintModalOpen(true)}
            className="w-32"
            tabIndex={-1}
            disabled={!isEditMode || !canSave}
            icon={<Printer size={16} />}
          >
            Print
          </Button>
          <Button
            id="rv-save"
            variant="primary"
            onClick={onSubmit}
            loading={isSaving}
            className="w-32"
            tabIndex={11}
            disabled={!canSave || isSaving}
          >
            Save
          </Button>
        </div>
      </div>

      <VoucherPrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        data={printData}
      />

      <ConfirmDialog
        isOpen={cancelModalOpen}
        title="Delete Receipt Voucher"
        message="Are you sure you want to delete this Receipt Voucher?"
        confirmLabel="Yes, Delete it"
        onConfirm={handleCancelVoucher}
        onCancel={() => setCancelModalOpen(false)}
        loading={cancelMutation?.isPending}
      />

      <BackofficeMultiPayModal
        isOpen={isMultiPayOpen}
        paymodes={paymodeList}
        initialPayments={watch("paymodes")}
        onClose={() => setIsMultiPayOpen(false)}
        totalDue={Number(watch("amount") || 0)}
        onSubmit={(payments) => {
          setIsMultiPayOpen(false);
          const mappedPayments = payments.map(p => ({
            paymodeId: p.paymodeId,
            amount: p.amount,
            paymodeName: p.mode
          }));
          setValue("paymodeId", 3); // Set master paymode to Multi
          setValue("paymodes", mappedPayments); // Set the array
          setTimeout(() => document.getElementById("rv-narration")?.focus(), 100);
        }}
      />
    </PageShell>
  );
};

export default ReceiptVoucherFormPage;
