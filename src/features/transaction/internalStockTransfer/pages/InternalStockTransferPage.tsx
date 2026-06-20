import { useState } from "react";
import { Trash2, Plus, AlertCircle, X, Printer } from "lucide-react";
import { Button, FormInput, PageShell, SearchableSelect, SelectInput } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import InternalStockTransferPrintModal from "../components/InternalStockTransferPrintModal";
import { useInternalStockTransfer } from "../hooks/useInternalStockTransfer";
import { formatAmount } from "../../../../utils/formatters";
import { useParams } from "react-router-dom";

const InternalStockTransferPage = () => {
  const { id } = useParams<{ id: string }>();
  const {
    form,
    setForm,
    items,
    setItems,
    loading,
    saving,
    error,
    setError,
    branches,
    toBranches,
    salesmen,
    productOptions,
    unitOptions,
    addItem,
    removeItem,
    handleSave,
    grandTotal,
  } = useInternalStockTransfer(id);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // TODO: Add actual permission checks based on user roles
  const canAdd = true; // hasPermission("Internal Stock Transfer", "Add");
  const canEdit = true; // hasPermission("Internal Stock Transfer", "Edit");
  const canDelete = true; // hasPermission("Internal Stock Transfer", "Delete");
  const canSave = canAdd || canEdit;

  const setField = (key: keyof typeof form, value: string) => {
    if (!canSave) return;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const hk = (e: React.KeyboardEvent, nextId?: string) => {
    if (e.key === "Enter") { e.preventDefault(); if (nextId) document.getElementById(nextId)?.focus(); }
  };

  const handleClearClick = () => {
    const isDirty = items.length > 0;
    if (isDirty) {
      setShowClearConfirm(true);
    } else {
      setItems([]);
      // Reset form could go here, but clear button generally just clears items in transaction pages
    }
  };

  return (
    <PageShell title="INTERNAL STOCK TRANSFER">
      <div className="mx-auto max-w-[1200px] rounded-3xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)} className="shrink-0 rounded p-0.5 hover:bg-red-100">
              <X size={14} />
            </button>
          </div>
        )}

        {/* HEADER GRID: Prototype shows all in one row. Responsive maps to md:grid-cols-3 lg:grid-cols-5 */}
        <div className="grid gap-x-4 gap-y-4 mb-4 grid-cols-1 md:grid-cols-3 lg:grid-cols-5">
          <FormInput 
            id="ist-refNo"
            label="REF NO" 
            value={form.refNo}
            onChange={(e) => setField("refNo", e.target.value)}
            disabled={!canSave}
            readOnly
          />
          <FormInput 
            id="ist-date"
            label="DATE" 
            type="date"
            required
            autoFocus
            value={form.transDate}
            onChange={(e) => setField("transDate", e.target.value)}
            disabled={!canSave}
          />
          <SearchableSelect 
            label="FROM BRANCH" 
            required
            options={branches}
            value={form.fromBranch}
            onChange={(val) => setField("fromBranch", val)}
            disabled={!canSave}
          />
          <SearchableSelect 
            label="TO BRANCH" 
            required
            options={toBranches}
            value={form.toBranch}
            onChange={(val) => setField("toBranch", val)}
            disabled={!canSave}
          />
          <SearchableSelect 
            label="SALESMAN" 
            options={salesmen}
            value={form.salesman}
            onChange={(val) => setField("salesman", val)}
            disabled={!canSave}
          />
        </div>

        {/* LINE ITEM ENTRY */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50/70 p-3">
          <div className="grid gap-x-3 gap-y-1 grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto]">
            <SearchableSelect 
              id="ist-product"
              label="PRODUCT" 
              options={productOptions}
              value={form.product}
              onChange={(val) => setField("product", val)}
              disabled={!canAdd}
            />
            <FormInput id="ist-code" label="CODE" value={form.code} onChange={(e) => setField("code", e.target.value)} onKeyDown={(e) => hk(e, "ist-unit")} readOnly />
            <SelectInput 
              id="ist-unit" 
              label="UNIT" 
              options={unitOptions} 
              value={form.unit} 
              onChange={(e) => {
                const val = e.target.value;
                setField("unit", val);
                const selected = unitOptions.find(o => o.value === val);
                if (selected) setField("unitName", selected.label);
              }} 
              disabled={!canAdd || unitOptions.length <= 1} 
            />
            <FormInput id="ist-qty" label="QTY" type="number" value={form.qty} onChange={(e) => setField("qty", e.target.value)} inputClassName="text-right" onKeyDown={(e) => hk(e, "ist-add-btn")} readOnly={!canAdd} />
            <FormInput id="ist-cost" label="COST" value={formatAmount(form.cost)} onChange={() => {}} inputClassName="text-right" readOnly />
            <FormInput id="ist-amt" label="AMT" value={formatAmount(form.amount)} onChange={() => {}} inputClassName="text-right" readOnly />
            <div className="flex items-end pb-1">
              <Button
                id="ist-add-btn"
                onClick={addItem}
                className="h-10.5 w-full px-8"
                disabled={!canAdd}
                icon={<Plus size={18} />}
              >
                ADD
              </Button>
            </div>
          </div>
        </div>

        {/* DATA TABLE */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-widest text-slate-800 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">PRODUCT</th>
                <th className="px-4 py-3">CODE</th>
                <th className="px-4 py-3">UNIT</th>
                <th className="px-4 py-3 text-right">QTY</th>
                <th className="px-4 py-3 text-right">COST</th>
                <th className="px-4 py-3 text-right">AMOUNT</th>
                <th className="w-16 px-4 py-3 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400">
                    {/* Placeholder space for the large empty area shown in prototype */}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{item.productName}</td>
                    <td className="px-4 py-2.5 text-gray-600">{item.code}</td>
                    <td className="px-4 py-2.5 text-gray-600">{item.unitName}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">{item.qty}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{formatAmount(item.cost)}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">{formatAmount(item.amount)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={!canAdd}
                        className="inline-flex rounded-lg p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
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

        {/* GRAND TOTAL */}
        <div className="mt-4 flex justify-end items-center gap-4">
          <span className="text-[12px] font-bold uppercase tracking-widest text-slate-800">GRAND TOTAL</span>
          <div className="w-48">
            <FormInput 
              value={formatAmount(grandTotal)} 
              onChange={() => {}} 
              inputClassName="text-right font-bold text-lg bg-gray-50" 
              readOnly 
            />
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="mt-8 flex flex-col-reverse justify-end gap-3 md:flex-row">
          <Button variant="danger" className="w-full md:w-32" onClick={() => {}} disabled={!canDelete || items.length === 0} tabIndex={-1}>
            DELETE
          </Button>
          {canSave && (
            <Button className="w-full md:w-32" onClick={handleSave} disabled={loading || saving} loading={saving}>
              SAVE
            </Button>
          )}
          <Button variant="secondary" className="w-full md:w-32" onClick={handleClearClick} tabIndex={-1}>
            NEW
          </Button>
          <Button 
            variant="secondary" 
            className="w-full md:w-auto" 
            onClick={() => setIsPrintModalOpen(true)} 
            icon={<Printer size={18} />}
          >
            EXPORT / PRINT
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear Form"
        message="Are you sure you want to clear the form? All unsaved data will be lost."
        confirmLabel="Clear Data"
        confirmVariant="danger"
        onConfirm={() => {
          setItems([]);
          setShowClearConfirm(false);
        }}
        onCancel={() => setShowClearConfirm(false)}
      />

      <InternalStockTransferPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        form={form}
        items={items}
        branches={branches}
        toBranches={toBranches}
      />
    </PageShell>
  );
};

export default InternalStockTransferPage;
