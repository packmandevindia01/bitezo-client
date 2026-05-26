import { useEffect, useMemo, useRef, useState } from "react";
import { Save, Trash2, Plus } from "lucide-react";
import { Button, FormInput, PageShell } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import { createEmptyBomForm } from "../constants";
import type { BomLineItem, BomForm } from "../types";
import { usePermissions } from "../../../../hooks/usePermissions";

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const BomPage = () => {
  const { hasPermission } = usePermissions();
  const initialForm = useMemo(() => createEmptyBomForm(), []);

  const [form, setForm] = useState<BomForm>(initialForm);
  const [items, setItems] = useState<BomLineItem[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const nextItemId = useRef(1);

  const canAdd = hasPermission("BOM Master", "Add");
  const canEdit = hasPermission("BOM Master", "Edit");
  const canDelete = hasPermission("BOM Master", "Delete");
  const canSave = canAdd || canEdit;

  const setField = (key: keyof BomForm, value: string) => {
    if (!canSave) return;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const hk = (e: React.KeyboardEvent, nextId?: string) => {
    if (e.key === "Enter") { e.preventDefault(); if (nextId) document.getElementById(nextId)?.focus(); }
  };

  useEffect(() => { setTimeout(() => { document.getElementById("bom-finProduct")?.focus(); }, 200); }, []);

  const currentLine = useMemo<BomLineItem>(
    () => ({
      id: 0,
      product: form.product.trim(),
      code: form.code.trim(),
      unit: form.unit.trim(),
      qty: toNumber(form.qty),
    }),
    [form]
  );

  const addItem = () => {
    if (!canAdd || !currentLine.product) return;

    const itemId = nextItemId.current;
    nextItemId.current += 1;
    setItems((prev) => [...prev, { ...currentLine, id: itemId }]);
    setForm((prev) => ({
      ...prev,
      product: "",
      code: "",
      unit: "",
      qty: "0",
    }));
    setTimeout(() => document.getElementById("bom-product")?.focus(), 0);
  };

  const resetForm = () => {
    setForm(initialForm);
    setItems([]);
    setShowClearConfirm(false);
  };

  const handleClearClick = () => {
    const isDirty = items.length > 0 || JSON.stringify(form) !== JSON.stringify(initialForm);
    if (isDirty) {
      setShowClearConfirm(true);
    } else {
      resetForm();
    }
  };

  return (
    <PageShell title="BOM">
      <div className="mx-auto max-w-5xl rounded-3xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <div className="grid gap-x-4 gap-y-1 md:grid-cols-4">
          <FormInput id="bom-finProduct" label="Finished Product" value={form.finishedProduct} onChange={(e) => setField("finishedProduct", e.target.value)} onKeyDown={(e) => hk(e, "bom-finCode")} required readOnly={!canSave} />
          <FormInput id="bom-finCode" label="Code" value={form.finishedProductCode} onChange={(e) => setField("finishedProductCode", e.target.value)} onKeyDown={(e) => hk(e, "bom-finUnit")} required readOnly={!canSave} />
          <FormInput id="bom-finUnit" label="Unit" value={form.finishedProductUnit} onChange={(e) => setField("finishedProductUnit", e.target.value)} onKeyDown={(e) => hk(e, "bom-finQty")} required readOnly={!canSave} />
          <FormInput id="bom-finQty" label="Qty" value={form.finishedProductQty} onChange={(e) => setField("finishedProductQty", e.target.value)} onKeyDown={(e) => hk(e, "bom-product")} required readOnly={!canSave} />
        </div>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-3">
          <div className="grid gap-x-3 gap-y-1 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
            <FormInput id="bom-product" label="Raw Materials" value={form.product} onChange={(e) => setField("product", e.target.value)} onKeyDown={(e) => hk(e, "bom-code")} readOnly={!canAdd} />
            <FormInput id="bom-code" label="Code" value={form.code} onChange={(e) => setField("code", e.target.value)} onKeyDown={(e) => hk(e, "bom-unit")} readOnly={!canAdd} />
            <FormInput id="bom-unit" label="Unit" value={form.unit} onChange={(e) => setField("unit", e.target.value)} onKeyDown={(e) => hk(e, "bom-qty")} readOnly={!canAdd} />
            <FormInput id="bom-qty" label="Qty" value={form.qty} onChange={(e) => setField("qty", e.target.value)} onKeyDown={(e) => hk(e, "bom-add-btn")} readOnly={!canAdd} />
            <div className="flex items-end pb-1">
              <Button
                id="bom-add-btn"
                onClick={addItem}
                className="h-10.5 w-full px-8"
                disabled={!canAdd}
                icon={<Plus size={18} />}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem();
                  }
                }}
              >
                Add
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="max-h-[250px] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {["Product", "Code", "Unit", "Qty"].map(
                    (column) => (
                      <th
                        key={column}
                        className="sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500"
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
                    <td colSpan={4} className="h-28 px-4 text-center text-sm text-gray-400">
                      No materials added
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-[#49293e]/5">
                      <td className="border-l-[3px] border-l-[#49293e] px-4 py-3 font-medium text-gray-900">
                        {item.product}
                      </td>
                      <td className="px-4 py-3">{item.code || "-"}</td>
                      <td className="px-4 py-3">{item.unit || "-"}</td>
                      <td className="px-4 py-3">{item.qty}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
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
              isAction
              icon={<Save size={18} />}
            >
              Save
            </Button>
          )}
          {canDelete && (
            <Button 
              variant="danger" 
              isAction
              icon={<Trash2 size={18} />}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear Form"
        message="Are you sure you want to clear the form? All unsaved data will be lost."
        confirmLabel="Clear"
        onConfirm={resetForm}
        onCancel={() => setShowClearConfirm(false)}
      />
    </PageShell>
  );
};

export default BomPage;
