/**
 * Utility to deterministically sort order details according to their original sequence.
 * In POS systems, when orders are retrieved from backend APIs, SQL joins or table indexes
 * may return line items in arbitrary or ProductId order.
 * This helper restores the original item order using sNo, mapId (item sequence mapping),
 * or database auto-increment ID.
 */
export const sortOrderDetailsBySequence = <T extends Record<string, any>>(details: T[]): T[] => {
  if (!Array.isArray(details) || details.length <= 1) return details || [];

  return [...details].sort((a, b) => {
    // 1. Explicit serial / line number if present and distinct
    const aSNo = Number(a?.sNo ?? a?.SNo ?? a?.serialNo ?? a?.SerialNo ?? a?.lineNo ?? a?.LineNo);
    const bSNo = Number(b?.sNo ?? b?.SNo ?? b?.serialNo ?? b?.SerialNo ?? b?.lineNo ?? b?.LineNo);
    if (!isNaN(aSNo) && !isNaN(bSNo) && aSNo > 0 && bSNo > 0 && aSNo !== bSNo) {
      return aSNo - bSNo;
    }

    // 2. POS mapId / MapId (generated sequentially as items are added: 1, 2, 3...)
    const aMapId = Number(a?.mapId ?? a?.MapId);
    const bMapId = Number(b?.mapId ?? b?.MapId);
    if (!isNaN(aMapId) && !isNaN(bMapId) && aMapId > 0 && bMapId > 0 && aMapId !== bMapId) {
      return aMapId - bMapId;
    }

    // 3. Primary key ID (orderDetailId, detailId, id)
    const aId = Number(a?.orderDetailId ?? a?.OrderDetailId ?? a?.detailId ?? a?.DetailId ?? a?.id ?? a?.Id);
    const bId = Number(b?.orderDetailId ?? b?.OrderDetailId ?? b?.detailId ?? b?.DetailId ?? b?.id ?? b?.Id);
    if (!isNaN(aId) && !isNaN(bId) && aId > 0 && bId > 0 && aId !== bId) {
      return aId - bId;
    }

    return 0;
  });
};
