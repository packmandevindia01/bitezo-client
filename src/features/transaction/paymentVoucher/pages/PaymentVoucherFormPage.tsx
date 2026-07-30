import { useParams, useNavigate } from "react-router-dom";
import { PageShell, FormInput, SearchableSelect, Button, ConfirmDialog } from "../../../../components/common";
import { usePaymentVoucher } from "../hooks/usePaymentVoucher";
import { BackofficeMultiPayModal } from "../../shared/components/BackofficeMultiPayModal";
import { VoucherPrintPreviewModal } from "../../shared/components/VoucherPrintPreviewModal";
import type { VoucherPrintData } from "../../shared/components/VoucherPrintTemplate";
import { X, Trash2, Printer } from "lucide-react";
import { useState, useRef, useMemo } from "react";
import { numberToWords } from "../../../../utils/numberToWords";

const PaymentVoucherFormPage = () => {
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
  } = usePaymentVoucher(Number(id) || undefined, () => navigate("/dashboard/payment-voucher"));

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  const canSave = !isCancelled;

  const { watch, setValue } = form;
  const watchedAmount = watch("amount");

  // Stores the paymodeId that was active before the MultiPay modal was opened.
  // Used to restore the dropdown cleanly if the user cancels the modal.
  const previousPaymodeId = useRef<number>(0);
  const [paymodeSelectKey, setPaymodeSelectKey] = useState(0);

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
      voucherType: "PAYMENT",
      voucherNo: vals.voucherNo || "",
      date: vals.voucherDate || "",
      paymentType: paymode?.paymodeName || "CASH PAYMENT",
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
      navigate("/dashboard/payment-voucher");
    }
  };

  return (
    <PageShell title={isEditMode ? (isCancelled ? "View Payment Voucher" : "Edit Payment Voucher") : "Add Payment Voucher"}>
      <div className="w-full max-w-5xl mx-auto pt-14 pb-6 px-6 bg-white border border-gray-200 rounded-2xl shadow-sm relative">
        <button 
          type="button"
          onClick={() => navigate("/dashboard/payment-voucher")}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-10"
          title="Close"
          tabIndex={-1}
        >
          <X size={20} />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
          {/* Column 1 */}
          <div className="flex flex-col gap-4">
            <SearchableSelect
              id="pv-branch"
              label="BRANCH"
              autoFocus
              value={String(watch("branchId") || "")}
              onChange={(val) => setValue("branchId", Number(val))}
              placeholder="Select Branch"
              options={formBranchList.map((b: {branchId: number, branchName: string}) => ({ label: b.branchName, value: String(b.branchId) }))}
              onKeyDown={(e) => handleKeyDown(e as any, "pv-series")}
              tabIndex={1}
              disabled={!canSave || isBranchLocked}
            />
            
            <FormInput
              id="pv-date"
              label="DATE"
              type="date"
              max={new Date().toISOString().split("T")[0]}
              value={watch("voucherDate")}
              onChange={(e) => setValue("voucherDate", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "pv-employee")}
              tabIndex={3}
              readOnly={!canSave}
            />

            <FormInput
              id="pv-no"
              label="VCH NO"
              readOnly
              value={watch("voucherNo")}
              onChange={(e) => setValue("voucherNo", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "pv-refno")}
              tabIndex={5}
            />

            <SearchableSelect
              id="pv-account"
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
              onKeyDown={(e) => handleKeyDown(e as any, "pv-amount")}
              tabIndex={7}
              disabled={!canSave}
            />

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <SearchableSelect
                  key={paymodeSelectKey}
                  id="pv-paymode"
                  label="PAYMODE"
                  value={watch("paymodeId") === 3 ? "3" : String(watch("paymodeId") || "")}
                  onChange={(val) => {
                    const numVal = Number(val);
                    setValue("paymodeId", numVal);
                    if (numVal === 3) setIsMultiPayOpen(true);
                  }}
                  placeholder="Select Paymode"
                  options={paymodeList.map(p => ({ label: p.paymodeName, value: String(p.paymodeId) }))}
                  onKeyDown={(e) => handleKeyDown(e as any, "pv-narration")}
                  tabIndex={9}
                  disabled={!canSave}
                />
              </div>
            </div>
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-4">
            <SearchableSelect
              id="pv-series"
              label="SERIES"
              value={String(watch("seriesId") || "")}
              onChange={(val) => setValue("seriesId", Number(val))}
              placeholder="Select Series"
              options={seriesList.map(s => ({ label: s.seriesName, value: String(s.seriesId) }))}
              onKeyDown={(e) => handleKeyDown(e as any, "pv-date")}
              tabIndex={2}
              disabled={!canSave}
            />

            <SearchableSelect
              id="pv-employee"
              label="EMPLOYEE"
              value={String(watch("employeeId") || "")}
              onChange={(val) => setValue("employeeId", Number(val))}
              placeholder="Select Employee"
              options={employeeList.map(e => ({ label: e.employeeName, value: String(e.employeeId) }))}
              onKeyDown={(e) => handleKeyDown(e as any, "pv-no")}
              tabIndex={4}
              disabled={!canSave}
            />

            <FormInput
              id="pv-refno"
              label="REF NO"
              value={watch("refNo")}
              onChange={(e) => setValue("refNo", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "pv-account")}
              tabIndex={6}
              readOnly={!canSave}
              maxLength={50}
            />

            <FormInput
              id="pv-amount"
              label="AMOUNT"
              type="number"
              inputClassName="text-right"
              min="0"
              step="0.001"
              value={watchedAmount}
              onChange={(e) => {
                if (e.target.value.length <= 15) {
                  setValue("amount", e.target.value);
                }
              }}
              onKeyDown={(e) => handleKeyDown(e, "pv-paymode")}
              tabIndex={8}
              readOnly={!canSave}
              maxLength={15}
            />

            <FormInput
              id="pv-narration"
              label="NARRATION"
              value={watch("narration")}
              onChange={(e) => setValue("narration", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, "pv-save")}
              tabIndex={10}
              readOnly={!canSave}
              maxLength={200}
            />
          </div>
        </div>

        {/* Buttons matching image layout */}
        <div className="flex justify-end items-center mt-8 pt-4 border-t border-gray-100 gap-3">
          {isEditMode && canSave && (
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
            id="pv-clear"
            type="button"
            variant="secondary"
            onClick={clearForm}
            className="w-32"
            tabIndex={-1}
            disabled={!canSave || isSaving}
          >
            Clear
          </Button>
          <Button
            id="pv-print"
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
            id="pv-save"
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
        title="Delete Payment Voucher"
        message="Are you sure you want to delete this Payment Voucher?"
        confirmLabel="Yes, Delete it"
        onConfirm={handleCancelVoucher}
        onCancel={() => setCancelModalOpen(false)}
        loading={cancelMutation.isPending}
      />
      <BackofficeMultiPayModal
        isOpen={isMultiPayOpen}
        paymodes={paymodeList}
        initialPayments={watch("paymodes")}
        onClose={() => {
          // User cancelled — restore the previous paymode selection exactly as it was.
          // Bump the key to force SearchableSelect to re-mount with the restored value,
          // preventing any stale visual state (e.g. showing "MultiPay" in the input).
          setIsMultiPayOpen(false);
          setValue("paymodeId", previousPaymodeId.current);
          setPaymodeSelectKey(k => k + 1);
        }}
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
          setTimeout(() => document.getElementById("pv-narration")?.focus(), 100);
        }}
      />
    </PageShell>
  );
};

export default PaymentVoucherFormPage;
