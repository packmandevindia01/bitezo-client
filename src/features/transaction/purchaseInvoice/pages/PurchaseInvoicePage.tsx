import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Printer, RotateCcw, Save, X } from "lucide-react";
import { Button, FormInput, PageShell } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import { createEmptyPurchaseInvoiceForm } from "../constants";
import type { PurchaseInvoiceLineItem, PurchaseInvoiceForm } from "../types";
import { usePermissions } from "../../../../hooks/usePermissions";
import { useCurrency } from "../../../../hooks/useCurrency";



const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const calculateLine = (item: PurchaseInvoiceLineItem) => {
  const amount = item.qty * item.price;
  const discountAmount = amount * (item.discPercent / 100);
  const vatAmount = (amount - discountAmount) * (item.vatPercent / 100);
  const netAmount = amount - discountAmount + vatAmount;

  return {
    amount,
    discountAmount,
    vatAmount,
    netAmount,
  };
};

const PurchaseInvoicePage = () => {
  const { hasPermission } = usePermissions();
  const { formatAmount } = useCurrency();
  const initialForm = useMemo(() => {
    const empty = createEmptyPurchaseInvoiceForm();
    empty.price = formatAmount(0);
    empty.discAmount = formatAmount(0);
    empty.otherCharge = formatAmount(0);
    empty.roundOff = formatAmount(0);
    return empty;
  }, [formatAmount]);

  const [form, setForm] = useState<PurchaseInvoiceForm>(initialForm);
  const [items, setItems] = useState<PurchaseInvoiceLineItem[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const nextItemId = useRef(1);

  const canAdd = hasPermission("Purchase Invoice", "Add");
  const canEdit = hasPermission("Purchase Invoice", "Edit");
  // For transactions, "Add" or "Edit" usually allows saving depending on the state
  const canSave = canAdd || canEdit;



  const setField = (key: keyof PurchaseInvoiceForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const hk = (e: React.KeyboardEvent, nextId?: string) => {
    if (e.key === "Enter") { e.preventDefault(); if (nextId) document.getElementById(nextId)?.focus(); }
  };

  useEffect(() => { setTimeout(() => { document.getElementById("pi-series")?.focus(); }, 200); }, []);

  const currentLine = useMemo<PurchaseInvoiceLineItem>(
    () => ({
      id: 0,
      product: form.product.trim(),
      code: form.code.trim(),
      unit: form.unit.trim(),
      qty: toNumber(form.qty),
      foc: toNumber(form.foc),
      price: toNumber(form.price),
      vatPercent: toNumber(form.vatPercent),
      discPercent: toNumber(form.discPercent),
    }),
    [form],
  );

  const currentLineTotals = calculateLine(currentLine);

  const totals = useMemo(() => {
    const itemTotals = items.reduce(
      (acc, item) => {
        const line = calculateLine(item);
        acc.discountAmount += line.discountAmount;
        acc.vatAmount += line.vatAmount;
        acc.netAmount += line.netAmount;
        return acc;
      },
      { discountAmount: 0, vatAmount: 0, netAmount: 0 },
    );

    const manualDiscount = toNumber(form.discAmount);
    const otherCharge = toNumber(form.otherCharge);
    const roundOff = toNumber(form.roundOff);
    const grandTotal = itemTotals.netAmount - manualDiscount + otherCharge + roundOff;

    return {
      ...itemTotals,
      grandTotal,
    };
  }, [form.discAmount, form.otherCharge, form.roundOff, items]);

  const addItem = () => {
    if (!currentLine.product || !canSave) return;

    const itemId = nextItemId.current;
    nextItemId.current += 1;
    setItems((prev) => [...prev, { ...currentLine, id: itemId }]);
    setForm((prev) => ({
      ...prev,
      product: "",
      code: "",
      unit: "",
      qty: "0",
      foc: "0",
      price: formatAmount(0),
      vatPercent: "0",
      discPercent: "0",
    }));
    setTimeout(() => document.getElementById("pi-product")?.focus(), 0);
  };

  const handleReset = () => {
    setForm(initialForm);
    setItems([]);
    setShowClearConfirm(false);
  };

  const handleClearClick = () => {
    const isDirty = items.length > 0 || JSON.stringify(form) !== JSON.stringify(initialForm);
    if (isDirty) {
      setShowClearConfirm(true);
    } else {
      handleReset();
    }
  };




  return (
    <PageShell title="Purchase Invoice">
      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm flex flex-col" style={{ maxHeight: "calc(100vh - 120px)" }}>
        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mb-5 border-b border-gray-100 pb-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
              Transaction
            </p>
            <h1 className="flex items-center gap-2 text-2xl font-bold uppercase tracking-wide text-gray-900">
              <FileText size={24} className="text-[#49293e]" />
              Purchase Invoice
            </h1>
          </div>

        <div className="grid gap-x-4 gap-y-1 md:grid-cols-4 xl:grid-cols-5">
          <FormInput id="pi-series" label="Series" key="series" type={undefined} value={form.series} onChange={(e) => setField("series", e.target.value)} onKeyDown={(e) => hk(e, "pi-purchaseNo")} placeholder="Series" required readOnly={!canSave} />
          <FormInput id="pi-purchaseNo" label="P No" key="purchaseNo" value={form.purchaseNo} onChange={(e) => setField("purchaseNo", e.target.value)} onKeyDown={(e) => hk(e, "pi-purchaseDate")} placeholder="P No" required readOnly={!canSave} />
          <FormInput id="pi-purchaseDate" label="P Date" key="purchaseDate" type="date" value={form.purchaseDate} onChange={(e) => setField("purchaseDate", e.target.value)} onKeyDown={(e) => hk(e, "pi-invoiceNo")} placeholder="P Date" required readOnly={!canSave} />
          <FormInput id="pi-invoiceNo" label="Inv No" key="invoiceNo" value={form.invoiceNo} onChange={(e) => setField("invoiceNo", e.target.value)} onKeyDown={(e) => hk(e, "pi-invoiceDate")} placeholder="Inv No" required readOnly={!canSave} />
          <FormInput id="pi-invoiceDate" label="Inv Date" key="invoiceDate" type="date" value={form.invoiceDate} onChange={(e) => setField("invoiceDate", e.target.value)} onKeyDown={(e) => hk(e, "pi-supplier")} placeholder="Inv Date" required readOnly={!canSave} />
        </div>

        <div className="grid gap-x-4 gap-y-1 md:grid-cols-3">
          <FormInput id="pi-supplier" label="Supplier" key="supplier" value={form.supplier} onChange={(e) => setField("supplier", e.target.value)} onKeyDown={(e) => hk(e, "pi-branch")} placeholder="Supplier" required readOnly={!canSave} />
          <FormInput id="pi-branch" label="Branch" key="branch" value={form.branch} onChange={(e) => setField("branch", e.target.value)} onKeyDown={(e) => hk(e, "pi-salesman")} placeholder="Branch" required readOnly={!canSave} />
          <FormInput id="pi-salesman" label="Salesman" key="salesman" value={form.salesman} onChange={(e) => setField("salesman", e.target.value)} onKeyDown={(e) => hk(e, "pi-product")} placeholder="Salesman" required readOnly={!canSave} />
        </div>

        <div className="mt-2 rounded-2xl border border-gray-200 bg-gray-50/70 p-3">
          <div className="grid gap-x-3 gap-y-1 md:grid-cols-[1.1fr_1fr_1fr_0.55fr_0.55fr_0.75fr_0.65fr_0.65fr_0.8fr_0.9fr_auto]">
            <FormInput id="pi-product" label="Product" value={form.product} onChange={(e) => setField("product", e.target.value)} onKeyDown={(e) => hk(e, "pi-code")} readOnly={!canSave} />
            <FormInput id="pi-code" label="Code" value={form.code} onChange={(e) => setField("code", e.target.value)} onKeyDown={(e) => hk(e, "pi-unit")} readOnly={!canSave} />
            <FormInput id="pi-unit" label="Unit" value={form.unit} onChange={(e) => setField("unit", e.target.value)} onKeyDown={(e) => hk(e, "pi-qty")} readOnly={!canSave} />
            <FormInput id="pi-qty" label="Qty" value={form.qty} onChange={(e) => setField("qty", e.target.value)} onKeyDown={(e) => hk(e, "pi-foc")} readOnly={!canSave} />
            <FormInput id="pi-foc" label="FOC" value={form.foc} onChange={(e) => setField("foc", e.target.value)} onKeyDown={(e) => hk(e, "pi-price")} readOnly={!canSave} />
            <FormInput id="pi-price" label="Price" value={form.price} onChange={(e) => setField("price", e.target.value)} onKeyDown={(e) => hk(e, "pi-vatPercent")} readOnly={!canSave} />
            <FormInput id="pi-vatPercent" label="VAT(%)" value={form.vatPercent} onChange={(e) => setField("vatPercent", e.target.value)} onKeyDown={(e) => hk(e, "pi-discPercent")} readOnly={!canSave} />
            <FormInput id="pi-discPercent" label="Disc(%)" value={form.discPercent} onChange={(e) => setField("discPercent", e.target.value)} onKeyDown={(e) => hk(e, "pi-add-btn")} readOnly={!canSave} />
            <FormInput label="Disc Amt" value={formatAmount(currentLineTotals.discountAmount)} readOnly />
            <FormInput label="Amount" value={formatAmount(currentLineTotals.netAmount)} readOnly />
            <div className="flex items-end pb-4">
              <Button id="pi-add-btn" onClick={addItem} className="h-10 w-full" disabled={!canSave}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}>
                Add
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {["Product", "Code", "Unit", "Qty", "FOC", "Price", "Amount", "Disc Amt", "VAT Amt", "Net Amount"].map(
                    (column) => (
                      <th
                        key={column}
                        className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500"
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
                    <td colSpan={10} className="h-28 px-4 text-center text-sm text-gray-400">
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
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="grid gap-x-4 gap-y-1 md:grid-cols-2">
            <FormInput label="Disc(%)" value={form.discPercent} onChange={(e) => setField("discPercent", e.target.value)} readOnly={!canSave} />
            <FormInput label="Paymode" value={form.paymode} onChange={(e) => setField("paymode", e.target.value)} readOnly={!canSave} />
            <FormInput label="Disc Amt" value={form.discAmount} onChange={(e) => setField("discAmount", e.target.value)} readOnly={!canSave} />
            <FormInput label="Narration" value={form.narration} onChange={(e) => setField("narration", e.target.value)} readOnly={!canSave} />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
            <FormInput
              label="Other Charge"
              value={form.otherCharge}
              onChange={(e) => setField("otherCharge", e.target.value)}
              readOnly={!canSave}
            />
            <FormInput label="Round Off" value={form.roundOff} onChange={(e) => setField("roundOff", e.target.value)} readOnly={!canSave} />
            <div className="rounded-xl border border-[#49293e]/15 bg-white px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Grand Total</p>
              <p className="mt-1 text-2xl font-bold text-[#49293e]">{formatAmount(totals.grandTotal)}</p>
            </div>
          </div>
          </div>
        </div>{/* end scrollable body */}

        {/* ── Sticky Action Footer ── */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 bg-white px-4 py-3 md:px-6 rounded-b-3xl">
          {canAdd && (
            <Button variant="secondary" onClick={handleClearClick}>
              <RotateCcw size={16} />
              New
            </Button>
          )}
          {canSave && (
            <Button>
              <Save size={16} />
              Save
            </Button>
          )}
          <Button variant="secondary">
            <Printer size={16} />
            Print
          </Button>
          <Button variant="secondary">
            <X size={16} />
            Cancel
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
    </PageShell>
  );
};

export default PurchaseInvoicePage;
