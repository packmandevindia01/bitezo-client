/* eslint-disable @typescript-eslint/no-explicit-any -- saved orders and cart lines arrive in many shapes */
import { getModifierTypeNameById, getCachedExtras } from "../services/menuApi";
import { resolveModifierTypeName } from "./modifierLabel";

export interface UnifiedExtraModifier {
  id: number;
  name: string;
  arabicName?: string;
  price: number;
  qty: number;
  typeId?: number;
  exclusivePrice?: number;
  inclusivePrice?: number;
  getPrice?: (isInclusive: boolean) => number;
  [key: string]: any;
}

export interface UnifiedStandardModifier {
  id: number;
  name: string;
  arabicName?: string;
  qty: number;
  typeId?: number;
  typeName?: string;
  [key: string]: any;
}

export interface UnifiedMessageModifier {
  id?: number;
  name: string;
  [key: string]: any;
}

/** What was ordered on a line: its extras, modifiers and messages. Reads names and listed prices; calculates nothing. */
export const extractOrderLineItems = (d: any, itemMods: any[], options?: { modifierTypes?: any[]; [key: string]: any }) => {
  // ── Extract Extras ──
  const extras: UnifiedExtraModifier[] = [];
  const knownExtras = (options as any)?.allExtras || getCachedExtras();
  const handledExtraIds = new Set<number>();
  const handledExtraKeys = new Set<string>();

  if (itemMods.length > 0) {
    itemMods.forEach((m: any) => {
      const modId = Number(m.modifierId ?? m.ModifierId ?? m.id ?? m.Id ?? 0);
      const mName = String(m.modifierName || m.ModifierName || m.name || m.Name || "").trim();
      const modKey = `${modId}-${mName.toLowerCase()}`;
      const statusStr = (m.status || m.Status || "").toLowerCase().trim();
      const rawPrice = Number(m.price ?? m.Price ?? m.amount ?? m.Amount ?? 0);
      const typeId = Number(m.typeId ?? m.TypeId ?? 0);
      const matchedExtra = knownExtras?.find((ex: any) => {
        const exId = Number(ex.id ?? ex.extrasId ?? ex.extraId ?? 0);
        const exName = String(ex.name ?? ex.extraName ?? "").trim().toLowerCase();
        return (modId > 0 && exId === modId) || (mName && exName && exName === mName.toLowerCase());
      });

      const isExtra =
        statusStr === "extras" ||
        statusStr === "extra" ||
        typeId === 2 ||
        Boolean(matchedExtra) ||
        (statusStr !== "message" && rawPrice > 0);

      if (isExtra) {
        if (modId > 0) handledExtraIds.add(modId);
        if (modKey) handledExtraKeys.add(modKey);
        const resolvedPrice = rawPrice > 0 ? rawPrice : (matchedExtra ? Number(matchedExtra.price || 0) : 0);
        extras.push({
          id: modId,
          name: String(mName || matchedExtra?.name || "EXTRA").trim(),
          arabicName: m.arabicName || m.ArabicName || m.arabic || m.Arabic || "",
          price: resolvedPrice,
          qty: Number(m.qty ?? m.Qty ?? 1),
          typeId: 2,
        });
      }
    });
  } else if (d.extras && Array.isArray(d.extras)) {
    d.extras.forEach((ex: any) => {
      extras.push({
        id: Number(ex.id || ex.modifierId || 0),
        name: String(ex.name || ex.modifierName || "EXTRA").trim(),
        arabicName: ex.arabicName || ex.arabic || "",
        price: Number(ex.price || 0),
        qty: Number(ex.qty || 1),
        typeId: 2,
      });
    });
  }

  // ── Extract Modifiers ──
  const modifiers: UnifiedStandardModifier[] = [];
  if (itemMods.length > 0) {
    itemMods.forEach((m: any) => {
      const modId = Number(m.modifierId ?? m.ModifierId ?? m.id ?? m.Id ?? 0);
      const mName = String(m.modifierName || m.ModifierName || m.name || m.Name || "").trim();
      const modKey = `${modId}-${mName.toLowerCase()}`;
      if (handledExtraIds.has(modId) || (modKey && handledExtraKeys.has(modKey))) return;

      const statusStr = (m.status || m.Status || "").toLowerCase().trim();
      const price = Number(m.price ?? m.Price ?? m.amount ?? m.Amount ?? 0);
      const typeId = Number(m.typeId ?? m.TypeId ?? 0);
      // A row whose status is Message is ONLY a message. Message rows are saved with typeId 1, so the
      // `typeId === 1` test used to make every saved message print twice ("* NOTE" and "MSG: NOTE").
      const isMessageRow = statusStr === "message" || statusStr === "messages";
      if (
        !isMessageRow && (
          statusStr === "modifier" ||
          statusStr === "modifiers" ||
          typeId === 1 ||
          (statusStr !== "extras" && statusStr !== "extra" && price <= 0)
        )
      ) {
        const resolvedTypeName =
          resolveModifierTypeName(m) ||
          m.typeName ||
          m.TypeName ||
          m.modifierTypeName ||
          m.ModifierTypeName ||
          (options?.modifierTypes && options.modifierTypes.find((t: any) => Number(t.typeId || t.id) === typeId)?.name) ||
          getModifierTypeNameById(typeId) ||
          "";
        modifiers.push({
          id: modId,
          name: String(m.modifierName || m.ModifierName || m.name || m.Name || "").trim(),
          arabicName: m.arabicName || m.ArabicName || m.arabic || m.Arabic || "",
          qty: Number(m.qty ?? m.Qty ?? 1),
          typeId: typeId || 1,
          typeName: resolvedTypeName,
        });
      }
    });
  } else if (d.modifiers && Array.isArray(d.modifiers)) {
    d.modifiers.forEach((mod: any) => {
      modifiers.push({
        id: Number(mod.id || mod.modifierId || 0),
        name: String(mod.name || mod.modifierName || "").trim(),
        arabicName: mod.arabicName || mod.arabic || "",
        qty: Number(mod.qty || 1),
        typeId: Number(mod.typeId || 1),
        typeName: mod.typeName || mod.modifierTypeName || "",
      });
    });
  }

  // ── Extract Messages ──
  const messages: UnifiedMessageModifier[] = [];
  if (itemMods.length > 0) {
    itemMods.forEach((m: any) => {
      const statusStr = (m.status || m.Status || "").toLowerCase().trim();
      if (statusStr === "message" || statusStr === "messages") {
        messages.push({
          id: Number(m.modifierId ?? m.ModifierId ?? m.id ?? m.Id ?? 0),
          name: String(m.modifierName || m.ModifierName || m.name || m.Name || "").trim(),
        });
      }
    });
  } else if (d.messages && Array.isArray(d.messages)) {
    d.messages.forEach((msg: any) => {
      messages.push({
        id: Number(msg.id || msg.modifierId || 0),
        name: String(msg.name || "").trim(),
      });
    });
  }

  return { extras, modifiers, messages };
};
