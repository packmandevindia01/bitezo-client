import React, { useState, useEffect } from "react";
import Modal from "../../../../../../components/common/Modal";
import { Loader, Button } from "../../../../../../components/common";
import { Printer, X, Pencil } from "lucide-react";
import { settledOrdersApi } from "../../../../services/settledOrdersApi";
import { salesInvoiceApi } from "../../../../services/salesInvoiceApi";
import { orderApi } from "../../../../services/orderApi";
import { deliveryApi } from "../../../../customer/services/deliveryApi";
import { getEmployeeNames, getEmployeeById } from "../../../../../general/employee/services/employeeService";
import { useToast } from "../../../../../../app/providers/useToast";
import { formatAmount } from "../../../../../../utils/currency";
import { generateGuestPrintHtml, isEnableVatGuestPrint } from "../../../../utils/guestPrintTemplate";
import { hasPrinterHeadings, notifyPrinterHeadingWarning } from "../../../../utils/printHeadingUtils";
import { printHtmlReceipt } from "../../../../services/qzService";
import { printerSettingsApi } from "../../../../services/printerSettingsApi";
import { getPriceView, getPrintPrice, getVatStatus, getBillingConfig, roundCalc, CALC_PRECISION } from "../../../utils/billing";
import { isBillArabicEnabled, formatItemDisplayName } from "../../../../utils/alternativeHelpers";
import { useAppDispatch, useAppSelector } from "../../../../../../app/hooks";
import { usePosProducts, alternativesCache } from "../../../hooks/usePosProducts";
import { loadSettledOrderIntoCart } from "../../../utils/loadSettledOrderIntoCart";
import { menuApi } from "../../../../services/menuApi";
import { t, getLocalizedName } from "../../../../utils/posLocalization";
import { buildUnifiedOrderPricing } from "../../../../utils/orderPricing";
import { checkOrderHasBillDiscount } from "../../../utils/orderDiscountCheck";

interface PosSettledDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number | null;
  orderDetailsStr?: string;
  orderSummary?: any;
  onEditSuccess?: () => void;
}

const resolveEmployeeNameAsync = async (
  empId?: number | string | null,
  currentName?: string | null
): Promise<string> => {
  if (
    currentName &&
    typeof currentName === "string" &&
    !["waiter", "cashier", "null", "undefined", ""].includes(currentName.trim().toLowerCase())
  ) {
    return currentName.trim();
  }

  const idStr = empId !== undefined && empId !== null ? String(empId).trim() : "";
  if (idStr && idStr !== "0" && idStr !== "NaN") {
    // 1. Try local cache posEmpNameMap
    try {
      const mapRaw = localStorage.getItem("posEmpNameMap");
      if (mapRaw) {
        const map = JSON.parse(mapRaw);
        if (map[idStr] && !["waiter", "cashier"].includes(String(map[idStr]).trim().toLowerCase())) {
          return String(map[idStr]).trim();
        }
      }
    } catch {}

    // 2. Try authorized employee if ID matches
    if (idStr === localStorage.getItem("authorizedEmployeeId")) {
      const authName = localStorage.getItem("authorizedEmployeeName");
      if (authName && !["waiter", "cashier"].includes(authName.trim().toLowerCase())) {
        return authName.trim();
      }
    }

    // 3. Try fetching branch employee names
    try {
      const branchId =
        Number(localStorage.getItem("systemBranchId")) ||
        Number(localStorage.getItem("activeBranchId")) ||
        Number(localStorage.getItem("branchId")) ||
        0;
      const list = await getEmployeeNames(branchId);
      if (Array.isArray(list) && list.length > 0) {
        const map: Record<string, string> = {};
        try {
          const existing = localStorage.getItem("posEmpNameMap");
          if (existing) Object.assign(map, JSON.parse(existing));
        } catch {}
        list.forEach((e: any) => {
          const id = e.empId ?? e.id;
          const name = e.empName ?? e.name;
          if (id && name) map[String(id)] = name;
        });
        localStorage.setItem("posEmpNameMap", JSON.stringify(map));
        if (map[idStr] && !["waiter", "cashier"].includes(String(map[idStr]).trim().toLowerCase())) {
          return String(map[idStr]).trim();
        }
      }
    } catch (e) {
      console.warn("[PosSettledDetailsModal] getEmployeeNames fallback failed:", e);
    }

    // 4. Try fetching individual employee by ID
    try {
      const numId = parseInt(idStr, 10);
      if (!isNaN(numId) && numId > 0) {
        const empDetail = await getEmployeeById(numId);
        const name = (empDetail as any)?.empName || (empDetail as any)?.name || (empDetail as any)?.firstName;
        if (name && !["waiter", "cashier"].includes(String(name).trim().toLowerCase())) {
          try {
            const mapRaw = localStorage.getItem("posEmpNameMap");
            const map = mapRaw ? JSON.parse(mapRaw) : {};
            map[idStr] = name;
            localStorage.setItem("posEmpNameMap", JSON.stringify(map));
          } catch {}
          return String(name).trim();
        }
      }
    } catch (e) {
      console.warn("[PosSettledDetailsModal] getEmployeeById fallback failed:", e);
    }
  }

  // 5. Try default employee or authorized employee from localStorage
  const defName = localStorage.getItem("defaultEmployeeName");
  if (defName && !["waiter", "cashier"].includes(defName.trim().toLowerCase())) return defName.trim();

  const authName = localStorage.getItem("authorizedEmployeeName");
  if (authName && !["waiter", "cashier"].includes(authName.trim().toLowerCase())) return authName.trim();

  const empName = localStorage.getItem("employeeName");
  if (empName && !["waiter", "cashier"].includes(empName.trim().toLowerCase())) return empName.trim();

  return (currentName && currentName.trim()) || "Waiter";
};

const formatVoucherDate = (raw?: string | null): string => {
  try {
    if (!raw) return "";
    const d = new Date(raw);
    if (isNaN(d.getTime())) {
      if (/am|pm/i.test(raw)) {
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, "0");
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const yyyy = today.getFullYear();
        return `${dd}/${mm}/${yyyy} ${raw}`;
      }
      return raw;
    }
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
  } catch {
    return raw || "";
  }
};

export const PosSettledDetailsModal: React.FC<PosSettledDetailsModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderDetailsStr = "",
  orderSummary,
  onEditSuccess,
}) => {
  const { showToast } = useToast();
  const dispatch = useAppDispatch();
  const productCache = useAppSelector((state) => state.pos.productCache);
  const { products } = usePosProducts();
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [resolvedEmployeeName, setResolvedEmployeeName] = useState<string>("Waiter");

  useEffect(() => {
    if (isOpen && orderId) {
      void loadOrderDetails();
    } else {
      setOrder(null);
      setResolvedEmployeeName("Waiter");
    }
  }, [isOpen, orderId]);

  const loadOrderDetails = async () => {
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
        const saleId = rawVoucher ? parseInt(String(rawVoucher).replace(/\D/g, ""), 10) : NaN;

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
                  discAmount: Number(master.discAmount || 0) > 0 && (!saleMaster.discAmount || Number(saleMaster.discAmount) === 0)
                    ? master.discAmount
                    : (saleMaster.discAmount ?? master.discAmount),
                  discPer: Number(master.discPer || 0) > 0 && (!saleMaster.discPer || Number(saleMaster.discPer) === 0)
                    ? master.discPer
                    : (saleMaster.discPer ?? master.discPer),
                  vatExclAmount: Number(master.vatExclAmount || 0) > 0 && (!saleMaster.vatExclAmount || Number(saleMaster.vatExclAmount) === 0)
                    ? master.vatExclAmount
                    : (saleMaster.vatExclAmount ?? master.vatExclAmount),
                  vatAmount: Number(master.vatAmount || 0) > 0 && (!saleMaster.vatAmount || Number(saleMaster.vatAmount) === 0)
                    ? master.vatAmount
                    : (saleMaster.vatAmount ?? master.vatAmount),
                  serviceCharge: Number(master.serviceCharge || 0) > 0 && (!saleMaster.serviceCharge || Number(saleMaster.serviceCharge) === 0)
                    ? master.serviceCharge
                    : (saleMaster.serviceCharge ?? master.serviceCharge),
                  levyAmt: Number(master.levyAmt || master.levy || 0) > 0 && (!saleMaster.levyAmt && !saleMaster.levy || (Number(saleMaster.levyAmt || 0) === 0 && Number(saleMaster.levy || 0) === 0))
                    ? (master.levyAmt ?? master.levy)
                    : (saleMaster.levyAmt ?? saleMaster.levy ?? master.levyAmt ?? master.levy),
                  levy: Number(master.levyAmt || master.levy || 0) > 0 && (!saleMaster.levyAmt && !saleMaster.levy || (Number(saleMaster.levyAmt || 0) === 0 && Number(saleMaster.levy || 0) === 0))
                    ? (master.levyAmt ?? master.levy)
                    : (saleMaster.levy ?? saleMaster.levyAmt ?? master.levy ?? master.levyAmt),
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

        const resolvedEmp = await resolveEmployeeNameAsync(rawEmpId, currentEmp);
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

        setOrder(orderData);
      }
    } catch (err) {
      console.warn("API error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!orderId || !order) return;

    if (!hasPrinterHeadings()) {
      notifyPrinterHeadingWarning(showToast);
    }

    try {
      showToast(`Preparing Receipt for Order #${orderId}...`, "success");

      const rawMaster = order.masterData || order.master || order;
      const master = Array.isArray(rawMaster) ? (rawMaster[0] || {}) : (rawMaster || {});

      const orderTypeMap: Record<number, string> = {
        1: "DineIn",
        2: "TakeOut",
        3: "DriveThru",
        4: "Delivery",
        5: "Providers",
        6: "Coming",
      };
      const orderTypeName =
        master.orderType ||
        orderTypeMap[master.orderTypeId] ||
        master.orderTypeName ||
        order?.orderTypeName ||
        "DineIn";

      const isValidDateStr = (s: any) => {
        if (!s || typeof s !== "string") return false;
        if (s.startsWith("0001")) return false;
        return true;
      };

      const candidateDates = [
        master.voucherDate,
        master.transDate,
        master.orderDate,
        master.createdAt,
        master.entryDate,
        order.voucherDate,
        order.transDate,
        order.createdAt,
      ];

      let resolvedDateStr = candidateDates.find(isValidDateStr);

      let date: string | undefined;
      let time: string | undefined;

      if (resolvedDateStr) {
        try {
          const d = new Date(resolvedDateStr);
          if (!isNaN(d.getTime()) && d.getFullYear() >= 2000) {
            date = d.toLocaleDateString("en-GB");
            time = d.toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit" });
          }
        } catch {
          /* ignore */
        }
      }

      const detailsStr = orderDetailsStr || order.details || orderSummary?.details || "";
      if (!date && typeof detailsStr === "string") {
        const timeMatch = detailsStr.match(/(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM))/i);
        const dateMatch = detailsStr.match(/(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/);
        if (dateMatch) date = dateMatch[1];
        if (timeMatch) time = timeMatch[1];
      }

      if (!date) {
        const now = new Date();
        date = now.toLocaleDateString("en-GB");
        time = now.toLocaleTimeString("en-US", { hour12: true, hour: "2-digit", minute: "2-digit" });
      }

      const printPriceSetting = getPrintPrice();
      const isTaxInclusive = printPriceSetting === "Inclusive";

      const isBillLevelDiscount = checkOrderHasBillDiscount(order);
      const unified = buildUnifiedOrderPricing(order, {
        orderType: orderTypeName,
        printPrice: printPriceSetting,
        priceView: printPriceSetting,
        isBillDiscount: isBillLevelDiscount,
      });

      const mappedItems = unified.lines.map((l) => ({
        ...l,
        isUnifiedPricingLine: true,
        productId: l.productId,
        quantity: l.quantity,
        price: l.getRate(isTaxInclusive),
        baseAmount: l.exclusiveGross,
        variantName: l.variantName,
        variantArabic: l.variantArabic,
        product: {
          name: l.productName,
          price: l.getRate(isTaxInclusive),
          arabicName: l.productArabicName,
        },
        extras: l.extras,
        modifiers: l.modifiers,
        messages: l.messages,
        itemDiscount: (l.lineDiscount > 0 || l.lineDiscountIncl > 0 || l.lineDiscountExcl > 0)
          ? l.getDiscount(isTaxInclusive)
          : (unified.summary.isBillDiscount ? 0 : l.getDiscount(isTaxInclusive)),
        lineTotal: (l.lineDiscount > 0 || l.lineDiscountIncl > 0 || l.lineDiscountExcl > 0)
          ? Math.max(0, (isTaxInclusive ? l.inclusiveGross : l.exclusiveGross) - l.getDiscount(isTaxInclusive))
          : l.getAmount(isTaxInclusive, unified.summary.isBillDiscount),
        lineNetAmount: l.inclusiveAmount,
        basePrice: l.exclusiveRate,
        vatAmount: l.vatAmount,
      }));

      const rawCharges = Number(master.serviceCharge ?? unified.summary.serviceCharge ?? 0) + Number(master.levyAmt ?? master.levy ?? master.Levy ?? unified.summary.levy ?? 0);
      const resolvedDiscount = displayDiscount > 0
        ? displayDiscount
        : Number(
            (isTaxInclusive && rawCharges <= 0)
              ? (unified.summary.totalDiscountIncl ?? (typeof unified.summary.getTotalDiscount === "function" ? unified.summary.getTotalDiscount(true) : (master.discAmount ?? master.discount ?? 0)))
              : (unified.summary.totalDiscountExcl ?? (typeof unified.summary.getTotalDiscount === "function" ? unified.summary.getTotalDiscount(false) : (master.discAmount ?? master.discount ?? 0)))
          );
      const resolvedSubTotal = displaySubTotal > 0
        ? displaySubTotal
        : Number(
            (isTaxInclusive && rawCharges <= 0)
              ? (unified.summary.subTotalInclusive > 0
                  ? unified.summary.subTotalInclusive
                  : (typeof unified.summary.getSubTotal === "function" ? unified.summary.getSubTotal(true) : 0))
              : (unified.summary.subTotalExclusive > 0
                  ? unified.summary.subTotalExclusive
                  : (typeof unified.summary.getSubTotal === "function" ? unified.summary.getSubTotal(false) : 0))
          );
      const resolvedVatAmount = Number(
        (unified?.summary.vatAmount && unified.summary.vatAmount > 0)
          ? unified.summary.vatAmount
          : (master.vatAmount ?? master.VatAmount ?? 0)
      );

      const invoiceNo =
        master.voucherNo ||
        master.invoiceNo ||
        master.voucherNumber ||
        master.saleNo ||
        (master.saleId ? String(master.saleId) : orderId ? String(orderId) : undefined);

      const paymentNames: Record<number, string> = { 1: "Cash", 2: "Card", 3: "Credit" };
      const rawPayments =
        order.paymentData ||
        order.paymentsData ||
        order.payments ||
        order.paymodes ||
        order.tenderData ||
        master.payments ||
        master.paymodes ||
        [];
      let payments =
        Array.isArray(rawPayments) && rawPayments.length > 0
          ? rawPayments.map((p: any) => ({
              name:
                p.paymentName ||
                p.paymodeName ||
                p.name ||
                paymentNames[p.paymodeId] ||
                paymentNames[p.paymentId] ||
                "Payment",
              amount: Number(p.amount ?? p.paidAmount ?? 0),
            }))
          : undefined;

      if (!payments || payments.length === 0) {
        const rootPaymodeId = master.paymodeId || order.paymodeId;
        const rootPaymodeName =
          master.paymodeName || master.paymentName || (rootPaymodeId ? paymentNames[rootPaymodeId] : "Cash");
        if (rootPaymodeName) {
          payments = [{ name: rootPaymodeName, amount: netAmount }];
        }
      }

      let resolvedFlatNo = master.flatNo || master.flat || master.flatNumber || "";
      let resolvedBuildingNo = master.buildingNo || master.building || master.buildingNumber || "";
      let resolvedBlockNo = master.blockNo || master.block || master.blockNumber || "";
      let resolvedRoadNo = master.roadNo || master.road || master.roadNumber || master.street || "";
      let resolvedArea = master.area || master.areaName || "";
      let resolvedCustomerName =
        master.deliveryCustomerName ||
        master.vehicleCustomerName ||
        master.customerName ||
        master.customer ||
        "";

      if (!resolvedCustomerName && typeof detailsStr === "string") {
        const parenMatches = detailsStr.match(/\(([^)]+)\)/g)?.map((s: string) => s.replace(/[()]/g, "").trim()) || [];
        if (parenMatches.length >= 2) {
          resolvedCustomerName = parenMatches[1];
        } else if (parenMatches.length === 1) {
          resolvedCustomerName = parenMatches[0];
        }
      }
      if (!resolvedCustomerName) {
        resolvedCustomerName = "CASH CUSTOMER";
      }
      const isDeliveryOrder = (orderTypeName || "").toLowerCase().includes("delivery");
      let resolvedContactNo = master.mobileNo || master.contactNo || master.phone || master.mobile || "";
      let resolvedCallBack = isDeliveryOrder
        ? (master.callBack || 
           master.callback || 
           master.callBackNo || 
           master.callbackNo || 
           master.callBackNumber || 
           master.callbackNumber || 
           (order as any)?.callBack || 
           (order as any)?.callback || 
           localStorage.getItem(`order_callBack_${orderId}`) ||
           sessionStorage.getItem(`order_callBack_${orderId}`) ||
           localStorage.getItem(`order_callBack_${invoiceNo}`) ||
           sessionStorage.getItem(`order_callBack_${invoiceNo}`) ||
           (resolvedContactNo ? localStorage.getItem(`delivery_callBack_${resolvedContactNo}`) : null) ||
           (resolvedContactNo ? sessionStorage.getItem(`delivery_callBack_${resolvedContactNo}`) : null) ||
           localStorage.getItem("pos_current_callBack") ||
           "")
        : "";

      const rawChangeVal = master.change ?? master.keepChanges ?? (order as any)?.change ?? (order as any)?.keepChanges ?? "";
      const validKeepChange = (isDeliveryOrder && rawChangeVal !== undefined && rawChangeVal !== null &&
        String(rawChangeVal).trim() !== "" &&
        String(rawChangeVal).trim() !== "0" &&
        String(rawChangeVal).trim() !== "0.00" &&
        String(rawChangeVal).trim() !== "0.000")
        ? String(rawChangeVal).trim()
        : undefined;

      let resolvedAddress = master.address || master.customerAddress || master.deliveryAddress || "";

      if (
        isDeliveryOrder &&
        !resolvedFlatNo &&
        !resolvedBuildingNo &&
        !resolvedBlockNo &&
        !resolvedRoadNo &&
        !resolvedArea &&
        resolvedContactNo
      ) {
        try {
          const addrRes = await deliveryApi.getDeliveryAddress(resolvedContactNo);
          const addrData = Array.isArray(addrRes?.data) ? addrRes.data[0] : addrRes?.data || addrRes;
          if (addrData) {
            resolvedFlatNo = addrData.flatNo || resolvedFlatNo;
            resolvedBuildingNo = addrData.buildingNo || resolvedBuildingNo;
            resolvedBlockNo = addrData.blockNo || resolvedBlockNo;
            resolvedRoadNo = addrData.roadNo || resolvedRoadNo;
            resolvedArea = addrData.area || resolvedArea;
            if (!resolvedCustomerName || resolvedCustomerName === "CASH CUSTOMER") {
              resolvedCustomerName = addrData.customerName || resolvedCustomerName;
            }
          }
        } catch (fetchAddrErr) {
          console.warn("[PosSettledDetailsModal] Could not fetch delivery address fallback:", fetchAddrErr);
        }
      }

      const rawEmpId =
        master.employeeId ??
        master.empId ??
        master.waiterId ??
        master.salespersonId ??
        orderSummary?.employeeId ??
        orderSummary?.empId ??
        order?.employeeId;

      const resolvedWaiter = await resolveEmployeeNameAsync(
        rawEmpId,
        master.employeeName || order?.employeeName || resolvedEmployeeName
      );

      let resolvedDriver =
        master.driverName ||
        master.allocatedDriverName ||
        master.driver ||
        master.driverEmployeeName ||
        orderSummary?.driverName ||
        orderSummary?.allocatedDriverName ||
        orderSummary?.driver ||
        order?.driverName ||
        order?.allocatedDriverName ||
        order?.driver ||
        "";

      if (!resolvedDriver && orderSummary && typeof orderSummary.details === "string") {
        const match = orderSummary.details.match(/\(Driver:\s*([^)]+)\)/i) || orderSummary.details.match(/Driver:\s*([A-Za-z0-9_\s]+)/i);
        if (match && match[1]) {
          resolvedDriver = match[1].trim();
        }
      }

      if (!resolvedDriver && typeof master.details === "string") {
        const match = master.details.match(/\(Driver:\s*([^)]+)\)/i) || master.details.match(/Driver:\s*([A-Za-z0-9_\s]+)/i);
        if (match && match[1]) {
          resolvedDriver = match[1].trim();
        }
      }

      const activeDriverId = master.driverId || orderSummary?.driverId || order?.driverId;
      if (!resolvedDriver && activeDriverId && Number(activeDriverId) > 0) {
        try {
          const branchId =
            Number(localStorage.getItem("systemBranchId")) ||
            Number(localStorage.getItem("activeBranchId")) ||
            Number(localStorage.getItem("branchId")) ||
            1;
          const { employeeService } = await import("../../../../../general/employee/services/employeeService");
          const dList = await employeeService.getDrivers(branchId);
          const dFound = dList.find((d: any) => d.driverId === Number(activeDriverId));
          if (dFound) {
            resolvedDriver = dFound.driverName;
          }
        } catch (err) {
          console.warn("[PosSettledDetailsModal] Failed to resolve driver name by id:", err);
        }
      }

      const printSc = Number(master.serviceCharge ?? unified.summary.serviceCharge ?? 0);
      let printLevy = Number(master.levyAmt ?? master.levy ?? master.Levy ?? unified.summary.levy ?? 0);
      let printCharges = displayCharges > 0 ? displayCharges : roundCalc(printSc + printLevy);
      const printGrandTotal = Number(master.netAmount ?? unified.summary.grandTotal ?? 0);
      if (printCharges <= 0) {
        if (printGrandTotal > 0) {
          const netBase = Math.max(0, resolvedSubTotal - resolvedDiscount);
          const residual = roundCalc(printGrandTotal - netBase - Number(master.deliveryCharge || 0) - resolvedVatAmount);
          if (residual > 0.001) {
            printCharges = residual;
            if (printLevy <= 0) printLevy = residual;
          }
        }
      }
      const printNetValue = displayNetValue > 0 ? displayNetValue : roundCalc(Math.max(0, resolvedSubTotal - resolvedDiscount) + printCharges);

      const printData = {
        orderNo: master.orderNo ?? String(orderId),
        ticketNo: master.ticketNo ?? "1",
        invoiceNo,
        waiter: resolvedWaiter,
        counter: "Main",
        section: master.sectionName || "DINE IN",
        table: master.tableNo || "",
        orderType: orderTypeName,
        date,
        time,
        customerName: resolvedCustomerName || "CASH CUSTOMER",
        driver: isDeliveryOrder ? (resolvedDriver || undefined) : undefined,
        driverName: isDeliveryOrder ? (resolvedDriver || undefined) : undefined,
        vehicleNo: master.vehicleNo,
        contactNo: isDeliveryOrder ? (resolvedContactNo || undefined) : undefined,
        callBack: isDeliveryOrder ? (resolvedCallBack || undefined) : undefined,
        change: isDeliveryOrder ? validKeepChange : undefined,
        keepChanges: isDeliveryOrder ? validKeepChange : undefined,
        flatNo: isDeliveryOrder ? (resolvedFlatNo || undefined) : undefined,
        buildingNo: isDeliveryOrder ? (resolvedBuildingNo || undefined) : undefined,
        blockNo: isDeliveryOrder ? (resolvedBlockNo || undefined) : undefined,
        roadNo: isDeliveryOrder ? (resolvedRoadNo || undefined) : undefined,
        area: isDeliveryOrder ? (resolvedArea || undefined) : undefined,
        address: isDeliveryOrder ? (resolvedAddress || undefined) : undefined,
        providerNo: master.providerNo || master.providerOrderNo,
        subTotal: resolvedSubTotal,
        discount: resolvedDiscount,
        serviceCharge: printSc,
        levy: printLevy,
        charges: printCharges,
        netValue: printNetValue,
        vatAmount: resolvedVatAmount,
        netAmount: printGrandTotal > 0 ? printGrandTotal : unified.summary.grandTotal,
        deliveryCharge: master.deliveryCharge || 0,
        payments,
        enableVat: unified.summary.isVatActive,
        isSettlement: true,
        printPrice: printPriceSetting,
        priceView: getPriceView(),
        billArabic:
          isBillArabicEnabled() ||
          mappedItems.some((it: any) =>
            Boolean(it.product?.arabicName || it.variantArabic || (it as any).altArabic)
          ),
        isBillDiscount: isBillLevelDiscount,
      };

      const htmlContent = await generateGuestPrintHtml(unified as any, printData);

      let billPrinter: string | undefined;
      try {
        const settingsRes = await printerSettingsApi.getGeneral();
        const gen = settingsRes?.data;
        billPrinter = gen?.androidBillPrinter || gen?.billPrinter || gen?.androidKOTPrinter || gen?.kotPrinter;
      } catch (err) {
        console.warn("[PosSettledDetailsModal] Could not fetch general printer settings:", err);
      }

      if (!billPrinter || billPrinter === "No Printer") {
        billPrinter =
          localStorage.getItem("cachedBillPrinter") ||
          localStorage.getItem("cachedBillPrinterIp") ||
          localStorage.getItem("cachedKotPrinter") ||
          localStorage.getItem("cachedKotPrinterIp") ||
          localStorage.getItem("printerIpAddress") ||
          undefined;
      }

      await printHtmlReceipt(htmlContent, billPrinter);
      showToast("Settled receipt sent to printer!", "success");
    } catch (e: any) {
      console.error("[PosSettledDetailsModal] Print error:", e);
      showToast(e?.message ? `Print failed: ${e.message}` : "Failed to print receipt", "error");
    }
  };

  const isCancelled = Boolean(
    order?.isCancelled === true ||
    order?.isCancelled === "true" ||
    order?.isCancelled === 1 ||
    order?.masterData?.isCancelled === true ||
    order?.masterData?.isCancelled === "true" ||
    order?.masterData?.isCancelled === 1 ||
    orderSummary?.isCancelled === true ||
    orderSummary?.isCancelled === "true" ||
    orderSummary?.isCancelled === 1 ||
    String(order?.action || "").toLowerCase() === "cancelled" ||
    String(orderSummary?.action || "").toLowerCase() === "cancelled" ||
    String(order?.status || "").toLowerCase() === "cancelled" ||
    String(orderSummary?.status || "").toLowerCase() === "cancelled"
  );

  const handleEdit = () => {
    if (!orderId || !order) return;
    loadSettledOrderIntoCart({
      orderId,
      orderData: order,
      dispatch,
      products,
      productCache,
      showToast,
      onEditSuccess: () => {
        onClose();
        onEditSuccess?.();
      },
    });
  };

  if (!isOpen) return null;

  const rawMaster = order?.masterData || order?.master || order;
  const master = Array.isArray(rawMaster) ? (rawMaster[0] || {}) : (rawMaster || {});

  const orderNo = master.orderNo ?? order?.orderNo ?? orderId ?? "";
  const orderTypeMap: Record<number, string> = {
    1: "DineIn",
    2: "TakeOut",
    3: "DriveThru",
    4: "Delivery",
    5: "Providers",
    6: "Coming",
  };
  const orderTypeName =
    master.orderType ||
    orderTypeMap[master.orderTypeId] ||
    master.orderTypeName ||
    order?.orderTypeName ||
    "DineIn";
  const netAmount = master.netAmount ?? order?.netAmount ?? 0;

  const displayCustomerName =
    master.deliveryCustomerName ||
    master.vehicleCustomerName ||
    master.customerName ||
    master.customer ||
    "CASH CUSTOMER";

  const rawDateStr =
    master.voucherDate ??
    master.orderDate ??
    master.transDate ??
    master.createdAt ??
    master.entryDate ??
    order?.voucherDate ??
    order?.orderDate ??
    order?.transDate ??
    order?.createdAt;

  const displayDateStr = formatVoucherDate(rawDateStr);
  const effectivePriceView = getPriceView();
  const isTaxInclusive = effectivePriceView === "Inclusive";

  const isBillLevelDiscount = order ? checkOrderHasBillDiscount(order) : false;
  const unified = order ? buildUnifiedOrderPricing(order, { orderType: orderTypeName, priceView: effectivePriceView, isBillDiscount: isBillLevelDiscount }) : null;
  const billingConfig = getBillingConfig(orderTypeName || "DineIn");
  const isVatActive = Boolean(isEnableVatGuestPrint(master as any) || getVatStatus() || unified?.summary?.isVatActive);

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
  const displayServiceCharge = Number(
    master.serviceCharge ??
    master.ServiceCharge ??
    (unified ? unified.summary.serviceCharge : 0)
  );
  const displayLevy = Number(
    master.levyAmt ??
    master.levy ??
    master.Levy ??
    (unified ? unified.summary.levy : 0)
  );
  const displayDeliveryCharge = Number(
    master.deliveryCharge ??
    master.DeliveryCharge ??
    (unified ? unified.summary.deliveryCharge : 0)
  );
  const rawModalCharges = Number(displayServiceCharge || 0) + Number(displayLevy || 0);
  const displayDiscount = Number(
    unified
      ? ((isTaxInclusive && rawModalCharges <= 0)
          ? (unified.summary.totalDiscountIncl ?? (typeof unified.summary.getTotalDiscount === "function" ? unified.summary.getTotalDiscount(true) : (master.discAmount ?? master.discount ?? 0)))
          : (unified.summary.totalDiscountExcl ?? (typeof unified.summary.getTotalDiscount === "function" ? unified.summary.getTotalDiscount(false) : (master.discAmount ?? master.discount ?? 0))))
      : (backendDiscount > 0 ? backendDiscount : 0)
  );
  const grossSubTotalFromLines = unified
    ? ((isTaxInclusive && rawModalCharges <= 0) ? unified.summary.subTotalInclusive : unified.summary.subTotalExclusive)
    : 0;

  const displaySubTotal = Number(
    grossSubTotalFromLines > 0
      ? grossSubTotalFromLines
      : (master.subTotal !== undefined && master.subTotal !== null && Number(master.subTotal) > 0
          ? Number(master.subTotal)
          : (master.vatExclAmount !== undefined && master.vatExclAmount !== null && Number(master.vatExclAmount) > 0
              ? Number(master.vatExclAmount) + displayDiscount
              : 0))
  );
  let displayVatAmount = Number(
    master.vatAmount ??
    master.VatAmount ??
    master.vatAmt ??
    (unified && unified.summary.vatAmount > 0 ? unified.summary.vatAmount : 0)
  );
  if (displayVatAmount <= 0 && isVatActive) {
    const rateFraction = billingConfig.vatRate > 0 ? (billingConfig.vatRate > 1 ? billingConfig.vatRate / 100 : billingConfig.vatRate) : 0.10;
    const delivery = Number(master.deliveryCharge ?? (unified ? unified.summary?.deliveryCharge : 0) ?? 0);
    const grandTotal = Number(master.netAmount ?? master.NetAmount ?? (unified ? unified.summary.grandTotal : 0) ?? 0);
    const taxableGross = Math.max(0, grandTotal - delivery);
    if (rateFraction > 0 && taxableGross > 0) {
      displayVatAmount = roundCalc(taxableGross - (taxableGross / (1 + rateFraction)), CALC_PRECISION);
    }
  }
  const displayGrandTotal = Number(
    master.netAmount ??
    master.NetAmount ??
    order?.netAmount ??
    order?.NetAmount ??
    (unified && unified.summary.grandTotal > 0 ? unified.summary.grandTotal : netAmount)
  );
  let displayCharges = (unified?.summary?.charges && unified.summary.charges > 0)
    ? unified.summary.charges
    : roundCalc(Number(displayServiceCharge || 0) + Number(displayLevy || 0));
  if (displayGrandTotal > 0) {
    const netBase = Math.max(0, displaySubTotal - displayDiscount);
    const residual = roundCalc(displayGrandTotal - netBase - displayDeliveryCharge - displayVatAmount);
    if (residual > 0.001) {
      if (displayCharges <= 0 || Math.abs(displayCharges - residual) > 0.05) {
        displayCharges = residual;
      }
    }
  }
  const displayNetValue = roundCalc(
    (unified?.summary?.vatExclAmount && unified.summary.vatExclAmount > 0)
      ? unified.summary.vatExclAmount
      : Math.max(0, displayGrandTotal - displayDeliveryCharge - displayVatAmount)
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      noPadding
      className="bg-[#262626] border border-stone-800 shadow-2xl rounded-2xl overflow-hidden w-full max-w-[520px] md:max-w-[550px]"
    >
      <div className="bg-[#1e1e1e] border-b border-stone-800 text-stone-100 py-3.5 px-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#f48120]">{t("ORDER DETAILS")}</h2>
          {isCancelled && (
            <span className="px-2.5 py-0.5 rounded-full bg-red-600/30 text-red-400 border border-red-500/50 text-[10px] font-black uppercase tracking-wider">
              {t("CANCELLED")}
            </span>
          )}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-stone-800 rounded-full transition-colors text-stone-400">
          <X size={18} />
        </button>
      </div>

      {loading ? (
        <div className="py-24 flex items-center justify-center bg-stone-900/40">
          <Loader text="Retrieving Data..." />
        </div>
      ) : order ? (
        <div className="flex flex-col md:flex-row min-h-[420px] bg-stone-950/80">
          <div className="flex-1 min-w-0 p-5 bg-[#faf8f5] text-stone-900 font-mono text-xs overflow-y-auto">
            <div className="text-center font-bold border-b border-dashed border-stone-400 pb-3 mb-3">
              <div className="text-sm font-black uppercase tracking-wide">BITEZO POS</div>
              <div className="text-[10px] text-stone-500 font-medium">{t("SETTLED ORDER TICKET")}</div>
              {isCancelled && (
                <div className="mt-2 inline-block px-3 py-0.5 rounded-full bg-red-100 text-red-700 font-black text-xs uppercase tracking-widest border border-red-300">
                  *** {t("CANCELLED")} ***
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-y-1 text-[11px] border-b border-dashed border-stone-400 pb-3 mb-3">
              {(master.voucherNo || master.invoiceNo || master.voucherNumber || master.saleNo) && (
                <div className="min-w-0 break-words [overflow-wrap:anywhere]">
                  <span className="text-stone-500">{t("Invoice")}: </span>
                  <span className="font-bold">
                    {master.voucherNo || master.invoiceNo || master.voucherNumber || master.saleNo}
                  </span>
                </div>
              )}
              <div className="min-w-0 break-words [overflow-wrap:anywhere]">
                <span className="text-stone-500">{t("Order No")}: </span>
                <span className="font-bold">{orderNo}</span>
              </div>
              <div className="min-w-0 break-words [overflow-wrap:anywhere]">
                <span className="text-stone-500">{t("Emp")}: </span>
                <span className="font-bold">{resolvedEmployeeName}</span>
              </div>
              <div className="text-right min-w-0 break-words [overflow-wrap:anywhere]">
                <span className="text-stone-500">{t("Type")}: </span>
                <span className="font-bold text-[#49293e]">{t(orderTypeName)}</span>
              </div>
              <div className="col-span-2 sm:col-span-1 min-w-0 break-words [overflow-wrap:anywhere]">
                <span className="text-stone-500">{t("Customer")}: </span>
                <span className="font-bold">{displayCustomerName}</span>
              </div>
              {orderTypeName.toLowerCase().includes("dine") && master.tableNo && (
                <div className="col-span-2 sm:col-span-1 text-right min-w-0 break-words [overflow-wrap:anywhere]">
                  <span className="text-stone-500">{t("Table")}: </span>
                  <span className="font-bold">
                    {master.sectionName ? `${master.sectionName} - ` : ""}
                    {master.tableNo}
                  </span>
                </div>
              )}
              {master.note && (
                <div className="col-span-2 mt-1 min-w-0 break-words [overflow-wrap:anywhere]">
                  <span className="text-stone-500">{t("Note")}: </span>
                  <span className="font-bold italic text-stone-600">"{master.note}"</span>
                </div>
              )}
              {master.vehicleNo && (
                <div className="col-span-2 mt-1 min-w-0 break-words [overflow-wrap:anywhere]">
                  <span className="text-stone-500">{t("Vehicle")}: </span>
                  <span className="font-bold uppercase">
                    {master.vehicleNo} {master.vehicleCustomerName ? `(${master.vehicleCustomerName})` : ""}
                  </span>
                </div>
              )}
              {displayDateStr && (
                <div className="col-span-2 text-stone-500 text-[10px] mt-1">
                  Date: {displayDateStr}
                </div>
              )}
            </div>
            <div className="grid grid-cols-[28px_minmax(0,1fr)_55px_65px] gap-2 border-b border-dashed border-stone-400 pb-2 mb-2 text-[10px] font-bold text-stone-500 uppercase">
              <div className="text-center">{t("Qty")}</div>
              <div>{t("Item")}</div>
              <div className="text-right">{t("Price")}</div>
              <div className="text-right">{t("Total")}</div>
            </div>
            <div className="space-y-2.5">
              {unified?.lines.map((line, i: number) => {
                const primaryName = line.productName;
                const arabicName = line.productArabicName;
                const localized = getLocalizedName(primaryName, arabicName);
                const qty = line.quantity;
                const price = line.getRate(isTaxInclusive);
                const lineDisc = typeof line.getDiscount === "function" ? line.getDiscount(isTaxInclusive) : (line.lineDiscount || 0);
                const itemDisc = lineDisc > 0 ? lineDisc : 0;
                const origGrossAmt = isTaxInclusive ? line.inclusiveGross : line.exclusiveGross;
                const netAmt = itemDisc > 0
                  ? Math.max(0, origGrossAmt - itemDisc)
                  : ((unified.summary.isBillDiscount || isBillLevelDiscount) ? origGrossAmt : (isTaxInclusive ? line.inclusiveAmount : line.exclusiveAmount));

                const displayItemName = formatItemDisplayName(localized.primary, line.variantName);
                const displaySecondaryName = localized.secondary
                  ? formatItemDisplayName(localized.secondary, line.variantArabic || line.variantName)
                  : "";

                return (
                  <div key={i} className="space-y-0.5">
                    <div className="grid grid-cols-[28px_minmax(0,1fr)_55px_65px] gap-2 text-[11px] items-start">
                      <div className="font-bold text-stone-500 text-center">{qty}</div>
                      <div className="min-w-0">
                        <div className="font-bold text-stone-800 break-words [overflow-wrap:anywhere] [word-break:break-word]">{displayItemName}</div>
                        {displaySecondaryName && (
                          <div className="text-[9px] text-stone-500 font-medium break-words [overflow-wrap:anywhere] [word-break:break-word] mt-0.5">{displaySecondaryName}</div>
                        )}
                      </div>
                      <div className="text-right text-stone-500 shrink-0">{formatAmount(price)}</div>
                      <div className="text-right font-bold text-stone-900 shrink-0">{formatAmount(origGrossAmt)}</div>
                    </div>
                    {itemDisc > 0 && (
                      <div className="grid grid-cols-[28px_minmax(0,1fr)_55px_65px] gap-2 text-[11px] items-start font-bold">
                        <div></div>
                        <div className="col-span-2 text-right text-stone-700 whitespace-nowrap">
                          {t("Disc")} : {formatAmount(itemDisc)}
                        </div>
                        <div className="text-right text-stone-900 shrink-0">
                          {formatAmount(netAmt)}
                        </div>
                      </div>
                    )}
                    {/* Extras */}
                    {line.extras && line.extras.length > 0 && line.extras.map((ex, exIdx) => (
                      <div key={`ex-${exIdx}`} className="grid grid-cols-[28px_minmax(0,1fr)_55px_65px] gap-2 text-[9px] text-[#f48120] font-medium pl-6 italic items-start">
                        <div className="col-span-3 min-w-0 break-words [overflow-wrap:anywhere] [word-break:break-word]">
                          + {ex.name}{Number(ex.qty || 1) > 1 ? ` (x${ex.qty})` : ""}
                        </div>
                        <div className="text-right shrink-0"></div>
                      </div>
                    ))}
                    {/* Modifiers */}
                    {line.modifiers && line.modifiers.length > 0 && line.modifiers.map((mod, mIdx) => {
                      const typePrefix = mod.typeName ? `${mod.typeName.toUpperCase()}: ` : "";
                      return (
                        <div key={`mod-${mIdx}`} className="grid grid-cols-[28px_minmax(0,1fr)_55px_65px] gap-2 text-[9px] text-[#f48120] font-medium pl-6 italic items-start">
                          <div className="col-span-3 min-w-0 break-words [overflow-wrap:anywhere] [word-break:break-word]">
                            * {typePrefix}{Number(mod.qty || 1) > 1 ? `${mod.qty} x ` : ""}{mod.name}
                          </div>
                          <div className="text-right shrink-0"></div>
                        </div>
                      );
                    })}
                    {/* Messages */}
                    {line.messages && line.messages.length > 0 && line.messages.map((msg, msgIdx) => (
                      <div key={`msg-${msgIdx}`} className="grid grid-cols-[28px_minmax(0,1fr)_55px_65px] gap-2 text-[9px] text-purple-600 font-medium pl-6 italic items-start">
                        <div className="col-span-3 min-w-0 break-words [overflow-wrap:anywhere] [word-break:break-word]">
                          💬 {msg.name}
                        </div>
                        <div className="text-right shrink-0"></div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            {/* Receipt Footer with Sub Total, Discount, Charges, VAT and Grand Total */}
            <div className="border-t border-dashed border-stone-400 pt-3 mt-4 space-y-1 text-[11px]">
              <div className="flex justify-between items-center text-stone-600">
                <span>{t("Sub Total")}</span>
                <span>{formatAmount(displaySubTotal)}</span>
              </div>
              {displayDiscount > 0 && (
                <div className="flex justify-between items-center text-red-600">
                  <span>{t("Discount")}</span>
                  <span>-{formatAmount(displayDiscount)}</span>
                </div>
              )}
              {displayCharges > 0 && (
                <div className="flex justify-between items-center text-stone-600">
                  <span>{t("Charges")}</span>
                  <span>{formatAmount(displayCharges)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-stone-600">
                <span>{t("Net Value")}</span>
                <span>{formatAmount(displayNetValue)}</span>
              </div>
              {displayDeliveryCharge > 0 && (
                <div className="flex justify-between items-center text-stone-600">
                  <span>{t("Delivery Charge")}</span>
                  <span>{formatAmount(displayDeliveryCharge)}</span>
                </div>
              )}
              {(isVatActive || displayVatAmount > 0) && (
                <div className="flex justify-between items-center text-stone-600">
                  <span>{t("VAT")}</span>
                  <span>{formatAmount(displayVatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-xs font-bold text-stone-900 uppercase pt-2 border-t border-dashed border-stone-300">
                <span>{t("Grand Total")}</span>
                <span className="text-base font-black text-[#f48120]">{formatAmount(displayGrandTotal)}</span>
              </div>
            </div>
          </div>

          <div className="w-full md:w-28 shrink-0 bg-stone-900 border-t md:border-t-0 md:border-l border-stone-800 p-3 flex flex-row md:flex-col gap-2 justify-stretch items-stretch overflow-x-auto">
            <Button
              variant="primary"
              onClick={handlePrint}
              disabled={loading || !order}
              className="flex-1 md:flex-initial h-12 md:h-14 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-stone-100 font-black text-[10px] uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 shadow-md disabled:opacity-50"
            >
              <Printer size={18} strokeWidth={2.5} />
              {t("PRINT")}
            </Button>

            <button
              onClick={handleEdit}
              disabled={loading || !order}
              className="flex-1 md:flex-initial h-12 md:h-14 rounded-xl bg-[#49293e] hover:bg-[#5c3450] active:scale-95 text-stone-100 font-black text-[10px] uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 shadow-md disabled:opacity-50"
              title={t("EDIT")}
            >
              <Pencil size={18} strokeWidth={2.5} />
              {t("EDIT")}
            </button>

            <button
              onClick={onClose}
              className="flex-1 md:flex-initial h-12 md:h-14 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 border border-stone-700/50 shadow-md"
            >
              <X size={18} strokeWidth={2.5} />
              {t("CLOSE")}
            </button>
          </div>
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center justify-center text-stone-400 bg-stone-900/40">
          <svg
            className="w-12 h-12 text-stone-600 mb-3 animate-bounce"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
          <p className="text-xs font-bold uppercase tracking-widest">{t("No Order Data Available")}</p>
        </div>
      )}
    </Modal>
  );
};
