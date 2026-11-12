import React, { useState, useEffect } from "react";
import { toDisplayNo } from "../../../../services/orderResponse";
import { storedOrderFooter } from "../../../../pricing";
import { orderApi } from "../../../../services/orderApi";
import { menuApi } from "../../../../services/menuApi";
import { useToast } from "../../../../../../app/providers/useToast";
import { useAppDispatch, useAppSelector } from "../../../../../../app/hooks";
import { fallbackOrderTypeByName } from "../../../store/posSlice";
import { formatAmount, getDecimalPart } from "../../../../../../utils/currency";
import { balanceBillFooter } from "../../../../../../utils/money";
import { isEnableVatGuestPrint } from "../../../../utils/guestPrintTemplate";
import { getVatStatus, roundCalc, getPriceView } from "../../../utils/billing";
import { formatItemDisplayName } from "../../../../utils/alternativeHelpers";
import { sortOrderDetailsBySequence } from "../../../utils/orderSort";
import { checkOrderHasBillDiscount } from "../../../utils/orderDiscountCheck";
import { printRecallOrderGuestReceipt } from "../../../utils/printRecallOrder";

import { usePosProducts, alternativesCache } from "../../../hooks/usePosProducts";
import { t, getLocalizedName } from "../../../../utils/posLocalization";
import { buildSavedOrderLoad, dispatchSavedOrderLoad } from "../../../utils/savedOrderToCart";
import { resolveEmployeeNameForPrint, savedOrderWaiterName } from "../../../../utils/employeeNames";
import { printRecallOrderKot } from "../../../utils/printRecallKot";
import { SavedOrderWindow, SavedOrderActions, TicketActionButton, MetaField, ItemDiscountRow, LineAddons, DeliveryDetailsBlock, SavedOrderTotals } from "../savedOrder/SavedOrderTicket";
import { dedupeModifierRows, modifierRowsOfLine, classifyLineModifiers } from "../savedOrder/lineModifiers";
import { parseRecallListText } from "../../../utils/recallListText";

interface PosRecallDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number | null;
  orderDetailsStr?: string; // Fallback string parsed from the recall list (e.g. details text)
  onEditSuccess?: () => void; // Triggered when loading into POS cart to close the parent modals
  onSettleSuccess?: (amount: number) => void; // Triggered when proceeding to settlement
  onOrderVoided?: () => void;
  /**
   * Optional: handle SETTLE outside this modal (e.g. the Dine-In table screen, where the terminal's
   * payment panel is not on screen). When given, the built-in settle (load into cart + terminal payment)
   * is skipped. Recall on the terminal does not pass it, so its behaviour is unchanged.
   */
  onSettleRequest?: (orderId: number) => void;
  /** Optional: handle EDIT outside this modal (Dine-In table screen keeps its own section/table edit flow). */
  onEditRequest?: (orderId: number) => void;
}

const orderTypeNameMap: Record<string, number> = {
  DineIn: 1,
  TakeOut: 2,
  DriveThru: 3,
  Delivery: 4,
  Providers: 5,
  Coming: 6,
};

export const PosRecallDetailsModal: React.FC<PosRecallDetailsModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderDetailsStr = "",
  onEditSuccess,
  onSettleSuccess,
  onOrderVoided: _onOrderVoided,
  onSettleRequest,
  onEditRequest,
}) => {
  const { showToast } = useToast();
  const dispatch = useAppDispatch();
  const productCache = useAppSelector((state) => state.pos.productCache);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const { products } = usePosProducts();

  // Parse details string as fallback in case API isn't ready or returns null/empty
  const fallbackDetails = React.useMemo(() => parseRecallListText(orderDetailsStr, orderId), [orderDetailsStr, orderId]);

  const effectiveOrderId = Number(
    orderId ||
    (orderDetailsStr && (orderDetailsStr.match(/Order\s*:\s*(\d+)/i)?.[1] || orderDetailsStr.match(/Order\s*No\s*:\s*(\d+)/i)?.[1] || orderDetailsStr.match(/#(\d+)/)?.[1])) ||
    0
  );

  const [modifierTypes, setModifierTypes] = useState<any[]>([]);
  const [allExtras, setAllExtras] = useState<any[]>([]);
  // Employee of the order (AGENT.md §6.0) looked up by its employee id when this device has no name for it yet.
  const [lookedUpEmployee, setLookedUpEmployee] = useState<string | null>(null);

  useEffect(() => {
    setLookedUpEmployee(null);
    const raw = order?.masterData || order?.master || order;
    const m = Array.isArray(raw) ? (raw[0] || {}) : (raw || {});
    const empId = m.employeeId ?? m.empId ?? m.salespersonId;
    const savedName = m.employeeName ?? m.waiter ?? order?.employeeName ?? fallbackDetails?.employeeName;
    if (!order || savedOrderWaiterName(savedName, empId) !== "Waiter" || !(Number(empId) > 0)) return;
    let cancelled = false;
    resolveEmployeeNameForPrint(empId, savedName)
      .then((name) => { if (!cancelled) setLookedUpEmployee(name); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [order, fallbackDetails]);

  useEffect(() => {
    if (isOpen && (orderId || effectiveOrderId)) {
      void loadOrderDetails();
      void fetchModifierTypes();
      void fetchAllExtras();
    } else {
      setOrder(null);
    }
  }, [isOpen, orderId, effectiveOrderId]);

  const fetchModifierTypes = async () => {
    try {
      const data = await menuApi.getModifierTypes();
      setModifierTypes(data || []);
    } catch (e) {
      console.error("Failed to load modifier types:", e);
    }
  };

  const fetchAllExtras = async () => {
    try {
      const data = await menuApi.getAllExtras();
      setAllExtras(data || []);
    } catch (e) {
      console.warn("Failed to load extras:", e);
    }
  };

  const loadOrderDetails = async () => {
    const targetId = Number(orderId || effectiveOrderId);
    if (!targetId) return;
    setLoading(true);
    try {
      const currentPriceView = getPriceView();
      const parsedType = fallbackDetails?.orderTypeName || (orderDetailsStr?.match(/\((DineIn|TakeOut|DriveThru|Delivery|Providers|Coming)\)/i)?.[1]);
      const response = await orderApi.getOrderDetails(targetId, {
        priceView: currentPriceView,
        orderType: parsedType,
      });
      const orderData = response?.data || response;
      const rawMaster = orderData?.masterData || orderData?.master || orderData;
      const master = Array.isArray(rawMaster) ? (rawMaster[0] || {}) : (rawMaster || {});
      const details = orderData?.detailsData || orderData?.details || [];

      if (orderData && ((Array.isArray(details) && details.length > 0) || (master && (master.orderNo || master.orderId || master.ticketNo)))) {
        console.log("ORDER DETAILS RAW RESPONSE:", JSON.stringify(orderData, null, 2));
        const safeOrderTypeId = master.orderTypeId || (master.orderType && orderTypeNameMap[master.orderType]) || 1;

        // Ensure alternatives are fetched and cached for products in this order
        const pIds = Array.from(new Set(details.map((d: any) => d.productId || d.ProductId || d.itemId || d.ItemId).filter(Boolean)));
        await Promise.all(
          pIds.map(async (pId: any) => {
            const key = `${pId}-${safeOrderTypeId}`;
            if (!alternativesCache[key]) {
              try {
                const alts = await menuApi.getAlternatives(Number(pId), safeOrderTypeId);
                if (alts && alts.length > 0) {
                  alternativesCache[key] = alts;
                }
              } catch {}
            }
          })
        );

        // Enrich detail rows with accurate alternative / variant names
        details.forEach((d: any) => {
          const pId = d.productId || d.ProductId || d.itemId || d.ItemId;
          const uId = d.unitId ?? d.UnitId;
          const altsKey = `${pId}-${safeOrderTypeId}`;
          const alts = alternativesCache[altsKey] || [];
          const matchedAlt = alts.find((a: any) => Number(a.unitId ?? a.UnitId ?? a.id ?? a.Id) === Number(uId));

          if (matchedAlt) {
            d.altName = matchedAlt.altName;
            d.variantName = matchedAlt.altName;
            d.variantArabic = matchedAlt.altArabic;
            d.unitName = matchedAlt.altName;
          } else if (d.altName || d.variantName) {
            d.variantName = d.altName || d.variantName;
            d.unitName = d.variantName;
          }

          if (!d.productName && !d.ProductName) {
            const numPid = Number(pId);
            const cachedProd = productCache[numPid] || (products && products.find((p: any) => p.id === numPid));
            if (cachedProd) {
              d.productName = cachedProd.name;
              d.arabicName = cachedProd.arabicName;
            }
          }
        });

        setOrder(orderData);
      } else {
        // Fall back to parsed details from order string
        setOrder(fallbackDetails);
      }
    } catch (err) {
      console.warn("API error, falling back to parsed string details:", err);
      setOrder(fallbackDetails);
    } finally {
      setLoading(false);
    }
  };

  // Deduplicate modifiersData to prevent Cartesian product duplicates from backend SQL joins
  const modifiersData = React.useMemo(
    () => dedupeModifierRows(order?.modifiersData || order?.modifiers || order?.ModifiersData || order?.Modifiers || order?.data?.modifiersData || order?.data?.modifiers || []),
    [order?.modifiersData, order?.modifiers, order?.ModifiersData, order?.Modifiers, order?.data]
  );

  const handlePrintKOT = () => printRecallOrderKot({ orderId, order, fallbackDetails, orderDetailsStr, allExtras, modifierTypes, products, productCache, showToast });

  const handlePrintGuest = async () => {
    const targetOrderId = Number(orderId || effectiveOrderId);
    if (!targetOrderId) return;
    await printRecallOrderGuestReceipt({
      orderId: targetOrderId,
      order,
      orderDetailsStr,
      products,
      productCache,
      alternativesCache,
      showToast,
    });
  };

  const handleEditOrder = () => {
    if (!order) return;
    if (onEditRequest && orderId) {
      onEditRequest(orderId);
      return;
    }
    
    try {
      // Shared saved-order loader (savedOrderToCart.ts) — same code as Settled → Edit.
      const load = buildSavedOrderLoad(order, {
        mode: "recallEdit",
        orderId: Number(orderId),
        products,
        productCache,
        modifierTypes,
        allExtras,
        orderTypeHints: [
          order?.orderTypeName,
          fallbackDetails?.orderTypeName,
          orderDetailsStr?.match(/((DineIn|TakeOut|DriveThru|Delivery|Providers|Coming))/i)?.[1],
        ],
      });
      dispatchSavedOrderLoad(load, dispatch, Number(orderId));
      onEditSuccess?.();
      onClose();
    } catch (e) {
      console.error(e);
      showToast("Failed to load order into editor", "error");
    }
  };

  const handleSettleOrder = () => {
    if (!order) return;
    if (onSettleRequest && orderId) {
      onSettleRequest(orderId);
      return;
    }
    
    try {
      // Shared saved-order loader (savedOrderToCart.ts) — same code as Settled → Edit.
      const load = buildSavedOrderLoad(order, {
        mode: "recallSettle",
        orderId: Number(orderId),
        products,
        productCache,
        modifierTypes,
        allExtras,
        orderTypeHints: [
          order?.orderTypeName,
          fallbackDetails?.orderTypeName,
          orderDetailsStr?.match(/((DineIn|TakeOut|DriveThru|Delivery|Providers|Coming))/i)?.[1],
        ],
      });
      dispatchSavedOrderLoad(load, dispatch, Number(orderId));
      onSettleSuccess?.(load.netAmount);
      onClose();
    } catch (e) {
      console.error(e);
      showToast("Failed to load order for settlement", "error");
    }
  };

  if (!isOpen) return null;

  const rawMaster = order?.masterData || order?.master || order;
  const master = Array.isArray(rawMaster) ? (rawMaster[0] || {}) : (rawMaster || {});
  const details = sortOrderDetailsBySequence(order?.detailsData || order?.details || []);
  
  const orderNo = master.orderNo ?? order?.orderNo ?? orderId ?? "";
  const ticketNo = toDisplayNo(master.ticketNo) ?? toDisplayNo(order?.ticketNo) ?? "";
  // The order's employee: punched code or default employee (AGENT.md §6.0), never this device's other names.
  const rawEmpName = master.employeeName ?? master.waiter ?? order?.employeeName ?? fallbackDetails?.employeeName;
  const shownEmployee = savedOrderWaiterName(rawEmpName, master.employeeId ?? master.empId ?? master.salespersonId);
  const employeeName = shownEmployee === "Waiter" && lookedUpEmployee ? lookedUpEmployee : shownEmployee;
  
  const orderTypeMap: Record<number, string> = {
    1: "DineIn",
    2: "TakeOut",
    3: "DriveThru",
    4: "Delivery",
    5: "Providers",
    6: "Coming"
  };
  const orderTypeCandidate =
    master.orderType ||
    orderTypeMap[master.orderTypeId] ||
    master.orderTypeName ||
    order?.orderTypeName ||
    fallbackDetails?.orderTypeName ||
    (orderDetailsStr?.match(/\((DineIn|TakeOut|DriveThru|Delivery|Providers|Coming)\)/i)?.[1]) ||
    "TakeOut";
  const orderTypeName = fallbackOrderTypeByName(orderTypeCandidate).orderType;
  
  // Extract time from orderDetailsStr as a reliable fallback (e.g. "7:46:02 PM")
  const timeFromDetails = (() => {
    if (!orderDetailsStr) return "";
    const m = orderDetailsStr.match(/(\d{1,2}:\d{2}:\d{2}\s*(?:AM|PM))/i);
    return m ? m[1] : "";
  })();

  // Try every common backend date field name — never fall back to current time
  const voucherDate: string =
    master.voucherDate ??
    master.VoucherDate ??
    master.orderDate ??
    master.OrderDate ??
    master.entryDate ??
    master.EntryDate ??
    master.transDate ??
    master.TransDate ??
    master.punchTime ??
    master.PunchTime ??
    master.orderTime ??
    master.OrderTime ??
    master.createdAt ??
    master.CreatedAt ??
    master.orderDateTime ??
    master.OrderDateTime ??
    order?.voucherDate ??
    order?.VoucherDate ??
    order?.orderDate ??
    order?.OrderDate ??
    order?.entryDate ??
    order?.createdAt ??
    timeFromDetails; // last resort: extract from the recall list text

  // Format date as dd/MM/yyyy preserving time portion
  const formatVoucherDate = (raw: string): string => {
    try {
      if (!raw) return "";
      const d = new Date(raw);
      if (isNaN(d.getTime())) {
        // If it's just a time string like "7:46:02 PM" extracted from details, prepend today's date
        if (/am|pm/i.test(raw)) {
          const today = new Date();
          const dd = String(today.getDate()).padStart(2, '0');
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const yyyy = today.getFullYear();
          return `${dd}/${mm}/${yyyy} ${raw}`;
        }
        return raw;
      }
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
    } catch { return raw; }
  };

  // Master Totals directly from API
  const rawVatExcl = Number(
    master.vatExclAmount !== undefined && master.vatExclAmount !== null
      ? master.vatExclAmount
      : (master.VatExclAmount !== undefined && master.VatExclAmount !== null
          ? master.VatExclAmount
          : (master.subTotal ?? 0))
  );

  const displayServiceCharge = Number(master.serviceCharge ?? master.ServiceCharge ?? 0);
  const displayLevy = Number(master.levyAmt ?? master.levy ?? master.Levy ?? 0);
  const displayCharges = roundCalc(displayServiceCharge + displayLevy);

  const displayDeliveryCharge = Number(master.deliveryCharge ?? master.DeliveryCharge ?? 0);

  const backendDiscount = Number(
    master.discAmount ??
    master.DiscAmount ??
    master.discAmt ??
    master.DiscAmt ??
    master.discount ??
    master.Discount ??
    master.billDiscount ??
    master.BillDiscount ??
    master.billDiscountValue ??
    0
  );

  const lineDiscountsTotal = (details || []).reduce(
    (sum: number, d: any) => sum + Number(d.discAmount ?? d.DiscAmount ?? 0),
    0
  );


  // When master data has discount: treated as bill level discount (backendDiscount is already exclusive).
  // When details data only has discount: treated as item discount.
  const isBillDiscount = Boolean(
    backendDiscount > 0.001 ||
    Number(master.discPer ?? master.DiscPer ?? 0) > 0 ||
    checkOrderHasBillDiscount(order) ||
    checkOrderHasBillDiscount({ master, details })
  );
  const isItemDiscount = !isBillDiscount && lineDiscountsTotal > 0.001;

  // Discount from THE stored-order footer (exclusive, per-line saved rates) — same as recall-edit.
  const displayDiscount = storedOrderFooter(order, getPriceView()).discount;

  // Sub Total includes any discount (item or bill discount): (vatExclAmount - charges) + discount
  const displaySubTotal = roundCalc(Math.max(0, rawVatExcl - displayCharges) + displayDiscount);

  const displayVatAmount = Number(
    master.vatAmount ??
    master.VatAmount ??
    master.vatAmt ??
    0
  );
  const isVatActive = Boolean(isEnableVatGuestPrint(master as any) || getVatStatus() || displayVatAmount > 0);

  const netAmount = Number(
    master.netAmount ??
    master.NetAmount ??
    0
  );


  // Footer balanced to the fil so it always adds up (Sub Total − Discount + Charges = Net Value;
  // Net Value + VAT + Delivery = Grand Total). Display only — utils/money.ts balanceBillFooter.
  const shownFooter = balanceBillFooter({
    subTotal: displaySubTotal,
    discount: displayDiscount,
    charges: displayCharges,
    vat: displayVatAmount,
    delivery: displayDeliveryCharge,
    grandTotal: netAmount,
  }, getDecimalPart());


  const hasDelivery = !!master.mobileNo || !!master.contactNo || !!master.deliveryCustomerName;
  const deliveryDetails = hasDelivery ? {
    mobile: master.mobileNo || master.contactNo || "",
    customerName: master.deliveryCustomerName || master.customerName || "",
    callBack: master.callBack || master.callback || master.callBackNo || master.callbackNo || "",
    area: master.area || "",
    block: master.blockNo || "",
    road: master.roadNo || "",
    building: master.buildingNo || "",
    flat: master.flatNo || "",
    change: master.change || master.keepChanges || "",
  } : order?.deliveryDetails;

  return (
    <SavedOrderWindow
      isOpen={isOpen}
      onClose={onClose}
      loading={loading}
      loadingText="Retrieving Ticket Data..."
      hasOrder={Boolean(order)}
      header={
        <>
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#f48120]">RECALL DETAILS</h2>
          <button onClick={onClose} className="p-1 hover:bg-stone-800 rounded-full transition-colors text-stone-400 hover:text-stone-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </>
      }
    >
      {/* LEFT SIDE: TICKET VIEW (Thermal Printer Style) */}
      <div className="flex-1 min-w-0 p-5 bg-[#faf8f5] text-stone-900 font-mono text-xs flex flex-col justify-between select-text shadow-inner">
        <div>
          {/* Ticket Header */}
          <div className="text-center font-bold border-b border-dashed border-stone-400 pb-3 mb-3">
            <div className="text-sm font-black tracking-wide uppercase">BITEZO POS</div>
            <div className="text-[10px] text-stone-500 font-medium">TERMINAL TICKET</div>
          </div>

          {/* Order Meta Info Grid */}
          <div className="grid grid-cols-2 gap-y-1 text-[11px] border-b border-dashed border-stone-400 pb-3 mb-3">
            <MetaField label="Order No">{orderNo}</MetaField>
            <MetaField label="Ticket" className="text-right">{ticketNo}</MetaField>
            <MetaField label="Emp">{employeeName}</MetaField>
            <MetaField label="Type" className="text-right" valueClassName="font-bold text-[#49293e]">{orderTypeName}</MetaField>
            <MetaField label="Customer" className="col-span-2 sm:col-span-1">
              {master.deliveryCustomerName || master.vehicleCustomerName || master.customerName || "CASH CUSTOMER"}
            </MetaField>
            {orderTypeName.toLowerCase().includes("dine") && master.tableNo && (
              <MetaField label="Table" className="col-span-2 sm:col-span-1 text-right">
                {master.sectionName ? `${master.sectionName} - ` : ""}{master.tableNo}
              </MetaField>
            )}
            {master.note && (
              <MetaField label="Note" className="col-span-2 mt-1" valueClassName="font-bold italic text-stone-600">"{master.note}"</MetaField>
            )}
            {master.vehicleNo && (
              <MetaField label="Vehicle" className="col-span-2 mt-1" valueClassName="font-bold uppercase">
                {master.vehicleNo} {master.vehicleCustomerName ? `(${master.vehicleCustomerName})` : ""}
              </MetaField>
            )}
            <div className="col-span-2 text-stone-500 text-[10px] mt-1">
              Date: {formatVoucherDate(voucherDate)}
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-4">
            <div className="grid grid-cols-[28px_minmax(0,1fr)_55px_65px] gap-2 font-bold text-stone-500 text-[10px] uppercase border-b border-stone-300 pb-1 mb-2">
              <div className="text-center">{t("Qty")}</div>
              <div>{t("Item")}</div>
              <div className="text-right">{t("Price")}</div>
              <div className="text-right">{t("Total")}</div>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[200px] pr-1">
              {details.map((item: any, i: number) => {
                const primaryName = item.productName || item.itemName || `Item #${item.productId || i + 1}`;
                const arabicName = item.arabicName || item.productArabicName || "";
                const localized = getLocalizedName(primaryName, arabicName);
                const variantName = item.variantName || item.altName || "";
                const qty = Number(item.qty ?? item.quantity ?? 1);
                const price = Number(item.price ?? 0);
                const lineTotal = Number(item.amount ?? (price * qty));
                const lineDisc = Number(item.discAmount ?? 0);
                const itemDisc = (isItemDiscount && lineDisc > 0) ? lineDisc : 0;
                const netAmt = itemDisc > 0 ? Math.max(0, lineTotal - itemDisc) : lineTotal;
                const { extras, standardMods, messages } = classifyLineModifiers(modifierRowsOfLine(modifiersData, item.mapId ?? item.MapId));

                return (
                  <div key={i} className="flex flex-col">
                    <div className="grid grid-cols-[28px_minmax(0,1fr)_55px_65px] gap-2 items-start text-[11px] leading-tight">
                      <div className="font-bold text-stone-500 text-center">{qty}</div>
                      <div className="flex flex-col font-bold text-stone-800 min-w-0">
                        <span className="break-words [overflow-wrap:anywhere] [word-break:break-word]">
                          {formatItemDisplayName(localized.primary, variantName)}
                        </span>
                        {localized.secondary && (
                          <span className="text-[10px] text-stone-500 font-semibold break-words [overflow-wrap:anywhere] [word-break:break-word] mt-0.5">{localized.secondary}</span>
                        )}
                      </div>
                      <div className="text-right text-stone-500 shrink-0">{formatAmount(price)}</div>
                      <div className="text-right font-bold text-stone-900 shrink-0">
                        {formatAmount(lineTotal)}
                      </div>
                    </div>

                    {isItemDiscount && itemDisc > 0 && <ItemDiscountRow variant="recall" discount={itemDisc} net={netAmt} />}
                    <LineAddons variant="recall" extras={extras} standardMods={standardMods} messages={messages} />
                  </div>
                );
              })}
            </div>
          </div>

          {deliveryDetails && <DeliveryDetailsBlock details={deliveryDetails} />}
        </div>

        <SavedOrderTotals
          shown={shownFooter}
          discount={displayDiscount}
          charges={displayCharges}
          delivery={displayDeliveryCharge}
          showVat={isVatActive || displayVatAmount > 0}
        />
      </div>

      {/* RIGHT SIDE: VERTICAL ACTION BUTTONS */}
      <SavedOrderActions>
        <TicketActionButton tone="kot" onClick={handlePrintKOT}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.821V21h10.56v-7.179M9 3.75h6M19.5 8.25h-15A2.25 2.25 0 0 0 2.25 10.5v6.75a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25V10.5a2.25 2.25 0 0 0-2.25-2.25Z" />
          </svg>
          KOT
        </TicketActionButton>

        <TicketActionButton tone="guest" onClick={handlePrintGuest}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0 .229 2.523a1.125 1.125 0 0 1-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0 0 21 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 0 0-1.913-.247M6.34 18H5.25A2.25 2.25 0 0 1 3 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 0 1 1.913-.247m10.5 0a48.536 48.536 0 0 0-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5Zm-7.5 0h.008v.008H10.5V10.5Zm-3 0h.008v.008H7.5V10.5Z" />
          </svg>
          {t("GUEST")}
        </TicketActionButton>

        <TicketActionButton tone="edit" onClick={handleEditOrder}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
          </svg>
          {t("EDIT")}
        </TicketActionButton>

        <TicketActionButton tone="settle" onClick={handleSettleOrder}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5M4.5 9h15M5.25 13.5h13.5M2.25 18.75V16.5a1.5 1.5 0 0 1 1.5-1.5h15a1.5 1.5 0 0 1 1.5 1.5v2.25" />
          </svg>
          {t("SETTLE")}
        </TicketActionButton>

        <TicketActionButton tone="close" onClick={onClose}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
          {t("CLOSE")}
        </TicketActionButton>
      </SavedOrderActions>
    </SavedOrderWindow>
  );
};