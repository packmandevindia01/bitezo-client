import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { SearchableOption } from "../../../components/common/Searchableselect";

interface NamedProduct {
  productId: number;
  productName: string;
  code?: string;
  barcode?: string;
}

export interface StockProductApi {
  getProductListByName: (productName: string) => Promise<NamedProduct[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- the reply shape is not documented by the API
  getPurchaseCostData: (barcode: string) => Promise<any>;
}

const productLabel = (code: string | undefined, name: string) => (code ? `[${code}] ${name}` : name);

export const toProductOption = (product: NamedProduct): SearchableOption => ({
  label: productLabel(product.code, product.productName),
  value: product.productId.toString(),
  code: product.code || "",
  barcode: product.barcode || "",
});

export const uniqueProductOptions = (options: readonly SearchableOption[]): SearchableOption[] => {
  const seen = new Set<string>();
  return options.filter((option) => {
    if (seen.has(option.value)) return false;
    seen.add(option.value);
    return true;
  });
};

/** Name matches, with an exact code or barcode match first. A failed request only drops its own results. */
export const searchStockProducts = async (api: StockProductApi, query: string): Promise<SearchableOption[]> => {
  const [nameResults, costDetail] = await Promise.all([
    api.getProductListByName(query).catch(() => [] as NamedProduct[]),
    query ? api.getPurchaseCostData(query).catch(() => null) : Promise.resolve(null),
  ]);
  const codeMatch: SearchableOption[] = costDetail
    ? [{
        label: productLabel(costDetail.productCode, costDetail.productName),
        value: costDetail.productId.toString(),
        code: costDetail.productCode || "",
        barcode: query,
      }]
    : [];
  return uniqueProductOptions([...codeMatch, ...(nameResults || []).map(toProductOption)]);
};

/** A row's list always holds its own product, so the box can show the name even when a search no longer finds it. */
export const withStoredProduct = (
  options: SearchableOption[],
  stored: { product?: string; productName?: string } | undefined
): SearchableOption[] => {
  if (!stored?.product || !stored.productName) return options;
  if (options.some((option) => option.value === stored.product)) return options;
  return [{ label: stored.productName, value: stored.product }, ...options];
};

export interface StockBarcodeScanConfig {
  api: StockProductApi;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- works with each form's own field paths
  setValue: (name: any, value: any) => void;
  setProductOptions: Dispatch<SetStateAction<SearchableOption[]>>;
  loadCategoryUnits: (unitCategory: string) => unknown;
  formatAmount: (value: number) => string;
  /** The stock figure differs per document, so each one supplies how it is loaded. */
  loadStock: (index: number, productId: number) => void;
}

/** Fills a line from a scanned barcode or code. Returns false when nothing matches. */
export const useStockBarcodeScan = ({ api, setValue, setProductOptions, loadCategoryUnits, formatAmount, loadStock }: StockBarcodeScanConfig) =>
  useCallback(
    async (index: number, barcode: string): Promise<boolean> => {
      const addOption = (option: SearchableOption) =>
        setProductOptions((prev) => (prev.find((o) => o.value === option.value) ? prev : [...prev, option]));

      try {
        setValue(`items.${index}.stock`, "...");
        let details = await api.getPurchaseCostData(barcode).catch(() => null);

        if (!details) {
          const nameResults = await api.getProductListByName(barcode).catch(() => [] as NamedProduct[]);
          if (nameResults && nameResults.length > 0) {
            const first = nameResults[0];
            details = await api.getPurchaseCostData(first.barcode || first.code || barcode).catch(() => null);
            if (!details) {
              addOption(toProductOption(first));
              setValue(`items.${index}.product`, String(first.productId));
              setValue(`items.${index}.productName`, productLabel(first.code, first.productName));
              setValue(`items.${index}.code`, first.code || "");
              loadStock(index, first.productId);
              return true;
            }
          }
        }

        if (details) {
          const label = productLabel(details.productCode, details.productName);
          addOption({ label, value: String(details.productId), code: details.productCode || "", barcode });
          setValue(`items.${index}.product`, String(details.productId));
          setValue(`items.${index}.productName`, label);
          setValue(`items.${index}.code`, details.productCode || "");
          setValue(`items.${index}.unitCategory`, details.unitCategory || "");
          setValue(`items.${index}.unitId`, details.baseUnitId);
          setValue(`items.${index}.unit`, String(details.baseUnitId));
          setValue(`items.${index}.cost`, formatAmount(details.cost));
          if (details.unitCategory) loadCategoryUnits(details.unitCategory);
          loadStock(index, details.productId);
          return true;
        }
      } catch (error) {
        console.error("Instant barcode lookup failed", error);
        setValue(`items.${index}.stock`, "Error");
      }
      return false;
    },
    [api, setValue, setProductOptions, loadCategoryUnits, formatAmount, loadStock]
  );
