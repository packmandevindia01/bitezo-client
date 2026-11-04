/**
 * ONE way to show a modifier everywhere (cart, recall / settled / dine-in previews, KOT, guest bill):
 *
 *     <TYPE> <NAME>          e.g.  "NO SUGAR", "WITH SUGAR", "TEST TEST1"
 *
 * - The type is left out only when the name already starts with it as a WHOLE WORD
 *   ("No" + "No Sugar" → "No Sugar"; "No: Sugar" → "No Sugar"). A name that merely starts with the same
 *   letters is kept whole ("Test" + "TEST1" → "Test TEST1" — this used to print "TEST: 1").
 * - Modifiers are added once (qty 1). A quantity is shown only for old saved orders that still carry qty > 1.
 * - When a saved order row has no type name, the type is looked up from the modifier id
 *   (remembered whenever the modifier list is loaded on this device).
 */
import { getModifierTypeNameById } from "../services/menuApi";

const MODIFIER_TYPE_BY_ID_KEY = "bitezo_modifier_type_by_id";

const readTypeById = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(MODIFIER_TYPE_BY_ID_KEY);
    return raw ? JSON.parse(raw) || {} : {};
  } catch {
    return {};
  }
};

/** Remember the type name of modifiers shown in the modifier list (id → type name). */
export const rememberModifierTypes = (modifiers: { id?: number; modifierId?: number }[], typeName: string) => {
  const type = String(typeName || "").trim();
  if (!type || !Array.isArray(modifiers) || modifiers.length === 0) return;
  try {
    const map = readTypeById();
    let changed = false;
    for (const m of modifiers) {
      const id = Number(m?.id ?? m?.modifierId ?? 0);
      if (id > 0 && map[String(id)] !== type) {
        map[String(id)] = type;
        changed = true;
      }
    }
    if (changed) localStorage.setItem(MODIFIER_TYPE_BY_ID_KEY, JSON.stringify(map));
  } catch {
    /* storage full / unavailable — the label falls back to the name only */
  }
};

/** Type name of a modifier: its own field, else the type id lookup, else the remembered type of its id. */
export const resolveModifierTypeName = (mod: any): string => {
  const own = String(mod?.typeName || mod?.TypeName || mod?.modifierTypeName || mod?.ModifierTypeName || "").trim();
  if (own) return own;
  const byId = Number(mod?.modifierId ?? mod?.ModifierId ?? mod?.id ?? mod?.Id ?? 0);
  if (byId > 0) {
    const remembered = readTypeById()[String(byId)];
    if (remembered) return remembered;
  }
  const typeId = Number(mod?.typeId ?? mod?.TypeId ?? 0);
  return typeId ? getModifierTypeNameById(typeId) : "";
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "<TYPE> <NAME>" (see file header). Pure — pass upperCase for prints. */
export const formatModifierLabel = (
  typeName: string | undefined | null,
  name: string | undefined | null,
  options: { qty?: number; upperCase?: boolean } = {}
): string => {
  const type = String(typeName || "").trim();
  let modName = String(name || "").trim();
  let label: string;

  if (!type) {
    label = modName;
  } else if (!modName || modName.toLowerCase() === type.toLowerCase()) {
    label = type;
  } else {
    // Name already starts with the type as a whole word (followed by space, ":" or "-")?
    const prefixed = new RegExp(`^${escapeRegExp(type)}(?:\\s*[:\\-]\\s*|\\s+)(.+)$`, "i").exec(modName);
    if (prefixed) modName = prefixed[1].trim();
    label = `${type} ${modName}`;
  }

  const qty = Number(options.qty ?? 1);
  if (qty > 1) label = `${qty} x ${label}`;
  return options.upperCase ? label.toUpperCase() : label;
};

/** Label for a modifier object from any source (cart, saved order row, unified print line). */
export const modifierLabelOf = (mod: any, options: { upperCase?: boolean } = {}): string =>
  formatModifierLabel(
    resolveModifierTypeName(mod),
    mod?.name || mod?.modifierName || mod?.ModifierName || "Modifier",
    { qty: Number(mod?.qty ?? mod?.Qty ?? 1), upperCase: options.upperCase }
  );
