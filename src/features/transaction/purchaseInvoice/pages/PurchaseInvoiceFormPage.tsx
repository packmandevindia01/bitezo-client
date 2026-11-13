import { Plus } from "lucide-react";
import { FormInput, SearchableSelect } from "../../../../components/common";
import { usePurchaseInvoice } from "../hooks/usePurchaseInvoice";
import { useParams } from "react-router-dom";
import { Controller } from "react-hook-form";
import { DocumentFormShell } from "../../shared/documentForm/DocumentFormShell";
import { usePurchaseFormPage } from "../../shared/purchaseForm/usePurchaseFormPage";
import { PurchaseLineGrid } from "../../shared/purchaseForm/PurchaseLineGrid";
import { PurchaseFormFooter } from "../../shared/purchaseForm/PurchaseFormFooter";
import { PurchaseFormDialogs } from "../../shared/purchaseForm/PurchaseFormDialogs";

/** Purchase Invoice form. Grid, footer, dialogs and save flow are shared with Purchase Return (shared/purchaseForm). */
const PurchaseInvoiceFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const doc = usePurchaseInvoice(id);
  const page = usePurchaseFormPage("invoice", doc);
  const { methods, isBranchLocked, loadingMaster, masterError, supplierOptions, searchingSuppliers, handleSupplierSearch } = doc;
  const { register, control, formState: { errors } } = methods;
  const { canSave, hk, seriesOptions, branchOptions, salesmanOptions, setIsSupplierModalOpen } = page;

  return (
    <DocumentFormShell
      title="Purchase Invoice"
      methods={methods}
      closeTo="/dashboard/purchase-invoice"
      masterError={masterError}
      dialogs={<PurchaseFormDialogs kind="invoice" doc={doc} page={page} />}
    >
      {/* ── Static Header Fields ── */}
      <div className="p-2 md:p-3 pb-0 pr-10">

        {/* ── Header Fields ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-2 gap-y-2 mb-2 items-end">
          <Controller name="series" control={control} render={({ field }) => (
            <SearchableSelect required={true} className="h-8 !px-2 !text-xs" id="pi-series" label="Series" value={field.value} options={seriesOptions} onChange={(val) => { field.onChange(val); methods.trigger("series"); }} onKeyDown={(e) => hk(e, "pi-purchaseNo")} disabled={!canSave || loadingMaster} error={errors.series?.message as string} />
          )} />
          <FormInput required={true} inputClassName="!h-8 !px-2 !text-xs cursor-not-allowed text-[#49293e]" id="pi-purchaseNo" label="Purchase No" {...register("purchaseNo", { onChange: () => methods.trigger("purchaseNo") })} onKeyDown={(e) => hk(e, "pi-purchaseDate")} readOnly={true} error={errors.purchaseNo?.message as string} />
          <FormInput required={true} inputClassName="!h-8 !px-2 !text-xs" id="pi-purchaseDate" label="Purchase Date" type="date" max={new Date().toLocaleDateString("en-CA")} {...register("purchaseDate", { onChange: () => methods.trigger("purchaseDate") })} onKeyDown={(e) => hk(e, "pi-invoiceNo")} readOnly={!canSave} error={errors.purchaseDate?.message as string} />
          <FormInput required={true} maxLength={50} inputClassName="!h-8 !px-2 !text-xs" id="pi-invoiceNo" label="Inv No" {...register("invoiceNo", { onChange: () => methods.trigger("invoiceNo") })} onKeyDown={(e) => hk(e, "pi-refNo")} readOnly={!canSave} error={errors.invoiceNo?.message as string} />
          <FormInput maxLength={50} inputClassName="!h-8 !px-2 !text-xs" id="pi-refNo" label="Ref No" {...register("refNo", { onChange: () => methods.trigger("refNo") })} onKeyDown={(e) => hk(e, "pi-invoiceDate")} readOnly={!canSave} error={errors.refNo?.message as string} />
          <FormInput required={true} inputClassName="!h-8 !px-2 !text-xs" id="pi-invoiceDate" label="Inv Date" type="date" max={new Date().toLocaleDateString("en-CA")} {...register("invoiceDate", { onChange: () => methods.trigger("invoiceDate") })} onKeyDown={(e) => hk(e, "pi-supplier")} readOnly={!canSave} error={errors.invoiceDate?.message as string} />
          <div className="col-span-2 sm:col-span-2 md:col-span-2 lg:col-span-2 flex items-end gap-1">
            <div className="flex-1 min-w-0">
              <Controller name="supplier" control={control} render={({ field }) => (
                <SearchableSelect required={true} className="h-8 !px-2 !text-xs" id="pi-supplier" label="Supplier" value={field.value} options={supplierOptions} onSearch={handleSupplierSearch} loading={searchingSuppliers} onChange={(val) => { field.onChange(val); methods.trigger("supplier"); }} onKeyDown={(e) => hk(e, "pi-branch")} disabled={!canSave} error={errors.supplier?.message as string} />
              )} />
            </div>
            <button type="button" onClick={() => setIsSupplierModalOpen(true)} className="mb-1 shrink-0 h-8 w-8 flex items-center justify-center rounded border border-[#49293e] bg-[#49293e] hover:bg-[#3c2232] hover:border-[#3c2232] text-white transition-colors">
              <Plus size={16} />
            </button>
          </div>
          <Controller name="branch" control={control} render={({ field }) => (
            <SearchableSelect required={true} className="h-8 !px-2 !text-xs" id="pi-branch" label="Branch" placeholder="Select Branch" value={field.value} options={branchOptions} onChange={(val) => { field.onChange(val); methods.trigger("branch"); }} onKeyDown={(e) => hk(e, "pi-salesman")} disabled={!canSave || loadingMaster || isBranchLocked} error={errors.branch?.message as string} />
          )} />
          <Controller name="salesman" control={control} render={({ field }) => (
            <SearchableSelect required={true} className="h-8 !px-2 !text-xs" id="pi-salesman" label="Salesman" placeholder="Select Employee" value={field.value} options={salesmanOptions} onChange={(val) => { field.onChange(val); methods.trigger("salesman"); }} disabled={!canSave || loadingMaster} error={errors.salesman?.message as string} />
          )} />
        </div>
      </div>

      <PurchaseLineGrid kind="invoice" doc={doc} page={page} />
      <PurchaseFormFooter kind="invoice" doc={doc} page={page} />
    </DocumentFormShell>
  );
};

export default PurchaseInvoiceFormPage;
