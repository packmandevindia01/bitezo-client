import { useState } from "react";
import { Save, Trash2, Plus, AlertCircle, X } from "lucide-react";
import { Button, FormInput, PageShell, SearchableSelect, SelectInput } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import { useBom } from "../hooks/useBom";
import { usePermissions } from "../../../../hooks/usePermissions";
import { useSearchParams } from "react-router-dom";

const BomPage = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const { hasPermission } = usePermissions();
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
    finProductOptions,
    rawProductOptions,
    addItem,
    removeItem,
    handleSave,
  } = useBom(id);

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const canAdd = hasPermission("BOM Master", "Add");
  const canEdit = hasPermission("BOM Master", "Edit");
  const canDelete = hasPermission("BOM Master", "Delete");
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
    }
  };

  return (
    <PageShell title="BOM">
      <div className="mx-auto max-w-5xl rounded-3xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)} className="shrink-0 rounded p-0.5 hover:bg-red-100">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="grid gap-x-4 gap-y-4 mb-4 md:grid-cols-2">
          <FormInput 
            label="BOM Name *" 
            value={form.bomName}
            onChange={(e) => setField("bomName", e.target.value)}
            disabled={!canSave}
            autoFocus
          />
          <SelectInput 
            label="Branch *" 
            options={branches}
            value={form.branchId}
            onChange={(e) => setField("branchId", e.target.value)}
            disabled={!canSave}
          />
        </div>

        <div className="grid gap-x-4 gap-y-4 md:grid-cols-4">
          <SearchableSelect 
            label="Finished Product *" 
            options={finProductOptions}
            value={form.finishedProduct}
            onChange={(val) => setField("finishedProduct", val)}
            disabled={!canSave}
          />
          <FormInput id="bom-finCode" label="Code *" value={form.finishedProductCode} onChange={(e) => setField("finishedProductCode", e.target.value)} onKeyDown={(e) => hk(e, "bom-finUnit")} required readOnly={!canSave} />
          <FormInput id="bom-finUnit" label="Unit *" value={form.finishedProductUnitName} onChange={(e) => setField("finishedProductUnitName", e.target.value)} readOnly />
          <FormInput id="bom-finQty" label="Qty *" value={form.finishedProductQty} onChange={(e) => setField("finishedProductQty", e.target.value)} inputClassName="text-right" onKeyDown={(e) => hk(e, "bom-product")} required readOnly={!canSave} />
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50/70 p-3">
          <div className="grid gap-x-3 gap-y-1 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
            <SearchableSelect 
              label="Raw Materials" 
              options={rawProductOptions}
              value={form.product}
              onChange={(val) => setField("product", val)}
              disabled={!canAdd}
            />
            <FormInput id="bom-code" label="Code" value={form.code} onChange={(e) => setField("code", e.target.value)} onKeyDown={(e) => hk(e, "bom-unit")} readOnly />
            <FormInput id="bom-unit" label="Unit" value={form.unitName} onChange={(e) => setField("unitName", e.target.value)} readOnly />
            <FormInput id="bom-qty" label="Qty" value={form.qty} onChange={(e) => setField("qty", e.target.value)} inputClassName="text-right" onKeyDown={(e) => hk(e, "bom-add-btn")} readOnly={!canAdd} />
            <div className="flex items-end pb-1">
              <Button
                id="bom-add-btn"
                onClick={addItem}
                className="h-10.5 w-full px-8"
                disabled={!canAdd}
                icon={<Plus size={18} />}
              >
                Add
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100/80 text-[10px] font-bold uppercase tracking-widest text-slate-600">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Unit</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="w-16 px-4 py-3 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No materials added yet
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{item.productName}</td>
                    <td className="px-4 py-2.5 text-gray-600">{item.code}</td>
                    <td className="px-4 py-2.5 text-gray-600">{item.unitName}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900">{item.qty}</td>
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

        <div className="mt-8 flex flex-col-reverse justify-end gap-3 md:flex-row">
          <Button variant="danger" className="w-full md:w-auto" onClick={() => {}} disabled={!canDelete || items.length === 0} icon={<Trash2 size={18} />}>
            Delete
          </Button>
          <Button variant="secondary" className="w-full md:w-auto" onClick={handleClearClick}>
            Clear
          </Button>
          {canSave && (
            <Button isAction icon={<Save size={18} />} onClick={handleSave} disabled={loading || saving} loading={saving}>
              Save
            </Button>
          )}
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
          setForm(prev => ({ ...prev, product: "", code: "", unit: "", qty: "" }));
          setShowClearConfirm(false);
        }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </PageShell>
  );
};

export default BomPage;
