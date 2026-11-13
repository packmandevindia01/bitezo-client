import type React from "react";
import { useRef } from "react";
import { Controller } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { SearchableSelect, SearchableCombobox } from "../../../../components/common";
import { useCurrency } from "../../../../hooks/useCurrency";
import { generateUUID } from "../../../../utils/uuid";
import { limitDigitsKeyDown, limitDigitsPaste } from "../documentForm/documentKeys";
import { purchaseLineTotals, type PurchaseDoc, type PurchaseFormPage, type PurchaseKind } from "./usePurchaseFormPage";

const EMPTY_LINE = { product: "", code: "", unit: "", qty: "1", foc: "0", price: "0", vatId: "0", vatPercent: "0", discPercent: "0" };
const newLine = () => ({ id: generateUUID(), ...EMPTY_LINE });

const CELL_INPUT = "w-full h-7 text-right bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 rounded px-1 py-0 text-xs outline-none";

interface PurchaseLineGridProps {
  kind: PurchaseKind;
  doc: PurchaseDoc;
  page: PurchaseFormPage;
}

/**
 * Line grid of the Purchase Invoice and Purchase Return forms (2026-11-13, was written out in both pages).
 * Differences kept as they were:
 * - Invoice: clicking a row makes it the active row; qty (7) and price (10) are limited in length; the unit list
 *   comes from the product's unit category; picking a product passes its barcode.
 * - Return: the unit list also searches every category for the line's unit; picking a product passes its code.
 */
export const PurchaseLineGrid = ({ kind, doc, page }: PurchaseLineGridProps) => {
  const { formatAmount } = useCurrency();
  const {
    methods, items, append, remove, update, watchedItems, grossTotal, watchedDiscAmount, masterData, categoryUnits,
    productOptions, searchingProducts, handleProductSelect, handleBarcodeScan, handleUnitChange,
  } = doc;
  const { register, control } = methods as any;
  const setValue = (methods as any).setValue;
  const { canSave, handleGridNav, setActiveRowIndex, cfg } = page;
  const isInvoice = kind === "invoice";

  // Tracks whether a product was just selected via Enter (so we don't exit grid accidentally)
  const productSelectedRef = useRef(false);

  const focusUnit = (index: number) => setTimeout(() => {
    document.getElementById(`unit-select-${index}`)?.focus();
  }, 100);

  const focusQty = (index: number) => {
    const qtyInputs = document.querySelectorAll<HTMLInputElement>(`input[name="items.${index}.qty"]`);
    qtyInputs[0]?.focus();
  };

  const unitOptions = (itemWatch: any) => {
    let baseOpts = (itemWatch.unitCategory && categoryUnits[itemWatch.unitCategory]) ? categoryUnits[itemWatch.unitCategory] : (isInvoice ? ((masterData as any)?.units || []) : []);
    if (!isInvoice) {
      if (baseOpts.length === 0 && itemWatch.unit) {
        for (const list of Object.values(categoryUnits)) {
          if (list.some(u => String(u.value) === String(itemWatch.unit))) {
            baseOpts = list;
            break;
          }
        }
      }
      if (baseOpts.length === 0) {
        baseOpts = (masterData as any)?.units || [];
      }
    }
    if (itemWatch.unit && itemWatch.unitName && !baseOpts.some((o: any) => o.value === itemWatch.unit)) {
      return [...baseOpts, { label: itemWatch.unitName, value: itemWatch.unit }];
    }
    return baseOpts;
  };

  /** Enter on the price of the last filled line adds a new line. */
  const priceEnter = (e: React.KeyboardEvent, index: number) => {
    const rowProduct = (methods as any).getValues(`items.${index}.product`);
    if (rowProduct && rowProduct.trim() !== "" && index === items.length - 1) {
      append(newLine() as any, { shouldFocus: false });
      setTimeout(() => document.getElementById(`product-select-${items.length}`)?.focus(), 50);
    } else {
      handleGridNav(e, index);
    }
  };

  /** Invoice: typing longer than the cell's limit is cut back. */
  const limitedRegister = (field: "qty" | "price", index: number, maxChars: number) =>
    register(`items.${index}.${field}`, {
      onChange: (e: any) => {
        if (e.target.value && e.target.value.length > maxChars) {
          const sliced = e.target.value.slice(0, maxChars);
          e.target.value = sliced;
          setValue(`items.${index}.${field}`, sliced, { shouldValidate: true, shouldDirty: true });
        }
      },
    });
  const cutOnInput = (maxChars: number) => (e: React.FormEvent<HTMLInputElement>) => {
    if (e.currentTarget.value.length > maxChars) {
      e.currentTarget.value = e.currentTarget.value.slice(0, maxChars);
    }
  };
  const pasteLimited = (field: string, maxChars: number) => (e: React.ClipboardEvent<HTMLInputElement>) =>
    limitDigitsPaste(e, maxChars, (v) => setValue(field, v, { shouldValidate: true, shouldDirty: true }));

  return (
    <div className="flex-1 overflow-y-auto p-2 md:p-3">
      <div className="h-full flex flex-col rounded-xl border border-gray-200 bg-white">
        <div className="flex-1 overflow-auto">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                {["SL", "Product", "Code", "Unit", "Qty", "FOC", "Price", "Amount", "Disc Amt", "VAT(%)", "VAT Amt", "Net Amount", ""].map(
                  (col, i) => (
                    <th key={i} className="sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((field, index) => {
                const itemWatch: any = watchedItems[index] || {};
                const lineTotals = purchaseLineTotals(itemWatch, grossTotal, Number(watchedDiscAmount) || 0);
                return (
                  <tr key={field.id} onFocusCapture={() => setActiveRowIndex(index)} {...(isInvoice ? { onClick: () => setActiveRowIndex(index) } : {})} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-2 py-1 text-[10px] text-gray-400 font-medium text-center border-r border-gray-100 bg-gray-50/30 w-8">{index + 1}</td>
                    <td className="p-0.5 border-r border-gray-100 min-w-[200px] bg-white">
                      <Controller
                        name={`items.${index}.product`}
                        control={control}
                        render={({ field: selectField }) => (
                          <div className="grid-product-select">
                            <SearchableCombobox
                              id={`product-select-${index}`}
                              className="h-7 !px-2 text-xs"
                              value={selectField.value}
                              options={productOptions}
                              loading={searchingProducts}
                              minQueryLength={0}
                              forcePlacement="bottom"
                              onChange={(val) => {
                                productSelectedRef.current = true; // flag: selection made
                                selectField.onChange(val);
                                const opt = productOptions.find(o => o.value === val);
                                if (opt) {
                                  setValue(`items.${index}.code`, opt.code || "");
                                  if (isInvoice) {
                                    handleProductSelect(index, val, opt.barcode || "");
                                    focusUnit(index);
                                  } else {
                                    handleProductSelect(index, val, opt.code || "");
                                  }
                                } else {
                                  setValue(`items.${index}.code`, "");
                                  setValue(`items.${index}.unit`, "");
                                  setValue(`items.${index}.unitCategory`, "");
                                  setValue(`items.${index}.stock`, "0.000");
                                  setValue(`items.${index}.avgCost`, "0.000");
                                  setValue(`items.${index}.qty`, "1");
                                  setValue(`items.${index}.foc`, "0");
                                  setValue(`items.${index}.price`, "0.000");
                                  setValue(`items.${index}.vatId`, "0");
                                  setValue(`items.${index}.vatPercent`, "0");
                                  setValue(`items.${index}.discPercent`, "0");
                                }
                                // Return moves to the unit even when the product was cleared.
                                if (!isInvoice) focusUnit(index);
                              }}
                              onKeyDown={async (e) => {
                                if (e.key === "Enter") {
                                  if (productSelectedRef.current) {
                                    productSelectedRef.current = false;
                                    focusUnit(index);
                                    return;
                                  }
                                  const rawValue = e.currentTarget.value;
                                  if (rawValue && rawValue.trim().length > 0) {
                                    e.preventDefault();
                                    const success = await handleBarcodeScan(index, rawValue.trim());
                                    if (success) focusUnit(index);
                                    return;
                                  }
                                  if (items.length > 1) remove(index);
                                  setTimeout(() => document.getElementById(`${cfg.prefix}-disc-pct`)?.focus(), 50);
                                }
                              }}
                              disabled={!canSave}
                            />
                          </div>
                        )}
                      />
                    </td>
                    <td className="px-2 py-1 text-[10px] text-gray-500 border-r border-gray-100 bg-gray-50/50 min-w-[80px]">{itemWatch.code || "-"}</td>
                    <td className="p-0 border-r border-gray-100 w-24 relative">
                      <Controller
                        name={`items.${index}.unit`}
                        control={control}
                        render={({ field: selectField }) => (
                          <SearchableSelect
                            id={`unit-select-${index}`}
                            className="h-7 !px-2 text-xs border-transparent hover:border-gray-300 focus:border-blue-500 rounded"
                            value={selectField.value}
                            options={unitOptions(itemWatch)}
                            onChange={(val) => {
                              handleUnitChange(index, val);
                              setTimeout(() => focusQty(index), 100);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                if (isInvoice) setTimeout(() => focusQty(index), 50);
                                else focusQty(index);
                              }
                            }}
                            disabled={!canSave}
                            placeholder="Unit"
                            disableAutoOpenOnFocus={true}
                          />
                        )}
                      />
                    </td>

                    <td className="p-0 border-r border-gray-100 w-20">
                      {isInvoice ? (
                        <input
                          {...limitedRegister("qty", index, 7)}
                          type="number"
                          min="0"
                          step="any"
                          maxLength={7}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => limitDigitsKeyDown(e, 7, () => handleGridNav(e, index))}
                          onInput={cutOnInput(7)}
                          onPaste={pasteLimited(`items.${index}.qty`, 7)}
                          className={CELL_INPUT}
                          readOnly={!canSave}
                        />
                      ) : (
                        <input {...register(`items.${index}.qty`)} type="number" min="0" onFocus={(e) => e.target.select()} onKeyDown={(e) => handleGridNav(e, index)} className={CELL_INPUT} readOnly={!canSave} />
                      )}
                    </td>
                    <td className="p-0 border-r border-gray-100 w-16">
                      <input {...register(`items.${index}.foc`)} type="number" min="0" onFocus={(e) => e.target.select()} onKeyDown={(e) => handleGridNav(e, index)} className={CELL_INPUT} readOnly={!canSave} />
                    </td>
                    <td className="p-0 border-r border-gray-100 w-24">
                      {isInvoice ? (
                        <input
                          {...limitedRegister("price", index, 10)}
                          type="number"
                          min="0"
                          step="0.001"
                          maxLength={10}
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => limitDigitsKeyDown(e, 10, () => priceEnter(e, index))}
                          onInput={cutOnInput(10)}
                          onPaste={pasteLimited(`items.${index}.price`, 10)}
                          className={`${CELL_INPUT} font-mono`}
                          readOnly={!canSave}
                        />
                      ) : (
                        <input
                          {...register(`items.${index}.price`)}
                          type="number" min="0" step="0.001"
                          onFocus={(e) => e.target.select()}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              priceEnter(e, index);
                            }
                          }}
                          className={`${CELL_INPUT} font-mono`}
                          readOnly={!canSave}
                        />
                      )}
                    </td>
                    <td className="px-2 py-1 text-right font-mono text-xs text-gray-600 bg-gray-50/50 border-r border-gray-100">{formatAmount(lineTotals.amount)}</td>

                    <td className="px-2 py-1 text-right font-mono text-xs text-gray-600 bg-gray-50/50 border-r border-gray-100">{formatAmount(lineTotals.discountAmount)}</td>

                    {/* VAT% — read-only, set from the product */}
                    <td className="px-2 py-1 text-right text-xs text-gray-500 bg-gray-50/50 border-r border-gray-100 tabular-nums">
                      <input {...register(`items.${index}.vatPercent`)} type="hidden" tabIndex={-1} />
                      {itemWatch.vatPercent || "0"}
                    </td>
                    <td className="px-2 py-1 text-right font-mono text-xs text-gray-600 bg-gray-50/50 border-r border-gray-100">{formatAmount(lineTotals.vatAmount)}</td>

                    <td className="px-2 py-1 text-right font-mono font-bold text-[#49293e] bg-[#49293e]/5 border-r border-gray-100">{formatAmount(lineTotals.netAmount)}</td>
                    <td className="px-2 py-1 text-center w-10">
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => {
                          if (items.length > 1) {
                            remove(index);
                          } else {
                            update(index, newLine() as any);
                          }
                        }}
                        className="p-1.5 rounded-md transition-colors text-gray-400 hover:text-red-500 hover:bg-red-50"
                        disabled={!canSave}
                        title={items.length > 1 ? "Remove item" : "Clear item"}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add Row Button */}
        <div className="flex justify-start px-2 py-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => {
              append(newLine() as any, { shouldFocus: false });

              setTimeout(() => {
                document.getElementById(`product-select-${items.length}`)?.focus();
              }, 50);
            }}
            disabled={!canSave}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#49293e] hover:text-[#3a2132] hover:bg-[#49293e]/5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={14} /> Add Item
          </button>
        </div>
      </div>
    </div>
  );
};
