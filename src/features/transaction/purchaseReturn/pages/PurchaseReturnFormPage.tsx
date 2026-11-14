import { Plus } from "lucide-react";
import { FormInput, SearchableSelect, AutocompleteInput } from "../../../../components/common";
import { usePurchaseReturn } from "../hooks/usePurchaseReturn";
import { useParams } from "react-router-dom";
import { Controller } from "react-hook-form";
import { DocumentFormShell } from "../../shared/documentForm/DocumentFormShell";
import { usePurchaseFormPage } from "../../shared/purchaseForm/usePurchaseFormPage";
import { PurchaseLineGrid } from "../../shared/purchaseForm/PurchaseLineGrid";
import { PurchaseFormFooter } from "../../shared/purchaseForm/PurchaseFormFooter";
import { PurchaseFormDialogs } from "../../shared/purchaseForm/PurchaseFormDialogs";

/**
 * Purchase Return form. Grid, footer, dialogs and save flow are shared with Purchase Invoice (shared/purchaseForm).
 * Its own header: the return number and date, and an invoice lookup that fills the lines from a saved invoice.
 */
const PurchaseReturnFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const doc = usePurchaseReturn(id);
  const page = usePurchaseFormPage("return", doc);
  const {
    methods, isBranchLocked, loadingMaster, masterError, supplierOptions, searchingSuppliers, handleSupplierSearch,
    invoiceOptions, searchingInvoices, handleInvoiceSearch, handleInvoiceSelect, purchaseId,
  } = doc;
  const { register, control, getValues, formState: { errors } } = methods;
  const { canSave, hk, firstLineId, seriesOptions, branchOptions, salesmanOptions, setIsSupplierModalOpen } = page;

  const watchedBranch = getValues("branch");
  const watchedSupplier = getValues("supplier");

  return (
    <DocumentFormShell
      title="Purchase Return"
      methods={methods}
      closeTo="/dashboard/purchase-return"
      masterError={masterError}
      dialogs={<PurchaseFormDialogs kind="return" doc={doc} page={page} />}
    >
      {/* ── Static Header Fields ── */}
      <div className="p-2 md:p-3 pb-0 pr-10">

        {/* ── Header Fields ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-2 gap-y-2 items-end">
          <Controller name="series" control={control} render={({ field }) => (
            <SearchableSelect required={true} className="h-8 !px-2 !text-xs" id="pr-series" label="Series" value={field.value} options={seriesOptions} onChange={(val) => { field.onChange(val); methods.trigger("series"); }} onKeyDown={(e) => hk(e, "pr-purchaseDate")} disabled={!canSave || loadingMaster} error={errors.series?.message as string} />
          )} />
          <FormInput required={true} inputClassName="!h-8 !px-2 !text-xs cursor-not-allowed text-[#49293e]" id="pr-purchaseNo" label="Return No" {...register("purchaseNo", { onChange: () => methods.trigger("purchaseNo") })} onKeyDown={(e) => hk(e, "pr-purchaseDate")} readOnly={true} error={errors.purchaseNo?.message as string} />
          <FormInput required={true} inputClassName="!h-8 !px-2 !text-xs" id="pr-purchaseDate" label="Return Date" type="date" max={new Date().toLocaleDateString("en-CA")} {...register("purchaseDate", { onChange: () => methods.trigger("purchaseDate") })} onKeyDown={(e) => hk(e, "pr-supplier")} readOnly={!canSave} error={errors.purchaseDate?.message as string} />

          <div className="col-span-2 sm:col-span-2 md:col-span-2 lg:col-span-2 flex items-end gap-1">
            <div className="flex-1 min-w-0">
              <Controller name="supplier" control={control} render={({ field }) => (
                <SearchableSelect required={true} className="h-8 !px-2 !text-xs" id="pr-supplier" label="Supplier" value={field.value} options={supplierOptions} onSearch={handleSupplierSearch} loading={searchingSuppliers} onChange={(val) => { field.onChange(val); methods.trigger("supplier"); }} onKeyDown={(e) => hk(e, ["pr-branch", "pr-invoiceNo", "pr-refNo"])} disabled={!canSave} error={errors.supplier?.message as string} />
              )} />
            </div>
            <button type="button" onClick={() => setIsSupplierModalOpen(true)} className="mb-1 shrink-0 h-8 w-8 flex items-center justify-center rounded border border-[#49293e] bg-[#49293e] hover:bg-[#3c2232] hover:border-[#3c2232] text-white transition-colors">
              <Plus size={16} />
            </button>
          </div>
          <Controller name="branch" control={control} render={({ field }) => (
            <SearchableSelect required={true} className="h-8 !px-2 !text-xs" id="pr-branch" label="Branch" placeholder="Select Branch" value={field.value} options={branchOptions} onChange={(val) => { field.onChange(val); methods.trigger("branch"); }} onKeyDown={(e) => hk(e, ["pr-invoiceNo", "pr-refNo"])} disabled={!canSave || loadingMaster || isBranchLocked} error={errors.branch?.message as string} />
          )} />

          <Controller name="invoiceNo" control={control} render={({ field }) => (
            <AutocompleteInput
              required={false}
              inputClassName="!h-8 !px-2 !text-xs"
              id="pr-invoiceNo"
              label="Inv No"
              maxLength={50}
              value={field.value}
              options={invoiceOptions}
              onSearch={handleInvoiceSearch}
              loading={searchingInvoices}
              onChange={(val) => { field.onChange(val); methods.trigger("invoiceNo"); }}
              onSelectOption={(val, label) => handleInvoiceSelect(val, label)}
              onKeyDown={(e) => hk(e, "pr-refNo")}
              disabled={!canSave || !watchedBranch || !watchedSupplier || (!!id && purchaseId > 0)}
            />
          )} />

          <Controller name="refNo" control={control} render={({ field }) => (
            <FormInput
              id="pr-refNo"
              label="Ref No"
              value={field.value}
              maxLength={50}
              onChange={(e) => { field.onChange(e.target.value.toUpperCase()); methods.trigger("refNo"); }}
              onKeyDown={(e) => hk(e, "pr-salesman")}
              inputClassName="!h-8 !text-xs !px-2"
              readOnly={!canSave}
              error={errors.refNo?.message as string}
            />
          )} />
          <Controller name="salesman" control={control} render={({ field }) => (
            <SearchableSelect required={true} className="h-8 !px-2 !text-xs" id="pr-salesman" label="Salesman" value={field.value} options={salesmanOptions} onChange={(val) => { field.onChange(val); methods.trigger("salesman"); }} onKeyDown={(e) => hk(e, firstLineId())} disabled={!canSave || loadingMaster} error={errors.salesman?.message as string} />
          )} />
        </div>
      </div>

      <PurchaseLineGrid kind="return" doc={doc} page={page} />
      <PurchaseFormFooter kind="return" doc={doc} page={page} />
    </DocumentFormShell>
  );
};

export default PurchaseReturnFormPage;
