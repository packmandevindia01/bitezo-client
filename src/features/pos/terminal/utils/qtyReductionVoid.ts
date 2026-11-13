import { roundCalc } from "./billing";
import { getModifierTypeNameById } from "../../services/menuApi";

/**
 * The void records written when the quantity of a saved line is lowered with the Qty key
 * (moved verbatim out of PosTerminalPage.handleApplyQty, 2026-11-13).
 * Extras and modifiers are voided in proportion to the units voided (at least 1 each).
 */
export const buildQtyReductionVoid = (
  item: any,
  voidDiff: number,
  priceVoidedUnits: (item: any, voidQty: number, voidExtras: { price: number; qty: number }[]) => unknown,
) => {
  const unitId = item.product?.unitId || 1;
  const mapId = Number(item.mapId || 0);
  const ratio = item.quantity > 0 ? voidDiff / item.quantity : 1;

  const voidExtras = (item.extras || []).map((ex: any) => ({
    id: ex.id || ex.modifierId,
    name: (ex.name && ex.name !== "Extra") ? ex.name : (ex.modifierName || ex.name || "Extra"),
    arabicName: ex.arabicName || ex.arabic,
    price: ex.price || 0,
    qty: Math.max(1, Math.round((ex.qty || 1) * ratio)),
    typeId: ex.typeId || 2,
  }));

  const voidModifiers = (item.modifiers || []).map((mod: any) => {
    const typeId = Number(mod.typeId ?? 1);
    const typeName = mod.typeName || mod.modifierTypeName || (typeId ? getModifierTypeNameById(typeId) : "") || "";
    const name = (mod.name && mod.name !== "Modifier") ? mod.name : (mod.modifierName || mod.name || "Modifier");
    return {
      id: mod.id || mod.modifierId,
      name,
      arabicName: mod.arabicName || mod.arabic,
      qty: Math.max(1, Math.round((mod.qty || 1) * ratio)),
      typeId,
      typeName,
    };
  });

  const voidMessages = (item.messages || []).map((msg: any) => ({
    id: msg.id,
    name: msg.name,
  }));

  const product = {
    productId: item.productId,
    productName: item.product?.name || `Product #${item.productId}`,
    unitId,
    qty: voidDiff,
    amount: roundCalc((item.price || 0) * voidDiff),
    pricedLine: priceVoidedUnits(item, voidDiff, voidExtras),
    mapId,
    variantName: item.variantName,
    variantArabic: item.variantArabic,
    categoryId: item.product?.categoryId || (item as any).categoryId,
    extras: voidExtras,
    modifiers: voidModifiers,
    messages: voidMessages,
  };

  const modifiers = [...voidExtras, ...voidModifiers].map((mod: any) => {
    const modPrice = mod.price || 0;
    return {
      mapId,
      modifierId: mod.id,
      qty: mod.qty || 1,
      amount: roundCalc(modPrice * (mod.qty || 1)),
      typeId: mod.typeId || 1,
      name: mod.name,
      arabicName: mod.arabicName || mod.arabic,
      typeName: mod.typeName,
    };
  });

  return { product, modifiers };
};
