import React, { useState, useEffect } from "react";
import { menuApi } from "../../../../services/menuApi";
import { useToast } from "../../../../../../app/providers/useToast";
import { useAppDispatch, useAppSelector } from "../../../../../../app/hooks";
import { printRecallOrderGuestReceipt } from "../../../utils/printRecallOrder";

import { usePosProducts, alternativesCache } from "../../../hooks/usePosProducts";
import { t } from "../../../../utils/posLocalization";
import { buildSavedOrderLoad, dispatchSavedOrderLoad } from "../../../utils/savedOrderToCart";
import { printRecallOrderKot } from "../../../utils/printRecallKot";
import { SavedOrderWindow, SavedOrderActions, TicketActionButton } from "../savedOrder/SavedOrderTicket";
import { SavedOrderTicketBody } from "../savedOrder/SavedOrderTicketBody";
import { fetchRecallOrderData } from "../../../utils/loadRecallOrder";
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
      const orderData = await fetchRecallOrderData(targetId, {
        orderTypeHint: fallbackDetails?.orderTypeName || (orderDetailsStr?.match(/\((DineIn|TakeOut|DriveThru|Delivery|Providers|Coming)\)/i)?.[1]),
        productCache,
        products,
      });
      if (orderData) {
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
      {/* LEFT SIDE: TICKET VIEW (Thermal Printer Style) — shared with the Dine-In table cards */}
      <SavedOrderTicketBody order={order} orderId={orderId} orderDetailsStr={orderDetailsStr} fallbackDetails={fallbackDetails} />

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