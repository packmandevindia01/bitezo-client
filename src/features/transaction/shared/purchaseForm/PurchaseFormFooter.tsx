import type React from "react";
import { Printer, Save, RotateCcw, Plus } from "lucide-react";
import { Button, FormInput, SearchableSelect } from "../../../../components/common";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useToast } from "../../../../app/providers/useToast";
import type { usePurchaseReturn } from "../../purchaseReturn/hooks/usePurchaseReturn";
import type { PurchaseDoc, PurchaseFormPage, PurchaseKind } from "./usePurchaseFormPage";

interface PurchaseFormFooterProps {
  kind: PurchaseKind;
  doc: PurchaseDoc;
  page: PurchaseFormPage;
}

/**
 * Footer of the Purchase Invoice and Purchase Return forms: bill discount, other charge, round off, narration,
 * the active line's stock and average cost, payments, paymode, grand total and the New / Save / Print / Clear keys.
 * Return's paymode is required (it shows an error). Enter on the paymode goes to Save on both.
 */
export const PurchaseFormFooter = ({ kind, doc, page }: PurchaseFormFooterProps) => {
  const { formatAmount } = useCurrency();
  const { showToast } = useToast();
  const {
    methods, watchedItems, payments, totals, paymodeList, multiPayId, selectedPaymodeId, setIsMultiPayOpen,
    handleSinglePayment, handleClearClick, saving,
  } = doc;
  const { register } = methods as any;
  const setValue = (methods as any).setValue;
  const { cfg, canAdd, canSave, hk, activeItem, onSaveClick, previousPaymodeIdRef, paymodeSelectKey, setIsPrintModalOpen } = page;
  const isReturn = kind === "return";
  const returnDoc = doc as ReturnType<typeof usePurchaseReturn>;
  const p = cfg.prefix;

  return (
    <div className="border-t border-gray-200 bg-gray-50/50 p-3 rounded-b-2xl shrink-0 flex flex-col gap-3">

      {/* Top Row: Adjustments */}
      <div className="flex flex-wrap items-end gap-2 w-full">
        <div className="w-20">
          <FormInput
            id={`${p}-disc-pct`}
            label="Disc(%)"
            type="number"
            step="any"
            maxLength={10}
            {...register("globalDiscPercent", {
              onChange: (e: any) => {
                const val = e.target.value;
                if (!val || val === "0" || Number(val) === 0) {
                  if (!isReturn) setValue("globalDiscPercent", "");
                  setValue("discAmount", formatAmount(0));
                } else {
                  if (!isReturn) setValue("globalDiscPercent", val);
                  const total = watchedItems.reduce((acc: number, item: any) => acc + (Number(item.qty || 0) * Number(item.price || 0)), 0);
                  const newDiscAmt = formatAmount(total * (Number(val) / 100));
                  setValue("discAmount", newDiscAmt);
                }
              }
            })}
            min="0"
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => hk(e, `${p}-disc-amt`)}
            inputClassName="text-right !h-8 !text-xs !px-2"
            readOnly={!canSave}
          />
        </div>
        <div className="w-24">
          <FormInput
            id={`${p}-disc-amt`}
            label="Disc Amt"
            type="number"
            step="any"
            maxLength={12}
            {...register("discAmount", {
              onChange: (e: any) => {
                const val = e.target.value;
                // Entering a manual discount amount clears the percentage field so both are not set simultaneously
                setValue("globalDiscPercent", "");
                setValue("discAmount", val);
              }
            })}
            min="0"
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => hk(e, `${p}-other-chg`)}
            inputClassName="text-right !h-8 !text-xs !px-2"
            readOnly={!canSave}
          />
        </div>
        <div className="w-24">
          <FormInput id={`${p}-other-chg`} label="Other Chg" type="number" step="any" maxLength={12} {...register("otherCharge")} min="0" onFocus={(e) => e.target.select()} onKeyDown={(e) => hk(e, `${p}-round-off`)} inputClassName="text-right !h-8 !text-xs !px-2" readOnly={!canSave} />
        </div>
        <div className="w-20">
          <FormInput id={`${p}-round-off`} label="Round Off" type="number" step="any" maxLength={8} {...register("roundOff")} min="0" onFocus={(e) => e.target.select()} onKeyDown={(e) => hk(e, `${p}-narration`)} inputClassName="text-right !h-8 !text-xs !px-2" readOnly={!canSave} />
        </div>
        <div className="flex-1 min-w-[80px]">
          <FormInput id={`${p}-narration`} label="Narration" maxLength={200} {...register("narration")} onKeyDown={(e) => hk(e, `${p}-paymode`)} inputClassName="!h-8 !text-xs !px-2" readOnly={!canSave} />
        </div>
        <div className="flex flex-col gap-0.5 w-24 shrink-0">
           <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Stock</label>
           <div className="h-8 px-2 rounded-md border border-gray-200 bg-white flex items-center text-xs font-mono font-bold text-gray-700">
             {activeItem.stock || "0.000"}
           </div>
        </div>
        <div className="flex flex-col gap-0.5 w-24 shrink-0">
           <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Avg Cost</label>
           <div className="h-8 px-2 rounded-md border border-gray-200 bg-white flex items-center justify-end text-xs font-mono font-bold text-gray-700">
             {formatAmount(activeItem.avgCost || 0)}
           </div>
        </div>
        <div className="min-w-[120px] max-w-[200px]">
          <div className="flex flex-col gap-0.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Payments</label>
            <div className="h-8 px-2 rounded-md border border-gray-200 bg-gray-50 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide text-xs font-bold text-gray-600">
              {payments.length > 0 ? (
                payments.map((pay: any, i: number) => (
                  <span key={i} className="capitalize shrink-0">
                    {pay.mode}: {formatAmount(Number(pay.amount))}
                  </span>
                ))
              ) : (
                <span className="font-mono font-normal text-gray-400">{formatAmount(0)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Actions & Total */}
      <div className="flex flex-wrap items-center justify-between gap-3 w-full border-t border-gray-200 pt-3">
        {/* Paymode Dropdown + Settle Payments */}
        <div className={isReturn ? "flex items-start gap-1.5 min-w-[200px]" : "flex items-start gap-2"}>
          <div className={isReturn ? "w-40" : "w-36"}>
            <SearchableSelect
              key={paymodeSelectKey}
              id={`${p}-paymode`}
              label="Paymode"
              {...(isReturn ? { required: true, error: returnDoc.paymodeError } : {})}
              // Enter → Save on both (2026-11-14; the invoice's default Cash used to keep Enter here). The payment follows the total.
              onKeyDown={(e: React.KeyboardEvent) => hk(e, `${p}-save-btn`)}
              value={selectedPaymodeId === multiPayId ? String(multiPayId) : String(selectedPaymodeId || "")}
              forcePlacement="top"
              onChange={(val) => {
                const id = Number(val);
                if (isReturn && id > 0) {
                  returnDoc.setPaymodeError("");
                }
                const paymode = paymodeList.find((pm: { paymodeId: number; paymodeName: string }) => pm.paymodeId === id);
                const isMultiPay = paymode?.paymodeName?.toLowerCase().includes("multi") || (multiPayId > 0 && id === multiPayId);
                if (isMultiPay) {
                  // Save current selection; commit multiPayId only on modal submit
                  previousPaymodeIdRef.current = selectedPaymodeId;
                  if (totals.grandTotal <= 0) {
                    showToast("Please add items with a price to enable MultiPay settlement", "warning");
                  } else {
                    setIsMultiPayOpen(true);
                  }
                } else if (paymode) {
                  // Single paymode — auto-set full grand total, no modal needed
                  handleSinglePayment(id, paymode.paymodeName, totals.grandTotal);
                  // After paymode selection — focus Save button
                  setTimeout(() => document.getElementById(`${p}-save-btn`)?.focus(), 150);
                }
              }}
              placeholder="Paymode"
              options={(paymodeList || []).map((pm: any) => ({ label: pm.paymodeName, value: String(pm.paymodeId) }))}
              disabled={!canSave || saving}
              className="!h-9"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 justify-end flex-1">
          <div className="flex items-baseline gap-2 bg-white px-4 py-1.5 rounded-lg border border-gray-200 shadow-sm">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Grand Total</span>
            <span className="text-xl font-bold text-[#49293e] leading-none">{formatAmount(totals.grandTotal)}</span>
          </div>

          <div className="flex items-center gap-1.5 sm:border-l border-gray-300 sm:pl-4">
            {canAdd && (
              <Button type="button" variant="secondary" onClick={handleClearClick} tabIndex={-1} isAction icon={<Plus size={16} />}>
                New
              </Button>
            )}
            {canSave && (
              <Button id={`${p}-save-btn`} type="button" onClick={onSaveClick} isAction icon={<Save size={16} />} loading={saving} disabled={saving}>
                Save
              </Button>
            )}
            <Button type="button" variant="secondary" isAction icon={<Printer size={16} />} onClick={() => setIsPrintModalOpen(true)} disabled={watchedItems.length === 0 || watchedItems[0]?.product === ""}>
              Print
            </Button>
            <Button type="button" variant="secondary" onClick={handleClearClick} isAction icon={<RotateCcw size={16} />}>
              Clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
