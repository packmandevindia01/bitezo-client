import { useEffect } from "react";
import { Printer, Save, RotateCcw, Plus, CreditCard, Trash2 } from "lucide-react";
import { Button, FormInput, PageShell, SearchableSelect } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import { usePermissions } from "../../../../hooks/usePermissions";
import { useCurrency } from "../../../../hooks/useCurrency";
import { usePurchaseInvoice, calculateLine } from "../hooks/usePurchaseInvoice";
import { PosMultiPayModal } from "../../../pos/terminal/components/PosMultiPayModal";


import { useParams } from "react-router-dom";

const PurchaseInvoiceFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = usePermissions();
  const { formatAmount } = useCurrency();
  
  const {
    form,
    items,
    payments,
    setField,
    currentLineTotals,
    totals,
    addItem,
    removeItem,
    showClearConfirm,
    setShowClearConfirm,
    handleReset,
    handleClearClick,
    handleSave,
    isMultiPayOpen,
    setIsMultiPayOpen,
    handleSettlementSubmit,
    masterData,
    loadingMaster,
    masterError,
    productOptions,
    searchingProducts,
    handleProductSearch,
    supplierOptions,
    searchingSuppliers,
    handleSupplierSearch,
    handleProductSelect,
    saving,
  } = usePurchaseInvoice(id);

  const seriesOptions = masterData?.series.map(s => ({ label: s.seriesName, value: s.seriesId.toString() })) || [];
  const branchOptions = masterData?.branches.map(b => ({ label: b.branchName, value: b.branchId.toString() })) || [];
  const salesmanOptions = masterData?.salesman.map(s => ({ label: s.employeeName, value: s.employeeId.toString() })) || [];

  const canAdd = hasPermission("Purchase Invoice", "Add");
  const canEdit = hasPermission("Purchase Invoice", "Edit");
  const canSave = canAdd || canEdit;

  const hk = (e: React.KeyboardEvent, nextId?: string) => {
    if (e.key === "Enter") { e.preventDefault(); if (nextId) document.getElementById(nextId)?.focus(); }
  };

  useEffect(() => { setTimeout(() => { document.getElementById("pi-series")?.focus(); }, 200); }, []);

  return (
    <PageShell title="Purchase Invoice">
      {masterError && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm font-medium text-red-600 border border-red-200">
          Error loading master data: {masterError}
        </div>
      )}
      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm flex flex-col" style={{ maxHeight: "calc(100vh - 120px)" }}>
        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4">

        <div className="grid gap-x-3 gap-y-2 md:grid-cols-5 xl:grid-cols-9">
          <SearchableSelect id="pi-series" label="Series" value={form.series} options={seriesOptions} onChange={(val) => setField("series", val)} onKeyDown={(e) => hk(e, "pi-purchaseNo")} required disabled={!canSave || loadingMaster} />
          <FormInput id="pi-purchaseNo" label="P No" value={form.purchaseNo} onChange={(e) => setField("purchaseNo", e.target.value)} onKeyDown={(e) => hk(e, "pi-purchaseDate")} required readOnly={!canSave} />
          <FormInput id="pi-purchaseDate" label="P Date" type="date" value={form.purchaseDate} onChange={(e) => setField("purchaseDate", e.target.value)} onKeyDown={(e) => hk(e, "pi-invoiceNo")} required readOnly={!canSave} />
          <FormInput id="pi-invoiceNo" label="Inv No" value={form.invoiceNo} onChange={(e) => setField("invoiceNo", e.target.value)} onKeyDown={(e) => hk(e, "pi-refNo")} required readOnly={!canSave} />
          <FormInput id="pi-refNo" label="Ref No" value={form.refNo} onChange={(e) => setField("refNo", e.target.value)} onKeyDown={(e) => hk(e, "pi-invoiceDate")} readOnly={!canSave} />
          <FormInput id="pi-invoiceDate" label="Inv Date" type="date" value={form.invoiceDate} onChange={(e) => setField("invoiceDate", e.target.value)} onKeyDown={(e) => hk(e, "pi-supplier")} required readOnly={!canSave} />
          <SearchableSelect
            id="pi-supplier"
            label="Supplier"
            value={form.supplier}
            options={supplierOptions}
            onSearch={handleSupplierSearch}
            loading={searchingSuppliers}
            onChange={(val) => setField("supplier", val)}
            onKeyDown={(e) => hk(e, "pi-branch")}
            required
            disabled={!canSave}
          />
          <SearchableSelect id="pi-branch" label="Branch" value={form.branch} options={branchOptions} onChange={(val) => setField("branch", val)} onKeyDown={(e) => hk(e, "pi-salesman")} required disabled={!canSave || loadingMaster} />
          <SearchableSelect id="pi-salesman" label="Salesman" value={form.salesman} options={salesmanOptions} onChange={(val) => setField("salesman", val)} onKeyDown={(e) => hk(e, "pi-product")} disabled={!canSave || loadingMaster} />
        </div>

        <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50/70 p-2">
          <div className="grid gap-x-2 gap-y-1 md:grid-cols-[1.5fr_1fr_1fr_0.6fr_0.6fr_0.8fr_0.7fr_0.7fr_0.8fr_0.8fr_0.8fr_0.9fr_auto]">
            <SearchableSelect
              id="pi-product"
              label="Product"
              value={form.product}
              options={productOptions}
              onSearch={handleProductSearch}
              loading={searchingProducts}
              onChange={(val) => {
                setField("product", val);
                const opt = productOptions.find(o => o.value === val);
                if (opt) {
                  setField("code", opt.code || "");
                  handleProductSelect(val, opt.code || "");
                }
              }}
              onKeyDown={(e) => hk(e, "pi-code")}
              disabled={!canSave}
            />
            <FormInput id="pi-code" label="Code" value={form.code} onChange={(e) => setField("code", e.target.value)} onKeyDown={(e) => hk(e, "pi-unit")} readOnly={!canSave} />
            <FormInput id="pi-unit" label="Unit" value={form.unit} onChange={(e) => setField("unit", e.target.value)} onKeyDown={(e) => hk(e, "pi-qty")} readOnly={!canSave} />
            <FormInput id="pi-qty" label="Qty" value={form.qty} inputClassName="text-right" onChange={(e) => setField("qty", e.target.value)} onKeyDown={(e) => hk(e, "pi-foc")} readOnly={!canSave} />
            <FormInput id="pi-foc" label="FOC" value={form.foc} inputClassName="text-right" onChange={(e) => setField("foc", e.target.value)} onKeyDown={(e) => hk(e, "pi-price")} readOnly={!canSave} />
            <FormInput id="pi-price" label="Price" value={form.price} inputClassName="text-right" onChange={(e) => setField("price", e.target.value)} onKeyDown={(e) => hk(e, "pi-vatPercent")} readOnly={!canSave} />
            <FormInput id="pi-vatPercent" label="VAT(%)" value={form.vatPercent} inputClassName="text-right" onChange={(e) => setField("vatPercent", e.target.value)} onKeyDown={(e) => hk(e, "pi-discPercent")} readOnly={!canSave} />
            <FormInput id="pi-discPercent" label="Disc(%)" value={form.discPercent} inputClassName="text-right" onChange={(e) => setField("discPercent", e.target.value)} onKeyDown={(e) => hk(e, "pi-add-btn")} readOnly={!canSave} />
            <FormInput label="Disc Amt" value={formatAmount(currentLineTotals.discountAmount)} inputClassName="text-right" readOnly />
            <FormInput label="Amount" value={formatAmount(currentLineTotals.amount)} inputClassName="text-right" readOnly />
            <FormInput label="VAT Amt" value={formatAmount(currentLineTotals.vatAmount)} inputClassName="text-right" readOnly />
            <FormInput label="Net Amount" value={formatAmount(currentLineTotals.netAmount)} inputClassName="text-right font-bold text-[#49293e]" readOnly />
            <div className="flex items-end pb-1">
              <Button 
                id="pi-add-btn" 
                onClick={addItem} 
                className="h-10.5 w-full"
                disabled={!canSave}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
                icon={<Plus size={18} />}
              >
                Add
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="max-h-[250px] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  {["Product", "Code", "Unit", "Qty", "FOC", "Price", "Amount", "Disc Amt", "VAT Amt", "Net Amount", ""].map(
                    (column, i) => (
                      <th
                        key={i}
                        className="sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400"
                      >
                        {column}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="h-28 px-4 text-center text-sm text-gray-400">
                      No items added
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const line = calculateLine(item);
                    return (
                      <tr key={item.id} className="hover:bg-[#49293e]/5">
                        <td className="border-l-[3px] border-l-[#49293e] px-4 py-3 font-medium text-gray-900">
                          {item.product}
                        </td>
                        <td className="px-4 py-3">{item.code || "-"}</td>
                        <td className="px-4 py-3">{item.unit || "-"}</td>
                        <td className="px-4 py-3">{item.qty}</td>
                        <td className="px-4 py-3">{item.foc}</td>
                        <td className="px-4 py-3 font-mono">{formatAmount(item.price)}</td>
                        <td className="px-4 py-3 font-mono">{formatAmount(line.amount)}</td>
                        <td className="px-4 py-3 font-mono">{formatAmount(line.discountAmount)}</td>
                        <td className="px-4 py-3 font-mono">{formatAmount(line.vatAmount)}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-gray-900">{formatAmount(line.netAmount)}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            disabled={!canSave}
                            title="Remove item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-2 grid gap-3 lg:grid-cols-[1fr_300px]">
          <div className="grid gap-x-3 gap-y-1 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col gap-1 justify-end pb-1">
                <Button
                  onClick={() => setIsMultiPayOpen(true)}
                  disabled={!canSave || totals.grandTotal <= 0 || saving}
                  className="h-10.5 w-full bg-blue-600 hover:bg-blue-700 font-bold"
                  icon={<CreditCard size={18} />}
                >
                  Settle Payments
                </Button>
              </div>
              <FormInput label="DISC(%)" value={form.globalDiscPercent} inputClassName="text-right" onChange={(e) => setField("globalDiscPercent", e.target.value)} readOnly={!canSave} />
              <FormInput label="DISC AMT" value={form.discAmount} inputClassName="text-right" onChange={(e) => setField("discAmount", e.target.value)} readOnly={!canSave} />
              <div className="md:col-span-2 lg:col-span-3">
              <FormInput label="Narration" value={form.narration} onChange={(e) => setField("narration", e.target.value)} readOnly={!canSave} />
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50/40 p-3 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <FormInput label="Other Charge" value={form.otherCharge} inputClassName="text-right" onChange={(e) => setField("otherCharge", e.target.value)} readOnly={!canSave} />
              <FormInput label="Round Off" value={form.roundOff} inputClassName="text-right" onChange={(e) => setField("roundOff", e.target.value)} readOnly={!canSave} />
            </div>
            {payments.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white p-2 flex flex-col gap-1 shadow-sm">
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1 border-b pb-1">Payments</p>
                {payments.map((p, i) => (
                  <div key={i} className="flex justify-between text-xs font-medium text-gray-700">
                    <span className="capitalize">{p.mode}</span>
                    <span className="font-bold text-gray-900">{formatAmount(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg border border-[#49293e]/10 bg-white px-3 py-2 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Grand Total</p>
              <p className="text-xl font-bold text-[#49293e]">{formatAmount(totals.grandTotal)}</p>
            </div>
          </div>
        </div>
        </div>{/* end scrollable body */}

        {/* ── Sticky Action Footer ── */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 bg-white px-6 py-4 rounded-b-3xl">
          {canAdd && (
            <Button 
              variant="secondary" 
              onClick={handleClearClick} 
              tabIndex={-1}
              isAction
              icon={<Plus size={18} />}
            >
              New
            </Button>
          )}
          {canSave && (
            <Button
              onClick={handleSave}
              isAction
              icon={<Save size={18} />}
              loading={saving}
              disabled={saving}
            >
              Save
            </Button>
          )}
          <Button 
            variant="secondary"
            isAction
            icon={<Printer size={18} />}
          >
            Print
          </Button>
          <Button 
            variant="secondary"
            onClick={handleClearClick}
            isAction
            icon={<RotateCcw size={18} />}
          >
            Clear
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear Form"
        message="Are you sure you want to clear the form? All unsaved data will be lost."
        confirmLabel="Clear"
        onConfirm={handleReset}
        onCancel={() => setShowClearConfirm(false)}
      />

      <PosMultiPayModal
        isOpen={isMultiPayOpen}
        onClose={() => setIsMultiPayOpen(false)}
        totalDue={totals.grandTotal}
        onSubmit={handleSettlementSubmit}
      />
    </PageShell>
  );
};

export default PurchaseInvoiceFormPage;
