import React, { useState, useEffect } from "react";
import Modal from "../../../../../../components/common/Modal";
import Checkbox from "../../../../../../components/common/Checkbox";
import { Loader } from "../../../../../../components/common";
import { Printer, Search, X, Truck } from "lucide-react";
import { usePosRecall } from "../../../hooks/usePosRecall";
import { useToast } from "../../../../../../app/providers/useToast";
import { useAppSelector } from "../../../../../../app/hooks";
import { PosRecallSearchModal } from "./PosRecallSearchModal";
import { PosRecallDetailsModal } from "./PosRecallDetailsModal";
import { PosDriverSelectionModal } from "./PosDriverSelectionModal";
import { orderApi } from "../../../../services/orderApi";
import { menuApi, getModifierTypeNameById } from "../../../../services/menuApi";
import { deliveryApi } from "../../../../customer/services/deliveryApi";
import type { PosWaiter } from "../../../../types";
import { generateGuestPrintHtml } from "../../../../utils/guestPrintTemplate";
import { printHtmlReceipt } from "../../../../services/qzService";
import { printerSettingsApi } from "../../../../services/printerSettingsApi";
import { getVatStatus, getBillingConfig, roundCalc } from "../../../utils/billing";
import { isBillArabicEnabled } from "../../../../utils/alternativeHelpers";
import { matchesOrderSearch } from "../../../utils/orderSearch";
import { sortOrderDetailsBySequence } from "../../../utils/orderSort";


interface PosRecallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettleSuccess?: (amount: number) => void;
  initialEmployeeId?: number | null;
}

const ORDER_TYPES = [
  { id: 0, label: "All", value: 0 },
  { id: 1, label: "Dine In", value: 1 },
  { id: 2, label: "Take Out", value: 2 },
  { id: 3, label: "Drive Thru", value: 3 },
  { id: 4, label: "Delivery", value: 4 },
  { id: 5, label: "Providers", value: 5 },
  { id: 6, label: "Coming", value: 6 },
];

export const PosRecallModal: React.FC<PosRecallModalProps> = ({
  isOpen,
  onClose,
  onSettleSuccess,
  initialEmployeeId,
}) => {
  const { orders, loading, fetchOrders } = usePosRecall();
  const { showToast } = useToast();
  const currentWaiterId = useAppSelector((state) => state.pos.waiterId);
  const currentWaiterName = useAppSelector((state) => state.pos.waiterName);

  const [activeTab, setActiveTab] = useState<number>(0);
  const [search, setSearch] = useState("");
  const [includeDeliveryOut, setIncludeDeliveryOut] = useState(true);
  const [deliveryOutOnly, setDeliveryOutOnly] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [selectedDriverOrderId, setSelectedDriverOrderId] = useState<number | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchStatus, setSearchStatus] = useState("ORDER NO");

  const [waiters, setWaiters] = useState<PosWaiter[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(() => {
    if (initialEmployeeId && initialEmployeeId > 0) return initialEmployeeId;
    if (currentWaiterId && currentWaiterId > 0) return currentWaiterId;
    const stored = localStorage.getItem("selectedWaiterId");
    return stored && !isNaN(Number(stored)) ? Number(stored) : null;
  });

  // Sync employee selection and load waiters list on modal open
  useEffect(() => {
    if (isOpen) {
      const empId = (initialEmployeeId && initialEmployeeId > 0)
        ? initialEmployeeId
        : (currentWaiterId && currentWaiterId > 0 ? currentWaiterId : null);
      setSelectedEmployeeId(empId);

      menuApi.getWaitersList().then((list) => {
        if (Array.isArray(list)) setWaiters(list);
      }).catch((err) => {
        console.warn("[PosRecallModal] Failed to load waiters list:", err);
      });
    }
  }, [isOpen, initialEmployeeId, currentWaiterId]);

  // Filter handlers
  useEffect(() => {
    if (isOpen) {
      const typeValue = ORDER_TYPES.find(t => t.id === activeTab)?.value || 0;
      void fetchOrders({
        OrderTypeId: typeValue,
        EmployeeId: selectedEmployeeId && selectedEmployeeId > 0 ? selectedEmployeeId : undefined,
        SearchValue: search,
        SearchStatus: searchStatus,
        DeliveryOutStatus: includeDeliveryOut,
        DeliveryOutOnlyStatus: deliveryOutOnly
      });
    }
  }, [isOpen, activeTab, selectedEmployeeId, includeDeliveryOut, deliveryOutOnly, search, searchStatus, fetchOrders]);

  const handlePrint = async (transId: number) => {
    try {
      showToast(`Fetching Order #${transId} for printing...`, "info");
      
      const orderRes = await orderApi.getOrderDetails(transId);
      if (!orderRes || !orderRes.isSuccess || !orderRes.data) {
        showToast(`Failed to load order #${transId} for printing`, "error");
        return;
      }
      const order = orderRes.data;
      
      const master = order.masterData || order;
      const details = sortOrderDetailsBySequence(order.detailsData || order.details || []);
      
      const orderTypeMap: Record<number, string> = {
        1: "DineIn", 2: "TakeOut", 3: "DriveThru",
        4: "Delivery", 5: "Providers", 6: "Coming"
      };
      const orderTypeName = master.orderType || orderTypeMap[master.orderTypeId] || master.orderTypeName || order?.orderTypeName || "DineIn";

      const isValidDateStr = (s: any) => {
        if (!s || typeof s !== 'string') return false;
        if (s.startsWith('0001')) return false;
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
        order.createdAt
      ];

      let resolvedDateStr = candidateDates.find(isValidDateStr);
      let date: string | undefined;
      let time: string | undefined;
      
      if (resolvedDateStr) {
        try {
          const d = new Date(resolvedDateStr);
          if (!isNaN(d.getTime()) && d.getFullYear() >= 2000) {
            date = d.toLocaleDateString('en-GB');
            time = d.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
          } else if (/am|pm/i.test(resolvedDateStr)) {
            const today = new Date();
            date = today.toLocaleDateString('en-GB');
            time = resolvedDateStr;
          }
        } catch { /* ignore */ }
      }

      if (!date) {
        const now = new Date();
        date = now.toLocaleDateString('en-GB');
        time = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
      }

      // Deduplicate modifiersData mapped in order
      const rawModifiers = order?.modifiersData || [];
      const seen = new Set<string>();
      const orderModifiersData = rawModifiers.filter((m: any) => {
        const key = `${m.mapId}-${m.modifierId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const netAmount = Number(master.netAmount ?? order.netAmount ?? 0);
      const enableVat = getVatStatus();

      let detailsVatSum = 0;
      let totalVatBase = 0;
      const preMapped = details.map((d: any) => {
        const itemMods = orderModifiersData.filter((m: any) => m.mapId === d.mapId);
        const extras = itemMods.filter((m: any) => (m.status || "").toLowerCase() === "extras" || ((m.status || "") === "" && (m.price || 0) > 0)).map((m: any) => ({
          id: m.modifierId, name: m.modifierName, price: m.price || 0, qty: m.qty || 1
        }));
        const modifiers = itemMods.filter((m: any) => (m.status || "").toLowerCase() === "modifier" || ((m.status || "") === "" && (m.price || 0) <= 0)).map((m: any) => ({
          id: m.modifierId,
          name: m.modifierName,
          qty: m.qty || 1,
          typeId: m.typeId,
          typeName: m.typeName || m.modifierTypeName || getModifierTypeNameById(m.typeId) || "",
          arabicName: m.arabicName || ""
        }));
        const messages = itemMods.filter((m: any) => (m.status || "").toLowerCase() === "message").map((m: any) => ({
          id: m.modifierId, name: m.modifierName || m.name || ""
        }));
        
        const qty = d.qty ?? d.Qty ?? 1;
        const amount = d.amount ?? d.netAmount ?? d.NetAmount ?? d.Amount ?? 0;
        const price = d.price ?? d.Price ?? (qty > 0 ? amount / qty : 0);

        let lineBase = price * qty;
        extras.forEach((ex: any) => lineBase += ex.price * ex.qty);

        const itemLineNetAmount = amount || lineBase;
        const itemVat = Number(d.vatAmount ?? d.VatAmount ?? 0);
        detailsVatSum += itemVat;

        const itemVatBase = itemVat > 0 ? (itemLineNetAmount - itemVat) : itemLineNetAmount;
        totalVatBase += itemVatBase;
        
        return {
          ...d,
          qty,
          price,
          extras,
          modifiers,
          messages,
          lineBase,
          itemLineNetAmount,
          itemVat,
          itemVatBase
        };
      });

      let resolvedVatAmount = Number(master.vatAmount ?? master.VatAmount ?? master.vatAmt ?? master.taxAmount ?? 0);
      if (resolvedVatAmount <= 0 && detailsVatSum > 0) {
        resolvedVatAmount = detailsVatSum;
      }

      // If VAT is active in system settings and prices are inclusive but vatAmount was 0
      if (enableVat && resolvedVatAmount <= 0 && netAmount > 0) {
        const billingConfig = getBillingConfig(orderTypeName);
        const vatRate = billingConfig.vatRate > 0 ? billingConfig.vatRate : 0.10;
        resolvedVatAmount = roundCalc(netAmount - (netAmount / (1 + vatRate)));
      }

      let resolvedDiscount = Number(master.discAmount ?? master.DiscAmount ?? master.discount ?? 0);
      if (resolvedDiscount <= 0) {
        const lineDiscounts = details.reduce((acc: number, d: any) => acc + Number(d.discAmount ?? d.DiscAmount ?? 0), 0);
        if (lineDiscounts > 0) resolvedDiscount = roundCalc(lineDiscounts);
      }

      const serviceCharge = Number(master.serviceCharge || 0);
      const levy = Number(master.levyAmt || master.levy || 0);
      const deliveryCharge = Number(master.deliveryCharge || 0);

      const netTaxableBase = roundCalc(netAmount - resolvedVatAmount - serviceCharge - levy - deliveryCharge);
      let resolvedSubTotal = Number(master.vatExclAmount ?? master.VatExclAmount ?? master.subTotal ?? master.SubTotal ?? 0);
      if (resolvedSubTotal <= 0 || (enableVat && Math.abs(resolvedSubTotal - netAmount) < 0.001 && resolvedVatAmount > 0)) {
        resolvedSubTotal = roundCalc(netTaxableBase + resolvedDiscount);
      }

      const mappedItems = preMapped.map((d: any) => {
        const pId = d.productId || d.itemId || 0;
        let itemVat = d.itemVat;
        if (enableVat && itemVat <= 0 && resolvedVatAmount > 0 && netAmount > 0) {
          const ratio = (d.itemLineNetAmount || 0) / netAmount;
          itemVat = Number((resolvedVatAmount * ratio).toFixed(3));
        }
        const itemLineNet = d.itemLineNetAmount || d.lineBase || ((d.price || 0) * (d.qty || 1));
        const itemBase = d.baseAmount !== undefined ? d.baseAmount : (d.price || 0) * (d.qty || 1);
        return {
          productId: pId,
          quantity: d.qty || 1,
          price: d.price || 0,
          baseAmount: itemBase,
          variantArabic: d.variantArabic || d.altArabic || d.VariantArabic || d.AltArabic,
          product: { 
            name: d.productName || d.ProductName || `Product #${pId}`, 
            price: d.price || 0,
            arabicName: d.arabicName || d.ArabicName
          },
          extras: d.extras,
          modifiers: d.modifiers,
          messages: d.messages || [],
          itemDiscount: d.discAmount || 0,
          lineTotal: itemLineNet,
          vatAmount: itemVat
        };
      });

      let resolvedFlatNo = master.flatNo || master.flat || master.flatNumber || "";
      let resolvedBuildingNo = master.buildingNo || master.building || master.buildingNumber || "";
      let resolvedBlockNo = master.blockNo || master.block || master.blockNumber || "";
      let resolvedRoadNo = master.roadNo || master.road || master.roadNumber || master.street || "";
      let resolvedArea = master.area || master.areaName || "";
      let resolvedAddress = master.address || master.customerAddress || master.deliveryAddress || "";
      let resolvedContactNo = master.mobileNo || master.contactNo || master.phone || master.mobile || "";
      const isDeliveryOrder = (orderTypeName || "").toLowerCase().includes("delivery");
      let resolvedCallBack = isDeliveryOrder
        ? (master.callBack ||
          master.callback ||
          master.callBackNo ||
          master.callbackNo ||
          master.callBackNumber ||
          master.callbackNumber ||
          (order as any)?.callBack ||
          (order as any)?.callback ||
          (order as any)?.orderMaster?.callBack ||
          (order as any)?.orderMaster?.callback ||
          (order as any)?.master?.callBack ||
          "")
        : "";

      let rawChange =
        master.change ??
        master.keepChanges ??
        (order as any)?.change ??
        (order as any)?.keepChanges ??
        (order as any)?.orderMaster?.change ??
        (order as any)?.orderMaster?.keepChanges ??
        (order as any)?.master?.change ??
        "";

      const validKeepChange = (isDeliveryOrder && rawChange !== undefined && rawChange !== null &&
        String(rawChange).trim() !== "" &&
        String(rawChange).trim() !== "0" &&
        String(rawChange).trim() !== "0.00" &&
        String(rawChange).trim() !== "0.000")
        ? String(rawChange).trim()
        : undefined;
      const matchedOrder = orders.find(o => o.orderId === transId);

      // Extract employee name and customer name from details string if needed
      let empFromDetails = "";
      let custFromDetails = "";
      if (matchedOrder && typeof matchedOrder.details === "string") {
        const parenMatches = matchedOrder.details.match(/\(([^)]+)\)/g)?.map((s: string) => s.replace(/[()]/g, "").trim()) || [];
        if (parenMatches.length >= 3) {
          custFromDetails = parenMatches[1];
          const cand = parenMatches[2];
          if (cand && !["waiter", "cashier", "null", "undefined"].includes(cand.toLowerCase())) {
            empFromDetails = cand;
          }
        } else if (parenMatches.length === 2) {
          if (parenMatches[1].toLowerCase() === "cash customer") {
            custFromDetails = parenMatches[1];
          } else if (!["waiter", "cashier", "null", "undefined"].includes(parenMatches[1].toLowerCase())) {
            empFromDetails = parenMatches[1];
          }
        } else if (parenMatches.length === 1) {
          custFromDetails = parenMatches[0];
        }
      }

      let resolvedCustomerName =
        master.deliveryCustomerName ||
        master.vehicleCustomerName ||
        master.customerName ||
        master.customer ||
        custFromDetails ||
        "";

      if (isDeliveryOrder && !resolvedFlatNo && !resolvedBuildingNo && !resolvedBlockNo && !resolvedRoadNo && !resolvedArea && resolvedContactNo) {
        try {
          const addrRes = await deliveryApi.getDeliveryAddress(resolvedContactNo);
          const addrData = Array.isArray(addrRes?.data) ? addrRes.data[0] : (addrRes?.data || addrRes);
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
          console.warn("[PosRecallModal] Could not fetch delivery address fallback:", fetchAddrErr);
        }
      }

      if (!resolvedCustomerName) {
        resolvedCustomerName = "CASH CUSTOMER";
      }

      let resolvedWaiter = "";
      const rawName = master.employeeName;
      if (rawName && !["waiter", "cashier", "null", "undefined"].includes(String(rawName).trim().toLowerCase())) {
        resolvedWaiter = String(rawName).trim();
      }

      if (!resolvedWaiter && empFromDetails) {
        resolvedWaiter = empFromDetails;
      }

      if (!resolvedWaiter) {
        const empId = master.employeeId ?? master.empId ?? (matchedOrder as any)?.employeeId;
        if (empId) {
          try {
            const mapRaw = localStorage.getItem("posEmpNameMap");
            if (mapRaw) {
              const map = JSON.parse(mapRaw);
              if (map[String(empId)] && !["waiter", "cashier"].includes(String(map[String(empId)]).trim().toLowerCase())) {
                resolvedWaiter = String(map[String(empId)]).trim();
              }
            }
          } catch {}

          if (!resolvedWaiter && String(empId) === localStorage.getItem("authorizedEmployeeId")) {
            const authName = localStorage.getItem("authorizedEmployeeName");
            if (authName && !["waiter", "cashier"].includes(authName.trim().toLowerCase())) {
              resolvedWaiter = authName.trim();
            }
          }

          if (!resolvedWaiter) {
            try {
              const branchId =
                Number(localStorage.getItem("systemBranchId")) ||
                Number(localStorage.getItem("activeBranchId")) ||
                Number(localStorage.getItem("branchId")) ||
                0;
              const { getEmployeeNames } = await import("../../../../../general/employee/services/employeeService");
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
                if (map[String(empId)] && !["waiter", "cashier"].includes(String(map[String(empId)]).trim().toLowerCase())) {
                  resolvedWaiter = String(map[String(empId)]).trim();
                }
              }
            } catch (e) {
              console.warn("[PosRecallModal] getEmployeeNames fallback failed:", e);
            }
          }
        }
      }

      if (!resolvedWaiter) {
        resolvedWaiter =
          localStorage.getItem("defaultEmployeeName") ||
          localStorage.getItem("authorizedEmployeeName") ||
          currentWaiterName ||
          localStorage.getItem("employeeName") ||
          "Waiter";
      }

      let resolvedDriver =
        master.driverName ||
        master.allocatedDriverName ||
        master.driver ||
        master.driverEmployeeName ||
        matchedOrder?.driverName ||
        matchedOrder?.allocatedDriverName ||
        matchedOrder?.driver ||
        matchedOrder?.driverEmployeeName ||
        "";

      if (!resolvedDriver && matchedOrder && typeof matchedOrder.details === "string") {
        const match = matchedOrder.details.match(/\(Driver:\s*([^)]+)\)/i) || matchedOrder.details.match(/Driver:\s*([A-Za-z0-9_\s]+)/i);
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

      const activeDriverId = master.driverId || matchedOrder?.driverId;
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
          console.warn("[PosRecallModal] Failed to resolve driver name by id:", err);
        }
      }

      const printData = {
        orderNo: master.orderNo ?? String(transId),
        ticketNo: master.ticketNo ?? "1",
        waiter: resolvedWaiter,
        counter: "Main",
        section: master.sectionName || "DINE IN",
        table: master.tableNo || "",
        orderType: orderTypeName,
        date, time,
        customerName: resolvedCustomerName,
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
        providerNo: master.providerNo || master.providerOrderNo || "",
        subTotal: resolvedSubTotal,
        discount: resolvedDiscount,
        serviceCharge: master.serviceCharge || 0,
        levy: master.levyAmt || master.levy || 0,
        vatAmount: resolvedVatAmount,
        netAmount: netAmount,
        deliveryCharge: master.deliveryCharge || 0,
        enableVat,
        billArabic: isBillArabicEnabled() || mappedItems.some((it: any) => 
          Boolean(it.product?.arabicName || it.variantArabic || (it as any).altArabic)
        )
      };

      const htmlContent = await generateGuestPrintHtml(mappedItems as any, printData);
      
      let billPrinter: string | undefined;
      try {
        const settingsRes = await printerSettingsApi.getGeneral();
        const gen = settingsRes?.data;
        billPrinter = gen?.androidBillPrinter || gen?.billPrinter || gen?.androidKOTPrinter || gen?.kotPrinter;
      } catch (err) {
        console.warn("[PosRecallModal] Could not fetch general printer settings:", err);
      }

      if (!billPrinter || billPrinter === "No Printer") {
        billPrinter = localStorage.getItem('cachedBillPrinter') || 
                      localStorage.getItem('cachedBillPrinterIp') ||
                      localStorage.getItem('cachedKotPrinter') || 
                      localStorage.getItem('cachedKotPrinterIp') || 
                      localStorage.getItem('printerIpAddress') || 
                      undefined;
      }

      await printHtmlReceipt(htmlContent, billPrinter);
      showToast("Guest receipt sent to printer!", "success");
    } catch (err: any) {
      console.error("Print Error:", err);
      showToast(err?.message ? `Print failed: ${err.message}` : "Printing failed", "error");
    }
  };

  const handleApplySearch = (value: string, status: string) => {
    setSearch(value);
    setSearchStatus(status);
    const typeValue = ORDER_TYPES.find(t => t.id === activeTab)?.value || 0;
    void fetchOrders({
      OrderTypeId: typeValue,
      EmployeeId: selectedEmployeeId && selectedEmployeeId > 0 ? selectedEmployeeId : undefined,
      SearchValue: value,
      SearchStatus: status,
      DeliveryOutStatus: includeDeliveryOut,
      DeliveryOutOnlyStatus: deliveryOutOnly
    });
  };

  const displayedOrders = React.useMemo(() => {
    let list = orders;

    if (selectedEmployeeId) {
      const targetWaiter = waiters.find((w) => w.empId === selectedEmployeeId);
      const targetName = (
        targetWaiter?.empName ||
        (selectedEmployeeId === currentWaiterId ? currentWaiterName : null) ||
        ""
      ).toLowerCase().trim();

      list = list.filter((order) => {
        // 1. If backend object has explicit employeeId / waiterId
        const oAny = order as any;
        if (oAny.employeeId && Number(oAny.employeeId) === Number(selectedEmployeeId)) return true;
        if (oAny.waiterId && Number(oAny.waiterId) === Number(selectedEmployeeId)) return true;

        // 2. Parse / match employee tag from order.details string, e.g. "(emp1)" or "(emp2)"
        if (typeof order.details === "string") {
          const detailsLower = order.details.toLowerCase();

          // Exact match with target employee name if known, e.g. "(emp1)"
          if (targetName && detailsLower.includes(`(${targetName})`)) {
            return true;
          }

          // Match tag pattern: "(emp<id>)" e.g. "(emp1)"
          if (detailsLower.includes(`(emp${selectedEmployeeId})`)) {
            return true;
          }
        }

        return false;
      });
    }

    if (search && search.trim()) {
      list = list.filter((order) => matchesOrderSearch(order, search, searchStatus));
    }

    return list;
  }, [orders, selectedEmployeeId, waiters, currentWaiterId, currentWaiterName, search, searchStatus]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      noPadding
      noScroll
      className="bg-[#f8f9fa] border-none shadow-2xl h-[95vh] max-h-[900px] flex flex-col"
    >
      {/* HEADER SECTION */}
      <div className="flex flex-col shrink-0">
        {/* Navigation Tabs */}
        <div className="flex items-stretch bg-[#49293e] text-white">
          <div className="flex-1 flex overflow-x-auto no-scrollbar">
            {ORDER_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setActiveTab(type.id)}
                className={`
                  px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all min-w-[80px] sm:min-w-[100px]
                  ${activeTab === type.id ? "bg-[#f48120] text-white shadow-inner" : "hover:bg-white/10 text-white/80"}
                  border-r border-white/10
                `}
              >
                {type.label}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 flex items-center justify-center bg-red-700 hover:bg-red-800 text-white transition-colors shrink-0"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>

        {/* Sub-Header with Filters & Search */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex flex-row items-center gap-6 px-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <Checkbox 
                checked={includeDeliveryOut} 
                onChange={(e) => setIncludeDeliveryOut(e.target.checked)} 
              />
              <span className="text-[10px] font-bold text-gray-600 group-hover:text-gray-900 transition-colors uppercase tracking-tight">
                Including Delivery Out
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <Checkbox 
                checked={deliveryOutOnly} 
                onChange={(e) => setDeliveryOutOnly(e.target.checked)} 
              />
              <span className="text-[10px] font-bold text-gray-600 group-hover:text-gray-900 transition-colors uppercase tracking-tight">
                Delivery Out Only
              </span>
            </label>
          </div>

          <div className="flex items-center gap-3 flex-1 justify-end">
            <button 
              onClick={() => setIsSearchModalOpen(true)}
              className="px-6 py-2 rounded-xl bg-[#f48120] flex items-center justify-center text-white shadow-md cursor-pointer hover:bg-[#e06d10] transition-all gap-2"
            >
              <Search size={18} strokeWidth={3} />
              <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">
                {search ? `${searchStatus}: ${search}` : "Search..."}
              </span>
            </button>
            {search && (
              <button
                onClick={() => handleApplySearch("", "ORDER NO")}
                className="px-4 py-2 rounded-xl border border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-red-500 transition-colors text-xs font-bold uppercase tracking-widest"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ORDERS LIST SECTION */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#f0f2f5] relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center">
            <Loader text="Retrieving Orders..." />
          </div>
        )}

        {!loading && displayedOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400 gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
              <Search size={32} />
            </div>
            <p className="font-bold uppercase tracking-widest text-xs">No orders found</p>
          </div>
        )}

        {displayedOrders.map((order, index) => (
          <div
            key={order.orderId || `recall-${index}`}
            onClick={() => {
              setSelectedOrderId(order.orderId);
              setIsDetailsOpen(true);
            }}
            className={`
              flex items-stretch bg-white rounded-xl overflow-hidden shadow-sm border border-transparent cursor-pointer
              hover:border-[#f48120]/30 hover:shadow-md transition-all group
              ${selectedOrderId === order.orderId ? "ring-2 ring-[#f48120] shadow-lg translate-x-1" : ""}
            `}
          >
            {/* Order Content */}
            <div className={`
              flex-1 p-4 flex flex-col justify-center gap-1.5 transition-colors
              ${selectedOrderId === order.orderId ? "bg-[#f48120] text-white" : "group-hover:bg-gray-50"}
            `}>
              {order.isPrinted && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${selectedOrderId === order.orderId ? "bg-white/20" : "bg-green-100"}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-tighter ${selectedOrderId === order.orderId ? "text-white" : "text-green-700"}`}>
                      Printed
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2">
                <div className={`mt-1.5 shrink-0 h-1.5 w-1.5 rounded-full ${selectedOrderId === order.orderId ? "bg-white" : "bg-[#f48120]"}`} />
                <p className={`text-sm font-bold leading-snug italic ${selectedOrderId === order.orderId ? "text-white" : "text-gray-800"}`}>
                  "{order.details}"
                </p>
              </div>
            </div>

            {/* Action Buttons Wrapper */}
            <div className="flex shrink-0">
              {order.details.toLowerCase().includes("(delivery)") && (() => {
                const driverName = order.driverName || order.allocatedDriverName || order.driver || order.driverEmployeeName || (() => {
                  const match = typeof order.details === "string" && (order.details.match(/\(Driver:\s*([^)]+)\)/i) || order.details.match(/Driver:\s*([A-Za-z0-9_\s]+)/i));
                  return match && match[1] ? match[1].trim() : null;
                })();
                const hasDriver = Boolean(driverName && driverName.trim() !== "");

                return (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDriverOrderId(order.orderId);
                    }}
                    title={hasDriver ? `Assigned Driver: ${driverName}` : "Select Driver"}
                    className={`
                      px-3 min-w-[90px] h-full flex flex-col items-center justify-center gap-1 transition-all
                      ${hasDriver 
                        ? "bg-[#f48120] hover:bg-[#e06d10] text-white shadow-inner" 
                        : "bg-gray-200 hover:bg-gray-300 text-gray-700"}
                    `}
                  >
                    <Truck size={18} strokeWidth={2.5} />
                    <div className="font-black text-[10px] uppercase tracking-widest text-center truncate max-w-[100px]">
                      {hasDriver ? driverName : "Driver"}
                    </div>
                  </button>
                );
              })()}
              {/* Print Button Wrapper */}
              <div className="w-[100px] shrink-0">
                <button
                  onClick={(e) => {
                  e.stopPropagation();
                  handlePrint(order.orderId);
                }}
                className={`
                  w-full h-full flex flex-col items-center justify-center gap-1 transition-all
                  ${order.isPrinted 
                    ? "bg-[#3e4d22] hover:bg-[#34411c] text-white" 
                    : "bg-[#556b2f] hover:bg-[#4a5d29] text-white"}
                `}
              >
                <Printer size={18} strokeWidth={3} />
                <div className="font-black text-[10px] uppercase tracking-widest">
                  Print
                </div>
              </button>
            </div>
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div className="p-4 bg-white border-t border-gray-200 flex justify-between items-center shrink-0">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Total Records: {displayedOrders.length}
        </div>
      </div>

      {/* Embedded Search Modal */}
      <PosRecallSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        onSearch={handleApplySearch}
        initialSearchStatus={searchStatus}
        initialSearchValue={search}
      />

      <PosRecallDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        orderId={selectedOrderId}
        orderDetailsStr={orders.find(o => o.orderId === selectedOrderId)?.details}
        onEditSuccess={onClose}
        onSettleSuccess={(amount) => {
          onSettleSuccess?.(amount);
          // DO NOT close the details modal here so it stays in the background during payment
        }}
      />
      
      <PosDriverSelectionModal
        isOpen={selectedDriverOrderId !== null}
        onClose={() => setSelectedDriverOrderId(null)}
        orderId={selectedDriverOrderId}
        onSuccess={() => {
          setSelectedDriverOrderId(null);
          void fetchOrders({
            OrderTypeId: ORDER_TYPES.find(t => t.id === activeTab)?.value || 0,
            EmployeeId: selectedEmployeeId && selectedEmployeeId > 0 ? selectedEmployeeId : undefined,
            SearchValue: search,
            SearchStatus: searchStatus,
            DeliveryOutStatus: includeDeliveryOut,
            DeliveryOutOnlyStatus: deliveryOutOnly
          });
        }}
      />
    </Modal>
  );
};
