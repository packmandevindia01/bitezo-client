/**
 * Settled orders → details window: loads one settled order (settled details, sales invoice, settled print data,
 * the original order) and merges them. Moved verbatim out of PosSettledDetailsModal (2026-11-11, split of the
 * saved-order windows); results go back through the window's state setters.
 */
import { pickOrderMoney } from "../../pricing";
import { settledOrdersApi } from "../../services/settledOrdersApi";
import { salesInvoiceApi } from "../../services/salesInvoiceApi";
import { orderApi } from "../../services/orderApi";
import { deliveryApi } from "../../customer/services/deliveryApi";
import { resolveEmployeeNameForPrint } from "../../utils/employeeNames";
import { getPriceView } from "./billing";
import { alternativesCache } from "../hooks/usePosProducts";
import { menuApi } from "../../services/menuApi";

// Saved-order data from the API is untyped; the window keeps it as-is.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

/** Merge modifier rows from two sources (same modifier + line = one row; a missing price is taken from the other). */
export const mergeModifiersData = (primary: Loose[] = [], fallback: Loose[] = []): Loose[] => {
  const pList = Array.isArray(primary) ? primary : [];
  const fList = Array.isArray(fallback) ? fallback : [];
  if (pList.length === 0) return fList;
  if (fList.length === 0) return pList;

  const merged = pList.map((p: any) => {
    const pId = Number(p.modifierId ?? p.ModifierId ?? p.id ?? p.Id ?? 0);
    const pMapId = Number(p.mapId ?? p.MapId ?? 0);
    const pPrice = Number(p.price ?? p.Price ?? p.amount ?? p.Amount ?? 0);

    const match = fList.find((f: any) => {
      const fId = Number(f.modifierId ?? f.ModifierId ?? f.id ?? f.Id ?? 0);
      const fMapId = Number(f.mapId ?? f.MapId ?? 0);
      return fId === pId && (pMapId === 0 || fMapId === 0 || fMapId === pMapId);
    });

    if (!match) return p;

    const fPrice = Number(match.price ?? match.Price ?? match.amount ?? match.Amount ?? 0);
    const resolvedPrice = pPrice > 0 ? pPrice : fPrice;

    return {
      ...match,
      ...p,
      price: resolvedPrice,
      Price: resolvedPrice,
    };
  });

  fList.forEach((f: any) => {
    const fId = Number(f.modifierId ?? f.ModifierId ?? f.id ?? f.Id ?? 0);
    const fMapId = Number(f.mapId ?? f.MapId ?? 0);
    const exists = pList.some((p: any) => {
      const pId = Number(p.modifierId ?? p.ModifierId ?? p.id ?? p.Id ?? 0);
      const pMapId = Number(p.mapId ?? p.MapId ?? 0);
      return pId === fId && (pMapId === 0 || fMapId === 0 || fMapId === pMapId);
    });
    if (!exists) {
      merged.push(f);
    }
  });

  return merged;
};

export interface LoadSettledOrderContext {
  orderId: number | null;
  orderSummary: Loose;
  orderDetailsStr: string | undefined;
  setLoading: (v: boolean) => void;
  setOrder: (v: Loose) => void;
  setResolvedEmployeeName: (v: string) => void;
  setAllExtras: (v: Loose[]) => void;
  setModifierTypes: (v: Loose[]) => void;
}

/** Load and merge everything the settled-order window shows. */
export const loadSettledOrderDetails = async ({ orderId, orderSummary, orderDetailsStr, setLoading, setOrder, setResolvedEmployeeName, setAllExtras, setModifierTypes }: LoadSettledOrderContext): Promise<void> => {
  if (!orderId) return;
  setLoading(true);
  try {
    let orderData: any = null;
    const effectivePriceView = getPriceView();
    const detectedOrderType = orderSummary?.orderTypeName ||
      (typeof orderDetailsStr === "string" && orderDetailsStr.toLowerCase().includes("dine") ? "DineIn" : undefined);
    try {
      const response = await settledOrdersApi.getSettledOrderDetails(orderId, {
        priceView: effectivePriceView,
        orderType: detectedOrderType,
      });
      if (response && response.isSuccess && response.data) {
        orderData = response.data;
      }
    } catch (e) {
      console.warn("[PosSettledDetailsModal] getSettledOrderDetails failed:", e);
    }

    if (!orderData) {
      try {
        const ordRes = await orderApi.getOrderDetails(orderId, {
          priceView: effectivePriceView,
          orderType: detectedOrderType,
        });
        if (ordRes && (ordRes.data || ordRes.masterData)) {
          orderData = ordRes.data || ordRes;
        }
      } catch (e) {
        console.warn("[PosSettledDetailsModal] fallback getOrderDetails failed:", e);
      }
    }

    if (orderData) {
      const rawInitialMaster = orderData.masterData || orderData.master || orderData;
      let master = Array.isArray(rawInitialMaster) ? (rawInitialMaster[0] || {}) : (rawInitialMaster || {});
      const rawVoucher =
        master.saleId ||
        master.voucherNo ||
        master.invoiceNo ||
        master.voucherNumber ||
        master.saleNo ||
        orderData.saleId ||
        orderData.voucherNo;
      // The settled-orders list row carries the real saleId; the voucher number is only a fallback.
      const listSaleId = Number(orderSummary?.saleId ?? orderSummary?.SaleId ?? 0);
      const saleId = listSaleId > 0 ? listSaleId : (rawVoucher ? parseInt(String(rawVoucher).replace(/\D/g, ""), 10) : NaN);

      if (!isNaN(saleId) && saleId > 0) {
        try {
          const saleRes = await salesInvoiceApi.getSalesInvoiceData(saleId, orderId);
          if (saleRes) {
            const rawSaleMaster =
              saleRes.masterData || saleRes.master || saleRes.data?.masterData || saleRes.data?.master || saleRes;
            const saleMaster = Array.isArray(rawSaleMaster) ? (rawSaleMaster[0] || {}) : (rawSaleMaster || {});
            const saleDetails =
              saleRes.detailsData || saleRes.details || saleRes.data?.detailsData || saleRes.data?.details;
            const salePayments =
              saleRes.paymodesData ||
              saleRes.paymentData ||
              saleRes.paymodes ||
              saleRes.payments ||
              saleRes.data?.paymodesData ||
              saleRes.data?.paymentData ||
              saleRes.data?.paymodes ||
              saleRes.data?.payments;
            orderData = {
              ...orderData,
              ...saleRes,
              masterData: {
                ...master,
                ...saleMaster,
                // Every MONEY value comes from the ORDER (what the cashier saw and the customer was charged).
                // The sales invoice only supplies voucher number, date, employee and customer, so the bill
                // always adds up even if the invoice record disagrees (mismatch is shown as a warning).
                ...pickOrderMoney(master),
                employeeName: saleMaster?.employeeName || master.employeeName || orderData.employeeName,
                employeeId: saleMaster?.employeeId ?? master.employeeId ?? orderData.employeeId,
              },
              detailsData:
                (Array.isArray(orderData.detailsData) && orderData.detailsData.length > 0)
                  ? orderData.detailsData
                  : (Array.isArray(orderData.details) && orderData.details.length > 0)
                  ? orderData.details
                  : saleDetails,
              paymentData:
                Array.isArray(salePayments) && salePayments.length > 0
                  ? salePayments
                  : orderData.paymentData || orderData.payments,
              modifiersData: mergeModifiersData(
                orderData.modifiersData,
                saleRes.modifiersData || saleRes.modifiers || saleRes.data?.modifiersData
              ),
              modifiers: mergeModifiersData(
                orderData.modifiers,
                saleRes.modifiers || saleRes.modifiersData || saleRes.data?.modifiers
              ),
            };
            master = orderData.masterData;
          }
        } catch (saleErr) {
          console.warn("[PosSettledDetailsModal] getSalesInvoiceData fallback:", saleErr);
        }

        try {
          const printRes = await settledOrdersApi.getSettledPrintData(saleId, orderId);
          if (printRes && printRes.isSuccess && printRes.data) {
            const pData = printRes.data;
            const pMaster = pData.masterData || {};
            const pPayments = pData.paymodeData || pData.paymodesData || pData.paymentData;
            orderData = {
              ...orderData,
              masterData: {
                ...orderData.masterData,
                waiter: pMaster.waiter || orderData.masterData?.waiter,
                employeeName: pMaster.waiter || orderData.masterData?.employeeName,
                customerName: pMaster.customerName || orderData.masterData?.customerName,
                voucherDate: pMaster.voucherDate || orderData.masterData?.voucherDate,
                serviceCharge: Number(orderData.masterData?.serviceCharge || 0) > 0
                  ? orderData.masterData?.serviceCharge
                  : (pMaster?.serviceCharge || 0),
                levyAmt: Number(orderData.masterData?.levyAmt || orderData.masterData?.levy || 0) > 0
                  ? (orderData.masterData?.levyAmt || orderData.masterData?.levy)
                  : (pMaster?.levyAmt || pMaster?.levy || 0),
                levy: Number(orderData.masterData?.levyAmt || orderData.masterData?.levy || 0) > 0
                  ? (orderData.masterData?.levyAmt || orderData.masterData?.levy)
                  : (pMaster?.levy || pMaster?.levyAmt || 0),
              },
              paymentData: (Array.isArray(pPayments) && pPayments.length > 0) ? pPayments : orderData.paymentData,
              modifiersData: mergeModifiersData(orderData.modifiersData, pData.modifiersData || pData.modifiers),
              modifiers: mergeModifiersData(orderData.modifiers, pData.modifiers || pData.modifiersData),
            };
            master = orderData.masterData;
          }
        } catch (printErr) {
          console.warn("[PosSettledDetailsModal] getSettledPrintData fallback:", printErr);
        }
      }

      // Query orderApi.getOrderDetails to get original order master data if employee details missing
      try {
        const ordRes = await orderApi.getOrderDetails(orderId);
        if (ordRes && (ordRes.data || ordRes.masterData)) {
          const oData = ordRes.data || ordRes;
          const rawOMaster = oData.masterData || oData.master || oData;
          const oMaster = Array.isArray(rawOMaster) ? (rawOMaster[0] || {}) : (rawOMaster || {});
          const oEmpName = oMaster?.employeeName;
          const curEmpName = master?.employeeName;
          const shouldReplaceName = !curEmpName || ["waiter", "cashier"].includes(String(curEmpName).toLowerCase());

          const validOrderChange = (oMaster?.change !== undefined && oMaster?.change !== null && String(oMaster.change).trim() !== "" && String(oMaster.change).trim() !== "0" && String(oMaster.change).trim() !== "0.00" && String(oMaster.change).trim() !== "0.000")
            ? String(oMaster.change)
            : (oMaster?.keepChanges !== undefined && oMaster?.keepChanges !== null && String(oMaster.keepChanges).trim() !== "" && String(oMaster.keepChanges).trim() !== "0" && String(oMaster.keepChanges).trim() !== "0.00" && String(oMaster.keepChanges).trim() !== "0.000")
            ? String(oMaster.keepChanges)
            : undefined;

          const validSaleChange = (master?.change !== undefined && master?.change !== null && String(master.change).trim() !== "" && String(master.change).trim() !== "0" && String(master.change).trim() !== "0.00" && String(master.change).trim() !== "0.000")
            ? String(master.change)
            : undefined;

          const effectiveChange = validSaleChange || validOrderChange || "";
          const effectiveCallBack = master?.callBack || master?.callback || oMaster?.callBack || oMaster?.callback || "";

          orderData = {
            ...orderData,
            modifiersData: mergeModifiersData(orderData.modifiersData, oData.modifiersData || oData.modifiers),
            modifiers: mergeModifiersData(orderData.modifiers, oData.modifiers || oData.modifiersData),
            masterData: {
              ...master,
              serviceCharge: Number(master?.serviceCharge || 0) > 0
                ? master?.serviceCharge
                : (oMaster?.serviceCharge || 0),
              levyAmt: Number(master?.levyAmt || master?.levy || 0) > 0
                ? (master?.levyAmt || master?.levy)
                : (oMaster?.levyAmt || oMaster?.levy || 0),
              levy: Number(master?.levyAmt || master?.levy || 0) > 0
                ? (master?.levyAmt || master?.levy)
                : (oMaster?.levy || oMaster?.levyAmt || 0),
              employeeName: shouldReplaceName && oEmpName ? oEmpName : master?.employeeName,
              employeeId: master?.employeeId ?? oMaster?.employeeId ?? oMaster?.empId,
              waiterId: master?.waiterId ?? oMaster?.waiterId,
              customerName: master?.customerName || oMaster?.customerName,
              deliveryCustomerName: master?.deliveryCustomerName || oMaster?.deliveryCustomerName,
              tableNo: master?.tableNo || oMaster?.tableNo,
              sectionName: master?.sectionName || oMaster?.sectionName,
              change: effectiveChange,
              keepChanges: effectiveChange,
              callBack: effectiveCallBack,
              flatNo: master?.flatNo || oMaster?.flatNo,
              buildingNo: master?.buildingNo || oMaster?.buildingNo,
              roadNo: master?.roadNo || oMaster?.roadNo,
              blockNo: master?.blockNo || oMaster?.blockNo,
              area: master?.area || oMaster?.area,
              address: master?.address || oMaster?.address,
              mobileNo: master?.mobileNo || oMaster?.mobileNo || oMaster?.contactNo,
              contactNo: master?.contactNo || oMaster?.contactNo || oMaster?.mobileNo,
            },
          };
          master = orderData.masterData;
        }
      } catch (ordErr) {
        console.warn("[PosSettledDetailsModal] orderApi.getOrderDetails fallback:", ordErr);
      }

      // Extract employee name from details string if available
      let nameFromDetails = "";
      const detailsStr = orderDetailsStr || orderData.details || orderSummary?.details || "";
      if (typeof detailsStr === "string" && detailsStr) {
        const custMatches = detailsStr.match(/\((CASH CUSTOMER|[^)]+)\)/gi);
        if (custMatches && custMatches.length >= 2) {
          const potentialEmp = custMatches[custMatches.length - 1].replace(/[()]/g, "").trim();
          if (potentialEmp && !["waiter", "cashier", "cash customer"].includes(potentialEmp.toLowerCase())) {
            nameFromDetails = potentialEmp;
          }
        }
      }

      const rawEmpId =
        master?.employeeId ??
        master?.empId ??
        master?.waiterId ??
        master?.salespersonId ??
        orderSummary?.employeeId ??
        orderSummary?.empId ??
        orderData.employeeId;

      const currentEmp =
        master?.employeeName ||
        orderData.employeeName ||
        master?.waiterName ||
        nameFromDetails;

      const resolvedEmp = await resolveEmployeeNameForPrint(rawEmpId, currentEmp);
      if (orderData.masterData) {
        orderData.masterData.employeeName = resolvedEmp;
      }
      orderData.employeeName = resolvedEmp;
      setResolvedEmployeeName(resolvedEmp);

      // Fetch delivery address fallback if needed
      const orderType = master?.orderType || orderData.orderType || "";
      const isDelivery = orderType.toLowerCase().includes("delivery");
      const contactNo = master?.mobileNo || master?.contactNo || master?.phone || "";
      if (
        isDelivery &&
        contactNo &&
        !master?.flatNo &&
        !master?.buildingNo &&
        !master?.blockNo &&
        !master?.roadNo &&
        !master?.area
      ) {
        try {
          const addrRes = await deliveryApi.getDeliveryAddress(contactNo);
          const addrData = Array.isArray(addrRes?.data) ? addrRes.data[0] : addrRes?.data || addrRes;
          if (addrData) {
            master.flatNo = addrData.flatNo || master.flatNo;
            master.buildingNo = addrData.buildingNo || master.buildingNo;
            master.blockNo = addrData.blockNo || master.blockNo;
            master.roadNo = addrData.roadNo || master.roadNo;
            master.area = addrData.area || master.area;
            if (!master.deliveryCustomerName || master.deliveryCustomerName === "CASH CUSTOMER") {
              master.deliveryCustomerName = addrData.customerName || master.deliveryCustomerName;
            }
          }
        } catch (addrErr) {
          console.warn("[PosSettledDetailsModal] deliveryApi fallback:", addrErr);
        }
      }

      // Ensure alternatives are fetched and cached for products in this order
      const safeOrderTypeId = master?.orderTypeId || orderData?.orderTypeId || 1;
      const detailsList = orderData?.detailsData || orderData?.details || [];
      const pIds = Array.from(new Set(
        detailsList
          .map((d: any) => d.productId || d.ProductId || d.itemId || d.ItemId)
          .filter(Boolean)
      ));
      if (pIds.length > 0) {
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
      }

      try {
        const extrasList = await menuApi.getAllExtras();
        if (Array.isArray(extrasList) && extrasList.length > 0) {
          setAllExtras(extrasList);
        }
      } catch {}

      try {
        const typesList = await menuApi.getModifierTypes();
        if (Array.isArray(typesList) && typesList.length > 0) {
          setModifierTypes(typesList);
        }
      } catch {}

      setOrder(orderData);
    }
  } catch (err) {
    console.warn("API error:", err);
  } finally {
    setLoading(false);
  }
};
