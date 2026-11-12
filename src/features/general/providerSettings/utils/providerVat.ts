/**
 * Each product's own sales VAT rate for the Provider Settings grid (the Excl / Incl columns used a fixed 5 %).
 * Rate = product's sVatId (GET /product/{id}/productid-data) looked up in the VAT master (GET /product/load_master-data).
 * Both cached for the session. Display only: the saved row is still price + isIncl as entered.
 */
import { productService } from "../../../inventory/product/services/productService";

let vatMaster: Promise<Map<number, number>> | null = null;
const rateByProduct = new Map<number, Promise<number | null>>();
const resolvedRates = new Map<number, number | null>();

const loadVatMaster = () => {
  if (!vatMaster) {
    vatMaster = productService
      .loadMasterData()
      .then((m) => new Map((m?.vat ?? []).map((v) => [Number(v.id), Number(v.value)] as [number, number])))
      .catch(() => {
        vatMaster = null; // try again next time
        return new Map<number, number>();
      });
  }
  return vatMaster;
};

/** Sales VAT % of a product, or null when it cannot be found. */
export const productVatRate = (productId: number): Promise<number | null> => {
  if (!(productId > 0)) return Promise.resolve(null);
  let hit = rateByProduct.get(productId);
  if (!hit) {
    hit = Promise.all([productService.getById(productId), loadVatMaster()])
      .then(([detail, master]) => {
        const vatId = Number(detail?.product?.sVatId);
        const rate = master.get(vatId);
        return rate === undefined || !Number.isFinite(rate) ? null : rate;
      })
      .catch(() => {
        rateByProduct.delete(productId);
        return null;
      })
      .then((rate) => {
        resolvedRates.set(productId, rate);
        return rate;
      });
    rateByProduct.set(productId, hit);
  }
  return hit;
};

/** The rate if already looked up (no request), else undefined. */
export const knownVatRate = (productId: number): number | null | undefined => resolvedRates.get(productId);

/** Excl / Incl amounts of a price at a VAT %. Unknown rate: both equal the price. */
export const splitPrice = (price: number, isIncl: boolean, vatRate: number | null | undefined) => {
  const factor = 1 + (Number(vatRate) > 0 ? Number(vatRate) : 0) / 100;
  return {
    exclPrice: isIncl ? price / factor : price,
    inclPrice: isIncl ? price : price * factor,
  };
};
