import React, { useState, useEffect } from "react";
import Modal from "../../../../components/common/Modal";
import { Loader } from "../../../../components/common";
import { orderApi } from "../../services/orderApi";
import { useToast } from "../../../../app/providers/useToast";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import { loadRecalledOrder } from "../store/posSlice";
import { formatAmount } from "../../../../utils/currency";

interface PosRecallDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number | null;
  orderDetailsStr?: string; // Fallback string parsed from the recall list (e.g. details text)
  onEditSuccess?: () => void; // Triggered when loading into POS cart to close the parent modals
  onSettleSuccess?: (amount: number) => void; // Triggered when proceeding to settlement
}

export const PosRecallDetailsModal: React.FC<PosRecallDetailsModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderDetailsStr = "",
  onEditSuccess,
  onSettleSuccess,
}) => {
  const { showToast } = useToast();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const products = useAppSelector(state => state.pos.products);

  // Parse details string as fallback in case API isn't ready or returns null/empty
  const fallbackDetails = React.useMemo(() => {
    if (!orderDetailsStr) return null;
    try {
      // E.g.: "Order : 5 Ticket : 1 07:52:49 AM (DineIn) (CASH CUSTOMER) (Waiter) Section : UPSTAIR TableNo : T1 Amnt : 9.800"
      const details = orderDetailsStr;
      
      const orderNoMatch = details.match(/Order\s*:\s*(\d+)/i);
      const ticketNoMatch = details.match(/Ticket\s*:\s*(\d+)/i);
      const amntMatch = details.match(/Amnt\s*:\s*([\d.]+)/i);
      const typeMatch = details.match(/\((DineIn|TakeOut|DriveThru|Delivery|Providers|Coming)\)/i);
      const customerMatch = details.match(/\((CASH CUSTOMER|[^)]+)\)/gi);
      
      // Attempt to extract customer/waiter names (usually in parentheses)
      let customerName = "CASH CUSTOMER";
      let employeeName = "Waiter";
      if (customerMatch && customerMatch.length >= 2) {
        customerName = customerMatch[1].replace(/[()]/g, "");
        if (customerMatch.length >= 3) {
          employeeName = customerMatch[2].replace(/[()]/g, "");
        }
      }

      const orderNo = orderNoMatch ? orderNoMatch[1] : (orderId || "");
      const ticketNo = ticketNoMatch ? ticketNoMatch[1] : "";
      const netAmount = amntMatch ? parseFloat(amntMatch[1]) : 0;
      const orderType = typeMatch ? typeMatch[1] : "DineIn";
      
      // Parse date/time
      const timeMatch = details.match(/(\d{2}:\d{2}:\d{2}\s*(?:AM|PM))/i);
      const timeStr = timeMatch ? timeMatch[1] : new Date().toLocaleTimeString();

      // Create fallback lines (mocked based on total amount)
      const mockItems = [
        {
          productId: 1,
          productName: "Ordered Items",
          qty: 1,
          price: netAmount,
          netAmount: netAmount,
        }
      ];

      return {
        orderId: orderId || 0,
        orderNo,
        ticketNo,
        employeeName,
        customerName,
        orderTypeName: orderType,
        netAmount,
        voucherDate: `${new Date().toLocaleDateString()} ${timeStr}`,
        details: mockItems,
        deliveryDetails: details.toLowerCase().includes("delivery") ? {
          mobile: "33000033",
          customerName: "Delivery Customer",
          area: "Area 1",
          block: "10",
          road: "20",
          building: "30",
          flat: "40",
        } : undefined
      };
    } catch (e) {
      console.error("Failed to parse fallback details:", e);
      return null;
    }
  }, [orderDetailsStr, orderId]);

  useEffect(() => {
    if (isOpen && orderId) {
      void loadOrderDetails();
    } else {
      setOrder(null);
    }
  }, [isOpen, orderId]);

  const loadOrderDetails = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const response = await orderApi.getOrderDetails(orderId);
      if (response && response.isSuccess && response.data) {
        setOrder(response.data);
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
  const modifiersData = React.useMemo(() => {
    const rawModifiers = order?.modifiersData || [];
    const seen = new Set<string>();
    return rawModifiers.filter((m: any) => {
      const key = `${m.mapId}-${m.modifierId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [order?.modifiersData]);

  const handlePrintKOT = () => {
    if (!orderId) return;
    showToast(`Printing KOT for Order #${orderId}...`, "success");
  };

  const handleEditOrder = () => {
    if (!order) return;
    
    try {
      const master = order.masterData || order;
      const details = order.detailsData || order.details || [];

      const mappedCartItems = details.map((detail: any, idx: number) => {
        const itemModifiers = modifiersData.filter((m: any) => m.mapId === detail.mapId);
        
        const extras = itemModifiers.filter((m: any) => m.price > 0).map((m: any) => ({
          id: m.modifierId,
          name: m.modifierName,
          price: m.price,
          qty: m.qty,
          typeId: 1
        }));

        const modifiers = itemModifiers.filter((m: any) => m.price === 0).map((m: any) => ({
          id: m.modifierId,
          name: m.modifierName,
          qty: m.qty,
          typeId: 2
        }));

        let pId = detail.productId ?? detail.ProductId ?? detail.itemId ?? detail.ItemId ?? detail.product?.id ?? detail.Product?.id;
        
        if (!pId && detail.productName) {
          const matched = products.find(p => p.name === detail.productName || p.name === detail.ProductName);
          if (matched) pId = matched.id;
        }

        if (!pId) {
          console.error("RAW API DETAIL MISSING ID:", JSON.stringify(detail, null, 2));
        }

        const priceView = (() => {
          try {
            const saved = localStorage.getItem('posConfigs');
            const full = saved ? JSON.parse(saved) : {};
            return full?.configs?.priceView === 'Inclusive' ? 'Inclusive' : 'Exclusive';
          } catch { return 'Exclusive'; }
        })();
        const isIncl = priceView === 'Inclusive';

        return {
          uniqueId: `${pId}-variant-${Date.now()}-${idx}`,
          productId: pId,
          quantity: detail.qty || 1,
          price: detail.price || 0,
          isIncl: isIncl,
          discountValue: detail.discAmount || 0,
          discountType: detail.discPer ? 'percentage' : 'amount',
          extras,
          modifiers,
          isExisting: true,
          mapId: detail.mapId,
          originalQty: detail.qty || 1,
          product: {
            id: pId,
            name: detail.productName || detail.ProductName || `Product #${pId}`,
            price: detail.price || 0,
            categoryId: 1,
            unitId: detail.unitId || 1,
          }
        };
      });

      const orderTypeNameMap: Record<string, number> = {
        "DineIn": 1, "TakeOut": 2, "DriveThru": 3,
        "Delivery": 4, "Providers": 5, "Coming": 6
      };

      const orderTypeName = master.orderType || master.orderTypeName || "DineIn";
      const orderTypeId = master.orderTypeId || orderTypeNameMap[orderTypeName] || 1;

      dispatch(loadRecalledOrder({
        editingOrderId: orderId,
        cartItems: mappedCartItems,
        orderTypeId: orderTypeId,
        orderTypeName: orderTypeName,
        customerId: master.customerId || 1,
        addressId: master.addressId || 0,
        billDiscountValue: master.discAmount || 0,
        billDiscountType: master.discPer ? 'percentage' : 'amount',
        sectionId: master.sectionId || 0,
        tableId: master.tableId || 0
      }));

      showToast("Order loaded into active session for editing", "success");
      onEditSuccess?.();
      onClose();
    } catch (e) {
      console.error(e);
      showToast("Failed to load order into editor", "error");
    }
  };

  const handleSettleOrder = () => {
    if (!order) return;
    
    try {
      const master = order.masterData || order;
      const details = order.detailsData || order.details || [];

      const priceView = (() => {
        try {
          const saved = localStorage.getItem('posConfigs');
          const full = saved ? JSON.parse(saved) : {};
          return full?.configs?.priceView === 'Inclusive' ? 'Inclusive' : 'Exclusive';
        } catch { return 'Exclusive'; }
      })();
      const isIncl = priceView === 'Inclusive';

      const mappedCartItems = details.map((detail: any, idx: number) => {
        const itemModifiers = modifiersData.filter((m: any) => m.mapId === detail.mapId);
        
        const extras = itemModifiers.filter((m: any) => m.price > 0).map((m: any) => ({
          id: m.modifierId,
          name: m.modifierName,
          price: m.price,
          qty: m.qty,
          typeId: 1
        }));

        const modifiers = itemModifiers.filter((m: any) => m.price === 0).map((m: any) => ({
          id: m.modifierId,
          name: m.modifierName,
          qty: m.qty,
          typeId: 2
        }));

        let pId = detail.productId ?? detail.ProductId ?? detail.itemId ?? detail.ItemId ?? detail.product?.id ?? detail.Product?.id;
        
        if (!pId && detail.productName) {
          const matched = products.find(p => p.name === detail.productName || p.name === detail.ProductName);
          if (matched) pId = matched.id;
        }

        if (!pId) {
          console.error("RAW API DETAIL MISSING ID:", JSON.stringify(detail, null, 2));
        }

        return {
          uniqueId: `${pId}-variant-${Date.now()}-${idx}`,
          productId: pId,
          quantity: detail.qty || 1,
          price: detail.price || 0,
          isIncl: isIncl,
          discountValue: detail.discAmount || 0,
          discountType: detail.discPer ? 'percentage' : 'amount',
          extras,
          modifiers,
          isExisting: true,
          mapId: detail.mapId,
          originalQty: detail.qty || 1,
          product: {
            id: pId,
            name: detail.productName || detail.ProductName || `Product #${pId}`,
            price: detail.price || 0,
            categoryId: 1,
            unitId: detail.unitId || 1,
          }
        };
      });

      const orderTypeNameMap: Record<string, number> = {
        "DineIn": 1, "TakeOut": 2, "DriveThru": 3,
        "Delivery": 4, "Providers": 5, "Coming": 6
      };

      const orderTypeName = master.orderType || master.orderTypeName || "DineIn";
      const orderTypeId = master.orderTypeId || orderTypeNameMap[orderTypeName] || 1;

      dispatch(loadRecalledOrder({
        editingOrderId: orderId,
        cartItems: mappedCartItems,
        orderTypeId: orderTypeId,
        orderTypeName: orderTypeName,
        customerId: master.customerId || 1,
        addressId: master.addressId || 0,
        billDiscountValue: master.discAmount || 0,
        billDiscountType: master.discPer ? 'percentage' : 'amount',
        sectionId: master.sectionId || 0,
        tableId: master.tableId || 0,
        isSettling: true
      }));

      onSettleSuccess?.(master.netAmount || 0);
      onClose();
    } catch (e) {
      console.error(e);
      showToast("Failed to load order for settlement", "error");
    }
  };

  if (!isOpen) return null;

  const master = order?.masterData || order || {};
  const details = order?.detailsData || order?.details || [];
  
  const orderNo = master.orderNo ?? order?.orderNo ?? orderId ?? "";
  const ticketNo = master.ticketNo ?? order?.ticketNo ?? "1";
  const employeeName = master.employeeName ?? order?.employeeName ?? "Waiter";
  
  const orderTypeMap: Record<number, string> = {
    1: "DineIn",
    2: "TakeOut",
    3: "DriveThru",
    4: "Delivery",
    5: "Providers",
    6: "Coming"
  };
  const orderTypeName = orderTypeMap[master.orderTypeId] || master.orderTypeName || order?.orderTypeName || "DineIn";
  
  const voucherDate = master.voucherDate ?? order?.voucherDate ?? new Date().toLocaleString();
  const netAmount = master.netAmount ?? order?.netAmount ?? 0;

  const hasDelivery = !!master.mobileNo;
  const deliveryDetails = hasDelivery ? {
    mobile: master.mobileNo,
    customerName: master.deliveryCustomerName || master.customerName || "",
    area: master.area || "",
    block: master.blockNo || "",
    road: master.roadNo || "",
    building: master.buildingNo || "",
    flat: master.flatNo || "",
  } : order?.deliveryDetails;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      noPadding
      className="bg-[#262626] border border-stone-800 shadow-2xl rounded-2xl overflow-hidden max-w-[500px]"
    >
      {/* HEADER */}
      <div className="bg-[#1e1e1e] border-b border-stone-800 text-stone-100 py-3.5 px-6 flex justify-between items-center">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#f48120]">RECALL DETAILS</h2>
        <button onClick={onClose} className="p-1 hover:bg-stone-800 rounded-full transition-colors text-stone-400 hover:text-stone-100">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="py-24 flex items-center justify-center bg-stone-900/40">
          <Loader text="Retrieving Ticket Data..." />
        </div>
      ) : order ? (
        <div className="flex flex-col md:flex-row min-h-[420px] bg-stone-950/80">
          {/* LEFT SIDE: TICKET VIEW (Thermal Printer Style) */}
          <div className="flex-1 p-5 bg-[#faf8f5] text-stone-900 font-mono text-xs flex flex-col justify-between overflow-y-auto select-text shadow-inner">
            <div>
              {/* Ticket Header */}
              <div className="text-center font-bold border-b border-dashed border-stone-400 pb-3 mb-3">
                <div className="text-sm font-black tracking-wide uppercase">BITEZO POS</div>
                <div className="text-[10px] text-stone-500 font-medium">TERMINAL TICKET</div>
              </div>

              {/* Order Meta Info Grid */}
              <div className="grid grid-cols-2 gap-y-1 text-[11px] border-b border-dashed border-stone-400 pb-3 mb-3">
                <div>
                  <span className="text-stone-500">Order No: </span>
                  <span className="font-bold">{orderNo}</span>
                </div>
                <div className="text-right">
                  <span className="text-stone-500">Ticket: </span>
                  <span className="font-bold">{ticketNo}</span>
                </div>
                
                <div>
                  <span className="text-stone-500">Emp: </span>
                  <span className="font-bold">{employeeName}</span>
                </div>
                <div className="text-right">
                  <span className="text-stone-500">Type: </span>
                  <span className="font-bold text-[#49293e]">{orderTypeName}</span>
                </div>

                <div>
                  <span className="text-stone-500">Customer: </span>
                  <span className="font-bold">{master.customerName || "CASH CUSTOMER"}</span>
                </div>
                {orderTypeName.toLowerCase().includes("dine") && master.tableNo && (
                  <div className="text-right">
                    <span className="text-stone-500">Table: </span>
                    <span className="font-bold">
                      {master.sectionName ? `${master.sectionName} - ` : ""}{master.tableNo}
                    </span>
                  </div>
                )}

                {master.note && (
                  <div className="col-span-2 mt-1">
                    <span className="text-stone-500">Note: </span>
                    <span className="font-bold italic text-stone-600">"{master.note}"</span>
                  </div>
                )}
                
                {master.vehicleNo && (
                  <div className="col-span-2 mt-1">
                    <span className="text-stone-500">Vehicle: </span>
                    <span className="font-bold uppercase">{master.vehicleNo} {master.vehicleCustomerName ? `(${master.vehicleCustomerName})` : ""}</span>
                  </div>
                )}

                <div className="col-span-2 text-stone-500 text-[10px] mt-1">
                  Date: {voucherDate}
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-4">
                <div className="grid grid-cols-[24px_1fr_60px] font-bold text-stone-500 text-[10px] uppercase border-b border-stone-300 pb-1 mb-2">
                  <div>Qty</div>
                  <div className="pl-2">Description</div>
                  <div className="text-right">Amount</div>
                </div>

                <div className="space-y-2.5">
                  {details.map((detail: any, i: number) => {
                    const itemModifiers = modifiersData.filter((m: any) => m.mapId === detail.mapId);
                    return (
                      <div key={i} className="grid grid-cols-[24px_1fr_60px] items-start text-[11px] leading-tight">
                        <div className="font-bold text-stone-500">{detail.qty}</div>
                        <div className="pl-2 flex flex-col font-bold text-stone-800">
                          <span>{detail.productName || `Product #${detail.productId}`}</span>
                          {/* Modifiers display under item */}
                          {itemModifiers.map((mod: any, idx: number) => (
                            <span key={idx} className="text-[9px] text-[#f48120] font-medium pl-1">
                              + {mod.qty > 1 ? `${mod.qty} x ` : ""}{mod.modifierName} {mod.price > 0 ? `(${formatAmount(mod.price)})` : ""}
                            </span>
                          ))}
                          {detail.price > 0 && (
                            <span className="text-[9px] text-stone-400 font-normal">@ {formatAmount(detail.price)}</span>
                          )}
                        </div>
                        <div className="text-right font-bold text-stone-900">
                          {formatAmount(detail.netAmount ?? (detail.price * detail.qty))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Delivery Details Block */}
              {deliveryDetails && (
                <div className="border-t border-dashed border-stone-400 pt-3 mt-3 text-[10px] space-y-0.5 text-stone-600">
                  <div className="font-bold uppercase tracking-wider text-stone-400 mb-1">Delivery Details</div>
                  <div><span className="font-bold text-stone-500">Mobile: </span>{deliveryDetails.mobile}</div>
                  <div><span className="font-bold text-stone-500">Customer: </span>{deliveryDetails.customerName}</div>
                  <div><span className="font-bold text-stone-500">Address: </span>
                    {`Bldg ${deliveryDetails.building || ""}, Road ${deliveryDetails.road || ""}, Block ${deliveryDetails.block || ""}, Flat ${deliveryDetails.flat || ""}, ${deliveryDetails.area || ""}`}
                  </div>
                </div>
              )}
            </div>

            {/* Receipt Footer with Grand Total */}
            <div className="border-t border-dashed border-stone-400 pt-4 mt-6">
              <div className="flex justify-between items-center text-xs font-bold text-stone-900 uppercase">
                <span>Grand Total</span>
                <span className="text-base font-black text-[#f48120]">
                  {formatAmount(netAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: VERTICAL ACTION BUTTONS */}
          <div className="w-full md:w-28 shrink-0 bg-stone-900 border-t md:border-t-0 md:border-l border-stone-800 p-3 flex flex-row md:flex-col gap-2 justify-stretch items-stretch">
            <button
              onClick={handlePrintKOT}
              className="flex-1 md:flex-initial h-12 md:h-14 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-stone-100 font-black text-[10px] uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.821V21h10.56v-7.179M9 3.75h6M19.5 8.25h-15A2.25 2.25 0 0 0 2.25 10.5v6.75a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25V10.5a2.25 2.25 0 0 0-2.25-2.25Z" />
              </svg>
              KOT
            </button>

            <button
              onClick={handleEditOrder}
              className="flex-1 md:flex-initial h-12 md:h-14 rounded-xl bg-[#49293e] hover:bg-[#5c3450] active:scale-95 text-stone-100 font-black text-[10px] uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
              </svg>
              EDIT
            </button>

            <button
              onClick={handleSettleOrder}
              className="flex-1 md:flex-initial h-12 md:h-14 rounded-xl bg-[#a35c24] hover:bg-[#b8692a] active:scale-95 text-stone-100 font-black text-[10px] uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5M4.5 9h15M5.25 13.5h13.5M2.25 18.75V16.5a1.5 1.5 0 0 1 1.5-1.5h15a1.5 1.5 0 0 1 1.5 1.5v2.25" />
              </svg>
              SETTLE
            </button>

            <button
              onClick={onClose}
              className="flex-1 md:flex-initial h-12 md:h-14 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 border border-stone-700/50 shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
              CLOSE
            </button>
          </div>
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-stone-400 bg-stone-900/40">
          <svg className="w-12 h-12 text-stone-600 mb-3 animate-bounce" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <p className="text-xs font-bold uppercase tracking-widest">No Order Data Available</p>
        </div>
      )}
    </Modal>
  );
};
