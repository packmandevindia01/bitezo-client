import { useMemo, useRef, useState } from "react";
import { FileText, Plus, Printer, RotateCcw, Save, X } from "lucide-react";
import { Button, FormInput, PageShell } from "../../../../components/common";
import { createEmptyPurchaseTransactionForm } from "../constants";
import type { PurchaseLineItem, PurchaseTransactionForm, PurchaseTransactionKind } from "../types";

interface Props {
  kind: PurchaseTransactionKind;
}

type FieldConfig = {
  label: string;
  key: keyof PurchaseTransactionForm;
  type?: string;
  required?: boolean;
};

const currency = (value: number) => value.toFixed(3);

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const calculateLine = (item: PurchaseLineItem) => {
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

const PurchaseTransactionPage = ({ kind }: Props) => {
  const [form, setForm] = useState<PurchaseTransactionForm>(createEmptyPurchaseTransactionForm());
  const [items, setItems] = useState<PurchaseLineItem[]>([]);
  const nextItemId = useRef(1);

  const isReturn = kind === "return";
  const title = isReturn ? "Purchase Return" : "Purchase Invoice";
  const purchaseNoLabel = isReturn ? "PR No" : "P No";
  const invoiceNoLabel = isReturn ? "P Inv No" : "Inv No";

  const topFields: FieldConfig[] = [
    { label: "Series", key: "series", required: true },
    { label: purchaseNoLabel, key: "purchaseNo", required: true },
    { label: "P Date", key: "purchaseDate", type: "date", required: true },
    { label: invoiceNoLabel, key: "invoiceNo", required: !isReturn },
    ...(!isReturn ? [{ label: "Inv Date", key: "invoiceDate", type: "date", required: true } as FieldConfig] : []),
  ];

  const partyFields: FieldConfig[] = [
    { label: "Supplier", key: "supplier", required: true },
    { label: "Branch", key: "branch", required: true },
    { label: "Salesman", key: "salesman", required: true },
  ];

  const setField = (key: keyof PurchaseTransactionForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const currentLine = useMemo<PurchaseLineItem>(
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
    if (!currentLine.product) return;

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
      price: "0.000",
      vatPercent: "0",
      discPercent: "0",
    }));
  };

  const resetForm = () => {
    setForm(createEmptyPurchaseTransactionForm());
    setItems([]);
  };

  const renderField = (field: FieldConfig) => (
    <FormInput
      key={field.key}
      label={field.label}
      type={field.type}
      value={form[field.key]}
      onChange={(event) => setField(field.key, event.target.value)}
      placeholder={field.label}
      required={field.required}
    />
  );

  return (
    <PageShell title={title}>
      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <div className="mb-5 flex flex-col gap-3 border-b border-gray-100 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
              Transaction
            </p>
            <h1 className="flex items-center gap-2 text-2xl font-bold uppercase tracking-wide text-gray-900">
              <FileText size={24} className="text-[#49293e]" />
              {title}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={resetForm}>
              <RotateCcw size={16} />
              New
            </Button>
            <Button>
              <Save size={16} />
              Save
            </Button>
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

        <div className="grid gap-x-4 gap-y-1 md:grid-cols-4 xl:grid-cols-5">
          {topFields.map(renderField)}
        </div>

        <div className="grid gap-x-4 gap-y-1 md:grid-cols-3">
          {partyFields.map(renderField)}
        </div>

        <div className="mt-2 rounded-2xl border border-gray-200 bg-gray-50/70 p-3">
          <div className="grid gap-x-3 gap-y-1 md:grid-cols-[1.1fr_1fr_1fr_0.55fr_0.55fr_0.75fr_0.65fr_0.65fr_0.8fr_0.9fr_auto]">
            <FormInput label="Product" value={form.product} onChange={(e) => setField("product", e.target.value)} />
            <FormInput label="Code" value={form.code} onChange={(e) => setField("code", e.target.value)} />
            <FormInput label="Unit" value={form.unit} onChange={(e) => setField("unit", e.target.value)} />
            <FormInput label="Qty" value={form.qty} onChange={(e) => setField("qty", e.target.value)} />
            <FormInput label="FOC" value={form.foc} onChange={(e) => setField("foc", e.target.value)} />
            <FormInput label="Price" value={form.price} onChange={(e) => setField("price", e.target.value)} />
            <FormInput label="VAT(%)" value={form.vatPercent} onChange={(e) => setField("vatPercent", e.target.value)} />
            <FormInput label="Disc(%)" value={form.discPercent} onChange={(e) => setField("discPercent", e.target.value)} />
            <FormInput label="Disc Amt" value={currency(currentLineTotals.discountAmount)} readOnly />
            <FormInput label="Amount" value={currency(currentLineTotals.netAmount)} readOnly />
            <div className="flex items-end pb-4">
              <Button onClick={addItem} className="h-10 w-full">
                <Plus size={16} />
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
                        <td className="px-4 py-3">{currency(item.price)}</td>
                        <td className="px-4 py-3">{currency(line.amount)}</td>
                        <td className="px-4 py-3">{currency(line.discountAmount)}</td>
                        <td className="px-4 py-3">{currency(line.vatAmount)}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{currency(line.netAmount)}</td>
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
            <FormInput label="Disc(%)" value={form.discPercent} onChange={(e) => setField("discPercent", e.target.value)} />
            <FormInput label="Paymode" value={form.paymode} onChange={(e) => setField("paymode", e.target.value)} />
            <FormInput label="Disc Amt" value={form.discAmount} onChange={(e) => setField("discAmount", e.target.value)} />
            <FormInput label="Narration" value={form.narration} onChange={(e) => setField("narration", e.target.value)} />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
            <FormInput
              label="Other Charge"
              value={form.otherCharge}
              onChange={(e) => setField("otherCharge", e.target.value)}
            />
            <FormInput label="Round Off" value={form.roundOff} onChange={(e) => setField("roundOff", e.target.value)} />
            <div className="rounded-xl border border-[#49293e]/15 bg-white px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Grand Total</p>
              <p className="mt-1 text-2xl font-bold text-[#49293e]">{currency(totals.grandTotal)}</p>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default PurchaseTransactionPage;
