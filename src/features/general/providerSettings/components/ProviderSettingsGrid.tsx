import { useMemo, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { SearchableSelect } from "../../../../components/common";
import { useCurrency } from "../../../../hooks/useCurrency";
import type { ProviderSettingEntry, ProductSearchItem, AltNameItem } from "../types";
import { formatPriceInput } from "../utils/priceInput";
import GridFindBar from "../../../../components/common/GridFindBar";
import { useGridFind, gridFindRowClass } from "../../../../hooks/useGridFind";

interface Props {
  entries: ProviderSettingEntry[];
  allProducts: ProductSearchItem[];
  altNamesMap: Record<number, AltNameItem[]>;
  onProductSelect: (index: number, val: string) => Promise<void>;
  onAltNameSelect: (index: number, unitId: number) => void;
  onToggleTax: (index: number) => void;
  onPriceChange: (index: number, val: string) => void;
  /** Leaving the price box: tidy it to the currency's decimals. */
  onPriceCommit?: (index: number) => void;
  onRemove: (index: number) => void;
  onAddRow: () => void;
  onLoadAltNames: (productId: number) => Promise<void>;
  disabled?: boolean;
}

const ProviderSettingsGrid = ({
  entries,
  allProducts,
  altNamesMap,
  onProductSelect,
  onAltNameSelect,
  onToggleTax,
  onPriceChange,
  onPriceCommit,
  onRemove,
  onAddRow,
  onLoadAltNames,
  disabled = false,
}: Props) => {
  const { decimalPart, formatAmount } = useCurrency();
  // The price box being typed in shows the typed text; every other box shows the price with the currency's decimals.
  const [editingPriceIndex, setEditingPriceIndex] = useState<number | null>(null);

  /** Enter in a price box: next row's price (its product box when it has no product yet); the last row adds a row. */
  const handlePriceEnter = (index: number) => {
    onPriceCommit?.(index);
    if (index === entries.length - 1) {
      onAddRow();
      setTimeout(() => {
        document.getElementById(`ps-grid-prod-${entries.length}`)?.focus();
      }, 50);
      return;
    }
    const next = entries[index + 1];
    const target = next?.productId ? `ps-grid-price-${index + 1}` : `ps-grid-prod-${index + 1}`;
    setTimeout(() => {
      const el = document.getElementById(target) as HTMLInputElement | null;
      el?.focus();
      el?.select?.();
    }, 0);
  };

  // Clean product labels avoiding empty parentheses like "demo1 ()"
  const productOptions = useMemo(() => {
    const opts = allProducts.map((p) => {
      const cleanAlt = p.altName?.trim();
      const label = cleanAlt && cleanAlt !== p.productName ? `${p.productName} (${cleanAlt})` : p.productName;
      return {
        value: `${p.productId}-${p.unitId}`,
        label,
      };
    });

    entries.forEach((e) => {
      if (e.productId > 0) {
        const key = `${e.productId}-${e.unitId}`;
        if (!opts.some((o) => o.value === key)) {
          const cleanAlt = e.altName?.trim();
          const label = cleanAlt && cleanAlt !== e.productName ? `${e.productName} (${cleanAlt})` : e.productName;
          opts.push({
            value: key,
            label,
          });
        }
      }
    });
    return opts;
  }, [allProducts, entries]);

  // Automatically trigger loading alt names for any row missing them
  useEffect(() => {
    entries.forEach((e) => {
      if (e.productId > 0 && !altNamesMap[e.productId]) {
        void onLoadAltNames(e.productId);
      }
    });
  }, [entries, altNamesMap, onLoadAltNames]);

  // Find a product in the grid: highlight every matching row, scroll to the current one
  const find = useGridFind(entries, "ps-grid-row");

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Find product */}
      <GridFindBar find={find} id="ps-grid-find" />
      <div className="flex-1 overflow-auto">
        <table className="min-w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/90 select-none">
              <th className="sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500 text-center w-12">
                SL
              </th>
              <th className="sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500 text-center min-w-[260px]">
                Product
              </th>
              <th className="sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500 text-center w-28">
                Code
              </th>
              <th className="sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500 text-center min-w-[150px]">
                Alt Name
              </th>
              <th className="sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500 text-center w-20">
                Tax
              </th>
              <th className="sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500 text-right w-32">
                Price
              </th>
              <th className="sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500 text-right w-28">
                Excl
              </th>
              <th className="sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500 text-right w-28">
                Incl
              </th>
              <th className="sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-2 py-2 text-[11px] font-bold uppercase tracking-wider text-gray-500 text-center w-12">
                
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {entries.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-10 text-gray-400">
                  No items added yet. Click &quot;Add Item&quot; or use &quot;Load Data&quot; above.
                </td>
              </tr>
            ) : (
              entries.map((row, index) => {
                const cachedAlts = altNamesMap[row.productId];
                let rowAltOptions: AltNameItem[] = [];

                if (cachedAlts && cachedAlts.length > 0) {
                  rowAltOptions = cachedAlts;
                } else if (row.unitId > 0 && row.altName) {
                  rowAltOptions = [{ unitId: row.unitId, altName: row.altName }];
                } else if (row.altName && row.altName.trim()) {
                  rowAltOptions = [{ unitId: row.unitId || 0, altName: row.altName.trim() }];
                } else if (row.productName && row.productName.trim()) {
                  rowAltOptions = [{ unitId: row.unitId || 0, altName: row.productName.trim() }];
                }

                // Selected value: prioritize row.unitId, fallback to first option
                const selectValue = row.unitId
                  ? String(row.unitId)
                  : rowAltOptions.length > 0
                  ? String(rowAltOptions[0].unitId)
                  : "";

                return (
                  <tr
                    // Index only: a key with the product in it rebuilt the row on pick, and Enter lost focus
                    key={index}
                    id={`ps-grid-row-${index}`}
                    data-find={find.rowState(index)}
                    className={`transition-colors group ${gridFindRowClass(find.rowState(index)) || "hover:bg-blue-50/20"}`}
                  >
                    {/* SL */}
                    <td className="px-2 py-1 text-center font-mono text-gray-400 text-xs border-r border-gray-100 bg-gray-50/30 w-12">
                      {index + 1}
                    </td>

                    {/* Product */}
                    <td className="p-1 border-r border-gray-100 min-w-[260px]">
                      <SearchableSelect
                        id={`ps-grid-prod-${index}`}
                        className="h-8 !px-2 text-xs"
                        placeholder="Search product..."
                        options={productOptions}
                        value={row.productId ? `${row.productId}-${row.unitId}` : ""}
                        onChange={(val) => void onProductSelect(index, val)}
                        disabled={disabled}
                        disableAutoOpenOnFocus
                      />
                    </td>

                    {/* Code */}
                    <td className="px-2 py-1 text-center font-mono text-gray-500 text-xs border-r border-gray-100 bg-gray-50/20 w-28">
                      {row.productCode || "-"}
                    </td>

                    {/* Alt Name */}
                    <td className="p-1 border-r border-gray-100 min-w-[150px]">
                      <select
                        id={`ps-grid-alt-${index}`}
                        value={selectValue}
                        disabled={disabled || !row.productId}
                        onFocus={() => {
                          if (row.productId) void onLoadAltNames(row.productId);
                        }}
                        onChange={(e) => onAltNameSelect(index, Number(e.target.value))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const price = document.getElementById(`ps-grid-price-${index}`) as HTMLInputElement | null;
                            price?.focus();
                            price?.select();
                          }
                        }}
                        className="w-full h-8 text-xs bg-white border border-gray-200 hover:border-gray-300 focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e] rounded px-2 py-1 outline-none disabled:bg-gray-50 disabled:text-gray-400 cursor-pointer"
                      >
                        {rowAltOptions.length === 0 ? (
                          <option value="">{row.altName || "Default"}</option>
                        ) : (
                          rowAltOptions.map((a) => (
                            <option key={a.unitId} value={String(a.unitId)}>
                              {a.altName}
                            </option>
                          ))
                        )}
                      </select>
                    </td>

                    {/* Tax */}
                    <td className="p-1 text-center border-r border-gray-100 w-20">
                      <button
                        type="button"
                        disabled={disabled || !row.productId}
                        onClick={() => onToggleTax(index)}
                        className={`text-[11px] font-bold px-3 py-1 rounded-full border transition-all ${
                          row.isIncl
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                        } disabled:opacity-50`}
                        title="Click to toggle Tax Inclusive / Exclusive"
                      >
                        {row.isIncl ? "Incl" : "Excl"}
                      </button>
                    </td>

                    {/* Price */}
                    <td className="p-1 border-r border-gray-100 w-32">
                      <input
                        id={`ps-grid-price-${index}`}
                        // text + decimal keypad: a number box can't limit decimals or keep "1.500" as typed
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        disabled={disabled || !row.productId}
                        value={
                          editingPriceIndex === index
                            ? (row.rawPrice ?? formatPriceInput(row.price, decimalPart))
                            : formatPriceInput(row.price, decimalPart)
                        }
                        placeholder={formatAmount(0)}
                        onFocus={(e) => {
                          setEditingPriceIndex(index);
                          e.target.select();
                        }}
                        onBlur={() => {
                          setEditingPriceIndex((cur) => (cur === index ? null : cur));
                          onPriceCommit?.(index);
                        }}
                        onChange={(e) => onPriceChange(index, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handlePriceEnter(index);
                          }
                        }}
                        className="w-full h-8 text-right font-mono font-bold text-[#49293e] bg-white border border-gray-200 hover:border-gray-300 focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e] rounded px-2 py-1 text-xs outline-none disabled:bg-gray-50"
                      />
                    </td>

                    {/* Excl */}
                    <td className="px-2 py-1 text-right font-mono text-xs text-gray-700 bg-gray-50/20 border-r border-gray-100 w-28">
                      {row.productId ? row.exclPrice.toFixed(decimalPart) : "-"}
                    </td>

                    {/* Incl */}
                    <td className="px-2 py-1 text-right font-mono text-xs font-bold text-pos-primary bg-[#49293e]/5 border-r border-gray-100 w-28">
                      {row.productId ? row.inclPrice.toFixed(decimalPart) : "-"}
                    </td>

                    {/* Action */}
                    <td className="px-2 py-1 text-center w-12">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onRemove(index)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                        title="Remove item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Row Button Footer */}
      <div className="flex justify-between items-center px-3 py-2 border-t border-gray-200 bg-gray-50/60 flex-none">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            onAddRow();
            setTimeout(() => {
              document.getElementById(`ps-grid-prod-${entries.length}`)?.focus();
            }, 50);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#49293e] hover:text-[#3a2132] hover:bg-[#49293e]/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={14} /> Add Item
        </button>
        <span className="text-xs text-gray-500 font-medium">
          Total Items: <span className="font-bold text-gray-700">{entries.filter((e) => e.productId > 0).length}</span>
        </span>
      </div>
    </div>
  );
};

export default ProviderSettingsGrid;