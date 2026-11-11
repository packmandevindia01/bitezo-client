/**
 * Dine-In table screen helpers (pure): the table's reserved state, an order row's text and the payment types.
 * Moved out of DineInTableOrdersModal (2026-11-11, split of the window).
 */
import { formatAmount } from "../../../../utils/currency";
import type { DineInTable, TableOrdersResponse, RecallOrder } from "../../types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;
type TableOrder = TableOrdersResponse["masterData"][number];

export interface TenderOption { id: string; label: string }

/** Paymodes → payment buttons: Cash first, then by paymode id (same order on the terminal and table screens). */
export const paymodesToTenderOptions = (list: Loose[]): TenderOption[] =>
  (list || [])
    .slice()
    .sort((a: Loose, b: Loose) => {
      const aIsCash = Number(a.paymodeId) === 1 || (a.paymodeName || "").toLowerCase().includes("cash");
      const bIsCash = Number(b.paymodeId) === 1 || (b.paymodeName || "").toLowerCase().includes("cash");
      if (aIsCash && !bIsCash) return -1;
      if (!aIsCash && bIsCash) return 1;
      return Number(a.paymodeId) - Number(b.paymodeId);
    })
    .map((p: Loose) => ({
      id: String(p.paymodeId),
      label: p.paymodeName,
    }));

/** The table screen's payment types from the POS master data (Cash / Card / Credit when it has none). */
export const dineInTenderOptions = (posMasterData: Loose): TenderOption[] => {
  const rawList =
    posMasterData?.paymodes ||
    posMasterData?.paymode ||
    posMasterData?.data?.paymodes ||
    [];

  const list = rawList.length > 0 ? rawList : [
    { paymodeId: 1, paymodeName: "Cash" },
    { paymodeId: 2, paymodeName: "Card" },
    { paymodeId: 3, paymodeName: "Credit" }
  ];
  return paymodesToTenderOptions(list);
};

/** Row text: the Recall list's own text for the order when there is one, else built from the table data. */
export const dineInOrderRowText = (m: TableOrder, recall: RecallOrder | undefined): string => {
  if (recall && typeof recall.details === "string" && recall.details.trim()) return recall.details;
  const section = m.sectionName ? ` Section : ${m.sectionName}` : "";
  const tableNo = m.tableNo ? ` TableNo : ${m.tableNo}` : "";
  return `Order : ${m.orderNo} Ticket : ${m.ticketNo} (DineIn)${section}${tableNo} Amnt : ${formatAmount(m.netAmount)}`;
};

/** The table, the response or any of its orders is marked reserved. */
export const isDineInTableReserved = (table: DineInTable | null, data: TableOrdersResponse | null, selectedMaster: TableOrder | null): boolean => {
  // 1. Check table object properties and name
  if (
    table?.isReserved ||
    (table as any)?.isReserve ||
    (table as any)?.reserved ||
    (table?.status && String(table.status).toLowerCase() === 'reserved') ||
    ((table as any)?.tableStatus && String((table as any).tableStatus).toLowerCase() === 'reserved') ||
    ((table as any)?.reservationStatus && String((table as any).reservationStatus).toLowerCase() === 'reserved') ||
    /reserved/i.test(table?.tableName || '') ||
    /reservation/i.test(table?.tableName || '')
  ) {
    return true;
  }

  // 2. Check modal response data envelope
  if (
    (data as any)?.isReserved ||
    (data as any)?.isReserve ||
    (data as any)?.reserved ||
    ((data as any)?.status && String((data as any).status).toLowerCase() === 'reserved') ||
    ((data as any)?.tableStatus && String((data as any).tableStatus).toLowerCase() === 'reserved')
  ) {
    return true;
  }

  // 3. Check selectedMaster
  if (selectedMaster) {
    if (
      (selectedMaster as any).isReserved ||
      (selectedMaster as any).isReserve ||
      (selectedMaster as any).reserved ||
      ((selectedMaster as any).status && String((selectedMaster as any).status).toLowerCase() === 'reserved') ||
      ((selectedMaster as any).orderStatus && String((selectedMaster as any).orderStatus).toLowerCase() === 'reserved') ||
      ((selectedMaster as any).orderType && String((selectedMaster as any).orderType).toLowerCase() === 'reserved') ||
      ((selectedMaster as any).orderTypeName && String((selectedMaster as any).orderTypeName).toLowerCase() === 'reserved') ||
      /reserved/i.test((selectedMaster as any)?.note || '') ||
      /reservation/i.test((selectedMaster as any)?.note || '')
    ) {
      return true;
    }
  }

  // 4. Check any order in masterData
  if (data?.masterData && data.masterData.length > 0) {
    return data.masterData.some((m: any) =>
      m.isReserved ||
      m.isReserve ||
      m.reserved ||
      (m.status && String(m.status).toLowerCase() === 'reserved') ||
      (m.orderStatus && String(m.orderStatus).toLowerCase() === 'reserved') ||
      (m.orderType && String(m.orderType).toLowerCase() === 'reserved') ||
      (m.orderTypeName && String(m.orderTypeName).toLowerCase() === 'reserved') ||
      /reserved/i.test(m.note || '') ||
      /reservation/i.test(m.note || '')
    );
  }

  return false;
};
