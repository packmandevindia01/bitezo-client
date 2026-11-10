import { useCallback, useState } from "react";
import { productService } from "../../inventory/product/services/productService";
import type { RawUnit } from "./lineUnits";

export interface CategoryUnit {
  label: string;
  value: string;
  currentValue: number;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- these work with each form's own field paths */
type GetValue = (name: any) => any;
type SetValue = (name: any, value: any) => void;
/* eslint-enable @typescript-eslint/no-explicit-any */

const toCategoryUnit = (unit: RawUnit): CategoryUnit => ({
  label: unit.name || unit.unitName || "",
  value: String(unit.unitId ?? unit.id),
  currentValue: Number(unit.currentValue ?? unit.currentvalue ?? 1),
});

/** Unit lists by category, loaded once each. A failed load is not remembered, so it is tried again next time. */
export const useCategoryUnits = (getUnits: (unitCategory: string) => Promise<RawUnit[]>) => {
  const [categoryUnits, setCategoryUnits] = useState<Record<string, CategoryUnit[]>>({});

  const loadCategoryUnits = useCallback(
    async (unitCategory: string) => {
      if (!unitCategory) return;
      setCategoryUnits((prev) => {
        if (prev[unitCategory]) return prev;
        getUnits(unitCategory)
          .then((units) => setCategoryUnits((current) => ({ ...current, [unitCategory]: (units || []).map(toCategoryUnit) })))
          .catch((err) => console.error("Failed to load units for category", unitCategory, err));
        return prev;
      });
    },
    [getUnits]
  );

  return { categoryUnits, setCategoryUnits, loadCategoryUnits };
};

/** Loads a line's closing stock for the branch chosen in `branchField`. */
export const useClosingStock = (branchField: string, getValues: GetValue, setValue: SetValue) =>
  useCallback(
    (index: number, productId: number) => {
      const branchId = getValues(branchField);
      if (!branchId || !productId) return;
      productService
        .getClosingStock(productId, Number(branchId))
        .then((res) => setValue(`items.${index}.stock`, res.stock || "0"))
        .catch(() => setValue(`items.${index}.stock`, "Error"));
    },
    [branchField, getValues, setValue]
  );

export interface StockUnitChangeConfig {
  /** Nothing returned keeps the line's cost. */
  getUnitCost: (productId: number, unitId: number) => Promise<number | null | undefined>;
  getValues: GetValue;
  setValue: SetValue;
  formatAmount: (value: number) => string;
  showToast: (message: string, type: "warning") => void;
  loadStock: (index: number, productId: number) => void;
}

/** Sets a line's unit and loads that unit's cost. A slow reply never changes a line that has moved on. */
export const useStockUnitChange = ({ getUnitCost, getValues, setValue, formatAmount, showToast, loadStock }: StockUnitChangeConfig) =>
  useCallback(
    async (index: number, unitId: string) => {
      setValue(`items.${index}.unit`, unitId);
      setValue(`items.${index}.unitId`, Number(unitId));
      const rowId = getValues(`items.${index}.id`);
      const productId = getValues(`items.${index}.product`);
      if (!productId || !unitId) return;

      const isSameLine = () =>
        getValues(`items.${index}.id`) === rowId &&
        getValues(`items.${index}.product`) === productId &&
        getValues(`items.${index}.unit`) === unitId;

      try {
        const cost = await getUnitCost(Number(productId), Number(unitId));
        if (!isSameLine()) return;
        if (cost !== null && cost !== undefined) setValue(`items.${index}.cost`, formatAmount(cost));
        loadStock(index, Number(productId));
      } catch (error) {
        console.error("Failed to fetch unit cost", error);
        if (isSameLine()) {
          showToast("Could not load the cost for this unit. Please check the Cost before saving.", "warning");
        }
      }
    },
    [getUnitCost, getValues, setValue, formatAmount, showToast, loadStock]
  );
