import React, { useState, useEffect } from "react";
import Modal from "../../../../../../components/common/Modal";
import { Loader, Button } from "../../../../../../components/common";
import { Printer, X } from "lucide-react";
import { settledOrdersApi } from "../../../../services/settledOrdersApi";
import { salesInvoiceApi } from "../../../../services/salesInvoiceApi";
import { orderApi } from "../../../../services/orderApi";
import { deliveryApi } from "../../../../customer/services/deliveryApi";
import { getEmployeeNames, getEmployeeById } from "../../../../../general/employee/services/employeeService";
import { useToast } from "../../../../../../app/providers/useToast";
import { formatAmount } from "../../../../../../utils/currency";
import { generateGuestPrintHtml } from "../../../../utils/guestPrintTemplate";
import { printHtmlReceipt } from "../../../../services/qzService";
import { printerSettingsApi } from "../../../../services/printerSettingsApi";
import { getVatStatus, roundCalc, getBillingConfig } from "../../../utils/billing";
import { isBillArabicEnabled } from "../../../../utils/alternativeHelpers";

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
}) => {
  const { showToast } = useToast();
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
      try {
        const response = await settledOrdersApi.getSettledOrderDetails(orderId);
        if (response && response.isSuccess && response.data) {
          orderData = response.data;
        }
      } catch (e) {
        console.warn("[PosSettledDetailsModal] getSettledOrderDetails failed:", e);
      }

      if (!orderData) {
        try {
          const ordRes = await orderApi.getOrderDetails(orderId);
          if (ordRes && (ordRes.data || ordRes.masterData)) {
            orderData = ordRes.data || ordRes;
          }
        } catch (e) {
          console.warn("[PosSettledDetailsModal] fallback getOrderDetails failed:", e);
        }
      }

      if (orderData) {
        let master = orderData.masterData || orderData;
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
              const saleMaster =
                saleRes.masterData || saleRes.master || saleRes.data?.masterData || saleRes.data?.master || saleRes;
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
                  employeeName: saleMaster?.employeeName || master.employeeName || orderData.employeeName,
                  employeeId: saleMaster?.employeeId ?? master.employeeId ?? orderData.employeeId,
                },
                detailsData:
                  Array.isArray(saleDetails) && saleDetails.length > 0
                    ? saleDetails
                    : orderData.detailsData || orderData.details,
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
        }

        // Query orderApi.getOrderDetails to get original order master data if employee details missing
        try {
          const ordRes = await orderApi.getOrderDetails(orderId);
          if (ordRes && (ordRes.data || ordRes.masterData)) {
            const oData = ordRes.data || ordRes;
            const oMaster = oData.masterData || oData;
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

        setOrder(orderData);
      }
    } catch (err) {
      console.warn("API error:", err);
    } finally {
      setLoading(false);
    }
  };

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

  const handlePrint = async () => {
    if (!orderId || !order) return;

    try {
      showToast(`Preparing Receipt for Order #${orderId}...`, "success");

      const master = order.masterData || order;
      const details = order.detailsData || order.details || [];

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

      const netAmount = Number(master.netAmount ?? order.netAmount ?? 0);
      const enableVat = getVatStatus();

      let detailsVatSum = 0;
      let totalVatBase = 0;

      const preMapped = details.map((d: any) => {
        const itemMods = modifiersData.filter((m: any) => m.mapId === d.mapId);
        const extras = itemMods
          .filter((m: any) => (m.price || 0) > 0)
          .map((m: any) => ({
            id: m.modifierId,
            name: m.modifierName,
            price: m.price || 0,
            qty: m.qty || 1,
            typeId: m.typeId,
          }));
        const modifiers = itemMods
          .filter((m: any) => (m.price || 0) <= 0)
          .map((m: any) => ({
            id: m.modifierId,
            name: m.modifierName,
            qty: m.qty || 1,
            typeId: m.typeId,
          }));

        const qty = d.qty ?? d.Qty ?? 1;
        const amount = d.amount ?? d.netAmount ?? d.NetAmount ?? d.Amount ?? 0;
        const price = d.price ?? d.Price ?? (qty > 0 ? amount / qty : 0);

        let lineBase = price * qty;
        extras.forEach((ex: any) => (lineBase += ex.price * ex.qty));

        const itemLineNetAmount = amount || lineBase;
        const itemVat = Number(d.vatAmount ?? d.VatAmount ?? 0);
        detailsVatSum += itemVat;

        const itemVatBase = itemVat > 0 ? itemLineNetAmount - itemVat : itemLineNetAmount;
        totalVatBase += itemVatBase;

        return {
          ...d,
          qty,
          price,
          extras,
          modifiers,
          lineBase,
          itemLineNetAmount,
          itemVat,
          itemVatBase,
        };
      });

      let resolvedVatAmount = Number(
        master.vatAmount ?? master.VatAmount ?? master.vatAmt ?? master.taxAmount ?? 0
      );
      if (resolvedVatAmount <= 0 && detailsVatSum > 0) {
        resolvedVatAmount = detailsVatSum;
      }

      // If VAT is active in system settings and prices are inclusive but vatAmount was 0
      if (enableVat && resolvedVatAmount <= 0 && netAmount > 0) {
        const billingConfig = getBillingConfig(orderTypeName);
        const vatRate = billingConfig.vatRate > 0 ? billingConfig.vatRate : 0.1;
        resolvedVatAmount = roundCalc(netAmount - netAmount / (1 + vatRate));
      }

      let resolvedSubTotal = Number(
        master.vatExclAmount ?? master.VatExclAmount ?? master.subTotal ?? master.SubTotal ?? 0
      );
      if (
        resolvedSubTotal <= 0 ||
        (enableVat && Math.abs(resolvedSubTotal - netAmount) < 0.001 && resolvedVatAmount > 0)
      ) {
        resolvedSubTotal = roundCalc(
          netAmount -
            resolvedVatAmount -
            Number(master.serviceCharge || 0) -
            Number(master.levyAmt || master.levy || 0) -
            Number(master.deliveryCharge || 0)
        );
      }

      const mappedItems = preMapped.map((d: any) => {
        let itemVat = d.itemVat;
        if (enableVat && itemVat <= 0 && resolvedVatAmount > 0 && netAmount > 0) {
          const ratio = (d.itemLineNetAmount || 0) / netAmount;
          itemVat = Number((resolvedVatAmount * ratio).toFixed(3));
        }
        const itemLineNet = d.itemLineNetAmount || d.lineBase || (d.price || 0) * (d.qty || 1);
        const itemBase = enableVat && itemVat > 0 ? itemLineNet - itemVat : d.itemVatBase ?? itemLineNet;
        return {
          productId: d.productId || d.itemId || 0,
          quantity: d.qty || 1,
          price: d.price || 0,
          baseAmount: itemBase,
          variantArabic: d.variantArabic || d.altArabic || d.VariantArabic || d.AltArabic,
          product: {
            name: d.productName || d.ProductName || `Product #${d.productId || 0}`,
            price: d.price || 0,
            arabicName: d.arabicName || d.ArabicName,
          },
          extras: d.extras,
          modifiers: d.modifiers,
          itemDiscount: d.discAmount || 0,
          lineTotal: itemLineNet,
          vatAmount: itemVat,
        };
      });

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
        ? (master.callBack || master.callback || master.callBackNo || master.callbackNo || master.callBackNumber || master.callbackNumber || (order as any)?.callBack || (order as any)?.callback || "")
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
        discount: master.discAmount || master.discount || 0,
        serviceCharge: master.serviceCharge || 0,
        levy: master.levyAmt || master.levy || 0,
        vatAmount: resolvedVatAmount,
        netAmount: netAmount,
        deliveryCharge: master.deliveryCharge || 0,
        payments,
        enableVat,
        isSettlement: true,
        billArabic:
          isBillArabicEnabled() ||
          mappedItems.some((it: any) =>
            Boolean(it.product?.arabicName || it.variantArabic || (it as any).altArabic)
          ),
      };

      const htmlContent = await generateGuestPrintHtml(mappedItems as any, printData);

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

  if (!isOpen) return null;

  const master = order?.masterData || order || {};
  const details = order?.detailsData || order?.details || [];

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      noPadding
      className="bg-[#262626] border border-stone-800 shadow-2xl rounded-2xl overflow-hidden max-w-[500px]"
    >
      <div className="bg-[#1e1e1e] border-b border-stone-800 text-stone-100 py-3.5 px-6 flex justify-between items-center">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-[#f48120]">ORDER DETAILS</h2>
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
          <div className="flex-1 p-5 bg-[#faf8f5] text-stone-900 font-mono text-xs overflow-y-auto">
            <div className="text-center font-bold border-b border-dashed border-stone-400 pb-3 mb-3">
              <div className="text-sm font-black uppercase tracking-wide">BITEZO POS</div>
              <div className="text-[10px] text-stone-500 font-medium">SETTLED ORDER TICKET</div>
            </div>
            <div className="grid grid-cols-2 gap-y-1 text-[11px] border-b border-dashed border-stone-400 pb-3 mb-3">
              {(master.voucherNo || master.invoiceNo || master.voucherNumber || master.saleNo) && (
                <div>
                  <span className="text-stone-500">Invoice: </span>
                  <span className="font-bold">
                    {master.voucherNo || master.invoiceNo || master.voucherNumber || master.saleNo}
                  </span>
                </div>
              )}
              <div>
                <span className="text-stone-500">Order: </span>
                <span className="font-bold">{orderNo}</span>
              </div>
              <div>
                <span className="text-stone-500">Emp: </span>
                <span className="font-bold">{resolvedEmployeeName}</span>
              </div>
              <div className="text-right">
                <span className="text-stone-500">Type: </span>
                <span className="font-bold text-[#49293e]">{orderTypeName}</span>
              </div>
              <div>
                <span className="text-stone-500">Customer: </span>
                <span className="font-bold">{displayCustomerName}</span>
              </div>
              {orderTypeName.toLowerCase().includes("dine") && master.tableNo && (
                <div className="text-right">
                  <span className="text-stone-500">Table: </span>
                  <span className="font-bold">
                    {master.sectionName ? `${master.sectionName} - ` : ""}
                    {master.tableNo}
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
            <div className="grid grid-cols-[24px_1fr_60px_60px] gap-2 border-b border-dashed border-stone-400 pb-2 mb-2 text-[10px] font-bold text-stone-500 uppercase">
              <div>Qty</div>
              <div>Item</div>
              <div className="text-right">Price</div>
              <div className="text-right">Total</div>
            </div>
            <div className="space-y-2.5">
              {details.map((detail: any, i: number) => {
                const qty = detail.qty ?? detail.Qty ?? 1;
                const amount = detail.amount ?? detail.netAmount ?? detail.NetAmount ?? detail.Amount ?? 0;
                const price = detail.price ?? detail.Price ?? (qty > 0 ? amount / qty : 0);

                return (
                  <div key={i} className="grid grid-cols-[24px_1fr_60px_60px] gap-2 text-[11px]">
                    <div className="font-bold text-stone-500">{qty}</div>
                    <div className="font-bold text-stone-800">{detail.productName || detail.ProductName}</div>
                    <div className="text-right text-stone-500">{formatAmount(price)}</div>
                    <div className="text-right font-bold text-stone-900">{formatAmount(amount)}</div>
                  </div>
                );
              })}
            </div>
            <div className="border-t border-dashed border-stone-400 pt-4 mt-6 flex justify-between font-bold text-xs uppercase">
              <span>Grand Total</span>
              <span className="text-base font-black text-[#f48120]">{formatAmount(netAmount)}</span>
            </div>
          </div>

          <div className="w-full md:w-28 shrink-0 bg-stone-900 border-t md:border-t-0 md:border-l border-stone-800 p-3 flex flex-row md:flex-col gap-2 justify-stretch items-stretch">
            <Button
              variant="primary"
              onClick={handlePrint}
              disabled={loading || !order}
              className="flex-1 md:flex-initial h-12 md:h-14 rounded-xl bg-emerald-700 hover:bg-emerald-600 active:scale-95 text-stone-100 font-black text-[10px] uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 shadow-md disabled:opacity-50"
            >
              <Printer size={18} strokeWidth={2.5} />
              PRINT
            </Button>

            <button
              onClick={onClose}
              className="flex-1 md:flex-initial h-12 md:h-14 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all flex flex-col justify-center items-center gap-1 border border-stone-700/50 shadow-md"
            >
              <X size={18} strokeWidth={2.5} />
              CLOSE
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
          <p className="text-xs font-bold uppercase tracking-widest">No Order Data Available</p>
        </div>
      )}
    </Modal>
  );
};
