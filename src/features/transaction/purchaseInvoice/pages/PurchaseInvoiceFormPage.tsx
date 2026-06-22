import { useEffect } from "react";
import { Printer, Save, RotateCcw, Plus, CreditCard, Trash2 } from "lucide-react";
import { Button, FormInput, PageShell, SearchableSelect } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import { usePermissions } from "../../../../hooks/usePermissions";
import { useCurrency } from "../../../../hooks/useCurrency";
import { usePurchaseInvoice, calculateLine } from "../hooks/usePurchaseInvoice";
import { PosMultiPayModal } from "../../../pos/terminal/components/modals/PosMultiPayModal";
import { PurchasePrintPreviewModal } from "../../shared/components/PurchasePrintPreviewModal";
import type { PurchasePrintData } from "../../shared/components/PurchasePrintTemplate";
import { useState, useMemo } from "react";
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

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [shouldResetAfterPrint, setShouldResetAfterPrint] = useState(false);

  const onSaveClick = async () => {
    const success = await handleSave();
    if (success) {
      setIsPrintModalOpen(true);
      setShouldResetAfterPrint(!id);
    }
  };

  const handlePrintModalClose = () => {
    setIsPrintModalOpen(false);
    if (shouldResetAfterPrint) {
      handleReset();
      setShouldResetAfterPrint(false);
    }
  };

  const printData = useMemo<Partial<PurchasePrintData>>(() => {
    const taxSummaryMap = new Map<number, { taxCode: string; taxable: number; vatAmount: number; netAmount: number }>();
    items.forEach((item) => {
      const line = calculateLine(item);
      const pct = item.vatPercent || 0;
      if (!taxSummaryMap.has(pct)) {
        taxSummaryMap.set(pct, { taxCode: `${pct}%`, taxable: 0, vatAmount: 0, netAmount: 0 });
      }
      const summary = taxSummaryMap.get(pct)!;
      summary.taxable += line.amount - line.discountAmount;
      summary.vatAmount += line.vatAmount;
      summary.netAmount += line.netAmount;
    });

    return {
      docTitle: "PURCHASE INVOICE",
      supplierName: supplierOptions.find((s) => s.value === form.supplier)?.label || form.supplier,
      supplierAddress: "",
      supplierTrn: "",
      voucherNo: form.invoiceNo,
      purchaseNo: form.purchaseNo,
      date: form.invoiceDate,
      paymode: payments.length > 0 ? payments[0].mode.toUpperCase() : "CASH",
      items: items.map(item => {
        const line = calculateLine(item);
        return {
          productName: productOptions.find(p => p.value === item.product)?.label || item.product,
          qty: item.qty,
          foc: item.foc,
          unit: item.unit,
          price: item.price,
          discount: item.discPercent,
          amount: line.amount,
          netValue: line.amount - line.discountAmount,
          vatPercent: item.vatPercent,
          vatAmt: line.vatAmount,
          netAmount: line.netAmount
        };
      }),
      totals: {
        total: totals.netAmount - totals.vatAmount + totals.discountAmount,
        discount: totals.discountAmount + parseFloat(form.discAmount || "0"),
        adjustmentAmount: 0,
        roundOff: parseFloat(form.roundOff || "0"),
        vat: totals.vatAmount,
        grandTotal: totals.grandTotal
      },
      taxSummary: Array.from(taxSummaryMap.values())
    };
  }, [form, items, payments, supplierOptions, productOptions, totals]);

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
        <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600 border border-red-200">
          Error loading master data: {masterError}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col" style={{ maxHeight: "calc(100vh - 110px)" }}>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto p-2 md:p-3">

          {/* ── Header Fields ── responsive: 3 cols on mobile, 5 on md, 9 on lg */}
          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-x-2 gap-y-1.5">
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

          {/* ── Item Entry Row ── horizontal scroll on small screens */}
          <div className="mt-1.5 rounded-xl border border-gray-200 bg-gray-50/70 p-2">
            <div className="overflow-x-auto">
              <div className="min-w-[900px] grid grid-cols-[2fr_1fr_1fr_0.6fr_0.6fr_0.8fr_0.7fr_0.7fr_0.8fr_0.8fr_0.8fr_1fr_auto] gap-x-1.5 gap-y-1">
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
                  onKeyDown={(e) => hk(e, "pi-qty")}
                  disabled={!canSave}
                />
                <FormInput id="pi-code" label="Code" value={form.code} readOnly tabIndex={-1} />
                <FormInput id="pi-unit" label="Unit" value={form.unit} readOnly tabIndex={-1} />
                <FormInput id="pi-qty" label="Qty" value={form.qty} inputClassName="text-right" onChange={(e) => setField("qty", e.target.value)} onKeyDown={(e) => hk(e, "pi-foc")} readOnly={!canSave} />
                <FormInput id="pi-foc" label="FOC" value={form.foc} inputClassName="text-right" onChange={(e) => setField("foc", e.target.value)} onKeyDown={(e) => hk(e, "pi-price")} readOnly={!canSave} />
                <FormInput id="pi-price" label="Price" value={form.price} inputClassName="text-right" onChange={(e) => setField("price", e.target.value)} onKeyDown={(e) => hk(e, "pi-vatPercent")} readOnly={!canSave} />
                <FormInput id="pi-vatPercent" label="VAT(%)" value={form.vatPercent} inputClassName="text-right" onChange={(e) => setField("vatPercent", e.target.value)} onKeyDown={(e) => hk(e, "pi-discPercent")} readOnly={!canSave} />
                <FormInput id="pi-discPercent" label="Disc(%)" value={form.discPercent} inputClassName="text-right" onChange={(e) => setField("discPercent", e.target.value)} onKeyDown={(e) => hk(e, "pi-add-btn")} readOnly={!canSave} />
                <FormInput label="Disc Amt" value={formatAmount(currentLineTotals.discountAmount)} inputClassName="text-right" readOnly />
                <FormInput label="Amount" value={formatAmount(currentLineTotals.amount)} inputClassName="text-right" readOnly />
                <FormInput label="VAT Amt" value={formatAmount(currentLineTotals.vatAmount)} inputClassName="text-right" readOnly />
                <FormInput label="Net Amount" value={formatAmount(currentLineTotals.netAmount)} inputClassName="text-right font-bold text-[#49293e]" readOnly />
                <div className="flex items-end pb-0.5">
                  <Button
                    id="pi-add-btn"
                    onClick={addItem}
                    className="h-10.5 w-full"
                    disabled={!canSave}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
                    icon={<Plus size={16} />}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Items Table ── always scrollable horizontally */}
          <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="max-h-[220px] overflow-auto">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    {["Product", "Code", "Unit", "Qty", "FOC", "Price", "Amount", "Disc Amt", "VAT Amt", "Net Amount", ""].map(
                      (col, i) => (
                        <th key={i} className="sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="h-20 px-4 text-center text-sm text-gray-400">
                        No items added
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const line = calculateLine(item);
                      const productLabel = productOptions.find(p => p.value === item.product)?.label || item.product;
                      return (
                        <tr key={item.id} className="hover:bg-[#49293e]/5">
                          <td className="border-l-[3px] border-l-[#49293e] px-3 py-2 font-medium text-gray-900 max-w-[160px] truncate" title={productLabel}>
                            {productLabel}
                          </td>
                          <td className="px-3 py-2 text-gray-600">{item.code || "-"}</td>
                          <td className="px-3 py-2 text-gray-600">{item.unit || "-"}</td>
                          <td className="px-3 py-2 text-right">{item.qty}</td>
                          <td className="px-3 py-2 text-right">{item.foc}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatAmount(item.price)}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatAmount(line.amount)}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatAmount(line.discountAmount)}</td>
                          <td className="px-3 py-2 text-right font-mono">{formatAmount(line.vatAmount)}</td>
                          <td className="px-3 py-2 text-right font-mono font-semibold text-gray-900">{formatAmount(line.netAmount)}</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                              disabled={!canSave}
                              title="Remove item"
                            >
                              <Trash2 size={14} />
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

          {/* ── Bottom Section ── */}
          <div className="mt-2 grid gap-2 lg:grid-cols-[1fr_auto]">
            {/* Left: payments + disc + narration */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-1.5">
              {/* Settle Payments button */}
              <div className="flex flex-col gap-1">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-transparent select-none">-</label>
                <Button
                  onClick={() => setIsMultiPayOpen(true)}
                  disabled={!canSave || totals.grandTotal <= 0 || saving}
                  className="h-10.5 w-full bg-blue-600 hover:bg-blue-700 font-bold text-sm"
                  icon={<CreditCard size={16} />}
                >
                  Settle Payments
                </Button>
              </div>
              <FormInput label="DISC(%)" value={form.globalDiscPercent} inputClassName="text-right" onChange={(e) => setField("globalDiscPercent", e.target.value)} readOnly={!canSave} />
              <FormInput label="DISC AMT" value={form.discAmount} inputClassName="text-right" onChange={(e) => setField("discAmount", e.target.value)} readOnly={!canSave} />
              <div className="col-span-2 sm:col-span-3">
                <FormInput label="Narration" value={form.narration} onChange={(e) => setField("narration", e.target.value)} readOnly={!canSave} />
              </div>
            </div>

            {/* Right: totals panel */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/40 p-2 flex flex-col gap-1.5 min-w-[260px]">
              <div className="grid grid-cols-2 gap-1.5">
                <FormInput label="Other Charge" value={form.otherCharge} inputClassName="text-right" onChange={(e) => setField("otherCharge", e.target.value)} readOnly={!canSave} />
                <FormInput label="Round Off" value={form.roundOff} inputClassName="text-right" onChange={(e) => setField("roundOff", e.target.value)} readOnly={!canSave} />
              </div>
              {payments.length > 0 && (
                <div className="rounded-lg border border-gray-200 bg-white p-2 flex flex-col gap-1 shadow-sm">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-0.5 border-b pb-1">Payments</p>
                  {payments.map((p, i) => (
                    <div key={i} className="flex justify-between text-xs font-medium text-gray-700">
                      <span className="capitalize">{p.mode}</span>
                      <span className="font-bold text-gray-900">{formatAmount(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between rounded-lg border border-[#49293e]/20 bg-white px-3 py-2 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Grand Total</p>
                <p className="text-lg font-bold text-[#49293e]">{formatAmount(totals.grandTotal)}</p>
              </div>
            </div>
          </div>

        </div>{/* end scrollable body */}

        {/* ── Sticky Action Footer ── */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 bg-white px-4 py-3 rounded-b-2xl">
          {canAdd && (
            <Button variant="secondary" onClick={handleClearClick} tabIndex={-1} isAction icon={<Plus size={16} />}>
              New
            </Button>
          )}
          {canSave && (
            <Button onClick={onSaveClick} isAction icon={<Save size={16} />} loading={saving} disabled={saving}>
              Save
            </Button>
          )}
          <Button variant="secondary" isAction icon={<Printer size={16} />} onClick={() => setIsPrintModalOpen(true)} disabled={items.length === 0}>
            Print
          </Button>
          <Button variant="secondary" onClick={handleClearClick} isAction icon={<RotateCcw size={16} />}>
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

      <PurchasePrintPreviewModal
        isOpen={isPrintModalOpen}
        onClose={handlePrintModalClose}
        data={printData}
      />
    </PageShell>
  );
};

export default PurchaseInvoiceFormPage;
