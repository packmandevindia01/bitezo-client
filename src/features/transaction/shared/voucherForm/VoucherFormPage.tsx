import type React from "react";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Trash2, Printer } from "lucide-react";
import { PageShell, FormInput, SearchableSelect, Button, ConfirmDialog } from "../../../../components/common";
import { multiPaymodeId } from "../voucherCalc";
import { BackofficeMultiPayModal } from "../components/BackofficeMultiPayModal";
import { VoucherPrintPreviewModal } from "../components/VoucherPrintPreviewModal";
import type { VoucherPrintData } from "../components/VoucherPrintTemplate";
import { numberToWords } from "../../../../utils/numberToWords";
import { toLocalDateString, formatDateOnly } from "../../../../shared/lib/date";
import type { useVoucherForm } from "../useVoucherForm";

export type VoucherKind = "payment" | "receipt";

const VOUCHER_KIND = {
  payment: { prefix: "pv", label: "Payment", voucherType: "PAYMENT", cashName: "CASH PAYMENT", listPath: "/dashboard/payment-voucher" },
  receipt: { prefix: "rv", label: "Receipt", voucherType: "RECEIPT", cashName: "CASH RECEIPT", listPath: "/dashboard/receipt-voucher" },
} as const;

interface VoucherFormPageProps {
  kind: VoucherKind;
  /** Saved voucher being opened (edit), if any. */
  id?: string;
  doc: Omit<ReturnType<typeof useVoucherForm>, "vouchers">;
}

/**
 * Payment Voucher and Receipt Voucher form (2026-11-13; the two pages were copies that had drifted apart).
 * Behaviour chosen by the owner when they were merged:
 * - Changing the branch clears series, voucher no, employee, paymode and account (they belong to the branch).
 * - Field errors show once Save has been pressed.
 * - Closing the MultiPay window without paying brings back the paymode chosen before it.
 * - Amount up to 12 characters; Narration is a 2-line box (Enter goes to Save, Shift+Enter adds a line).
 */
export const VoucherFormPage = ({ kind, id, doc }: VoucherFormPageProps) => {
  const cfg = VOUCHER_KIND[kind];
  const p = cfg.prefix;
  const isEditMode = !!id;
  const navigate = useNavigate();
  const {
    form, onSubmit, clearForm, isSaving, formBranchList, employeeList, seriesList, accountList, paymodeList,
    isCancelled, cancelMutation, isMultiPayOpen, setIsMultiPayOpen, isBranchLocked, savedAt,
  } = doc;

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  // The paymode chosen before MultiPay, restored if the MultiPay window is closed without paying.
  // The key re-mounts the paymode list so it does not keep showing "MultiPay".
  const previousPaymodeIdRef = useRef<number>(0);
  const [paymodeSelectKey, setPaymodeSelectKey] = useState(0);

  const canSave = !isCancelled;

  const { watch, setValue, formState: { errors, isSubmitted } } = form;
  const showErr = (err?: string) => (isSubmitted ? err : undefined);

  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextFieldId) {
        document.getElementById(nextFieldId)?.focus();
      }
    }
  };

  const formValues = form.watch();
  const printData = useMemo<Partial<VoucherPrintData>>(() => {
    const vals = form.getValues();
    const account = accountList.find(a => a.accountId === Number(vals.accountId));
    const paymode = paymodeList.find(pm => pm.paymodeId === Number(vals.paymodeId));

    return {
      voucherType: cfg.voucherType,
      voucherNo: vals.voucherNo || "",
      date: vals.voucherDate ? formatDateOnly(vals.voucherDate) : "",
      savedAt,
      paymentType: paymode?.paymodeName || cfg.cashName,
      partyName: account?.accountName || "",
      amount: Number(vals.amount) || 0,
      amountInWords: numberToWords(Number(vals.amount) || 0).toUpperCase(),
      narration: vals.narration || "",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recomputed whenever any form value changes, as before
  }, [formValues, accountList, paymodeList, savedAt]);

  const handleCancelVoucher = async () => {
    if (id) {
      await cancelMutation.mutateAsync(Number(id));
      setCancelModalOpen(false);
      navigate(cfg.listPath);
    }
  };

  return (
    <PageShell title={isEditMode ? (isCancelled ? `View ${cfg.label} Voucher` : `Edit ${cfg.label} Voucher`) : `Add ${cfg.label} Voucher`}>
      <div className="w-full max-w-5xl mx-auto pt-14 pb-6 px-6 bg-white border border-gray-200 rounded-2xl shadow-sm relative">
        <button
          type="button"
          onClick={() => navigate(cfg.listPath)}
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          title="Close"
          tabIndex={-1}
        >
          <X size={20} />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
          {/* Column 1 */}
          <div className="flex flex-col gap-4">
            <SearchableSelect
              id={`${p}-branch`}
              label="BRANCH"
              autoFocus
              value={String(watch("branchId") || "")}
              onChange={(val) => {
                const newBranchId = Number(val);
                setValue("branchId", newBranchId, { shouldValidate: true });
                setValue("seriesId", 0);
                setValue("voucherNo", "");
                setValue("employeeId", 0);
                setValue("paymodeId", 0);
                setValue("accountId", 0);
                setValue("accountName", "");
              }}
              placeholder="Select Branch"
              options={formBranchList.map((b: {branchId: number, branchName: string}) => ({ label: b.branchName, value: String(b.branchId) }))}
              onKeyDown={(e) => handleKeyDown(e as any, `${p}-series`)}
              tabIndex={1}
              disabled={!canSave || isBranchLocked}
              required
              error={showErr(errors.branchId?.message)}
            />

            <FormInput
              id={`${p}-date`}
              label="DATE"
              type="date"
              max={toLocalDateString()}
              value={watch("voucherDate")}
              onChange={(e) => setValue("voucherDate", e.target.value, { shouldValidate: true })}
              onKeyDown={(e) => handleKeyDown(e, `${p}-employee`)}
              tabIndex={3}
              readOnly={!canSave}
              required
              error={showErr(errors.voucherDate?.message)}
            />

            <FormInput
              id={`${p}-no`}
              label="VCH NO"
              readOnly
              value={watch("voucherNo")}
              onChange={(e) => setValue("voucherNo", e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, `${p}-refno`)}
              tabIndex={5}
            />

            <SearchableSelect
              id={`${p}-account`}
              label="ACCOUNT"
              value={String(watch("accountId") || "")}
              onChange={(val) => {
                const accId = Number(val);
                setValue("accountId", accId, { shouldValidate: true });
                const selectedAccount = accountList.find(a => a.accountId === accId);
                if (selectedAccount) setValue("accountName", selectedAccount.accountName, { shouldValidate: true });
                else setValue("accountName", "", { shouldValidate: true });
              }}
              placeholder="Select Account"
              options={accountList.map(a => ({ label: a.accountName, value: String(a.accountId) }))}
              onKeyDown={(e) => handleKeyDown(e as any, `${p}-amount`)}
              tabIndex={7}
              disabled={!canSave}
              required
              error={showErr(errors.accountId?.message || errors.accountName?.message)}
            />

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <SearchableSelect
                  key={paymodeSelectKey}
                  id={`${p}-paymode`}
                  label="PAYMODE"
                  value={String(watch("paymodeId") || "")}
                  onChange={(val) => {
                    const numVal = Number(val);
                    const isMulti = numVal === multiPaymodeId(paymodeList);
                    if (isMulti) previousPaymodeIdRef.current = Number(watch("paymodeId") || 0);
                    setValue("paymodeId", numVal, { shouldValidate: true });
                    if (isMulti) setIsMultiPayOpen(true);
                  }}
                  placeholder="Select Paymode"
                  options={paymodeList.map(pm => ({ label: pm.paymodeName, value: String(pm.paymodeId) }))}
                  onKeyDown={(e) => handleKeyDown(e as any, `${p}-narration`)}
                  tabIndex={9}
                  disabled={!canSave}
                  required={true}
                  error={showErr(errors.paymodeId?.message)}
                />
              </div>
            </div>
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-4">
            <SearchableSelect
              id={`${p}-series`}
              label="SERIES"
              value={String(watch("seriesId") || "")}
              onChange={(val) => {
                const newSeriesId = Number(val);
                setValue("seriesId", newSeriesId, { shouldValidate: true });
                if (!newSeriesId) {
                  setValue("voucherNo", "");
                }
              }}
              placeholder="Select Series"
              options={seriesList.map(s => ({ label: s.seriesName, value: String(s.seriesId) }))}
              onKeyDown={(e) => handleKeyDown(e as any, `${p}-date`)}
              tabIndex={2}
              disabled={!canSave}
              required
              error={showErr(errors.seriesId?.message)}
            />

            <SearchableSelect
              id={`${p}-employee`}
              label="EMPLOYEE"
              value={String(watch("employeeId") || "")}
              onChange={(val) => setValue("employeeId", Number(val), { shouldValidate: true })}
              placeholder="Select Employee"
              options={employeeList.map(e => ({ label: e.employeeName, value: String(e.employeeId) }))}
              onKeyDown={(e) => handleKeyDown(e as any, `${p}-no`)}
              tabIndex={4}
              disabled={!canSave}
              required
              error={showErr(errors.employeeId?.message)}
            />

            <FormInput
              id={`${p}-refno`}
              label="REF NO"
              {...form.register("refNo")}
              onKeyDown={(e) => handleKeyDown(e, `${p}-account`)}
              tabIndex={6}
              readOnly={!canSave}
              maxLength={50}
              error={showErr(errors.refNo?.message)}
            />

            <FormInput
              id={`${p}-amount`}
              label="AMOUNT"
              type="number"
              inputClassName="text-right"
              {...form.register("amount")}
              onKeyDown={(e) => handleKeyDown(e, `${p}-paymode`)}
              tabIndex={8}
              readOnly={!canSave}
              maxLength={12}
              error={showErr(errors.amount?.message)}
              required
            />

            <div className="flex flex-col gap-1 mb-1 w-full relative">
              <label htmlFor={`${p}-narration`} className="flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-0.5">
                NARRATION
              </label>
              <textarea
                id={`${p}-narration`}
                {...form.register("narration")}
                maxLength={200}
                readOnly={!canSave}
                tabIndex={10}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    document.getElementById(`${p}-save`)?.focus();
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
            id={`${p}-clear`}
            type="button"
            variant="secondary"
            onClick={clearForm}
            tabIndex={-1}
            disabled={isSaving || !canSave}
            className="w-32"
          >
            Clear
          </Button>
          <Button
            id={`${p}-print`}
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
            id={`${p}-save`}
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
        title={`Delete ${cfg.label} Voucher`}
        message={`Are you sure you want to delete this ${cfg.label} Voucher?`}
        confirmLabel="Yes, Delete it"
        onConfirm={handleCancelVoucher}
        onCancel={() => setCancelModalOpen(false)}
        loading={cancelMutation?.isPending}
      />

      <BackofficeMultiPayModal
        isOpen={isMultiPayOpen}
        paymodes={paymodeList}
        initialPayments={watch("paymodes")}
        onClose={() => {
          setIsMultiPayOpen(false);
          setValue("paymodeId", previousPaymodeIdRef.current);
          setPaymodeSelectKey(k => k + 1);
        }}
        totalDue={Number(watch("amount") || 0)}
        onSubmit={(payments) => {
          setIsMultiPayOpen(false);
          const mappedPayments = payments.map(pay => ({
            paymodeId: pay.paymodeId,
            amount: pay.amount,
            paymodeName: pay.mode
          }));
          setValue("paymodeId", 3); // Set master paymode to Multi
          setValue("paymodes", mappedPayments); // Set the array
          setTimeout(() => document.getElementById(`${p}-narration`)?.focus(), 100);
        }}
      />
    </PageShell>
  );
};
