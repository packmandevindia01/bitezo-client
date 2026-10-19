import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../../../../app/hooks";
import {
  UtensilsCrossed,
  ShoppingBag,
  Truck,
  Car,
  Users,
  User,
  Maximize,
  Minimize
} from "lucide-react";
import PosActionButton from "./PosActionButton";
import type { PosOrderType, MenuProvider } from "../../../types";
import { SubscriptionStatusBadge } from "../../../../company/components/SubscriptionStatusBadge";
import { t } from "../../../utils/posLocalization";


interface PosTopNavProps {
  onProvider?: () => void;
  onCashierOut?: () => void;
  onLogout?: () => void;
  onDelivery?: () => void;
  onDriveThrough?: () => void;
  onCustomer?: () => void;
  orderTypes?: PosOrderType[];
  selectedOrderTypeId?: number;
  onSelectOrderType?: (type: PosOrderType) => void;
  status: any;
  activeProvider?: { provider: MenuProvider; orderNo: string } | null;
}


const fallbackOrderTypes: PosOrderType[] = [
  { orderTypeId: 1, orderType: "DineIn" },
  { orderTypeId: 2, orderType: "TakeOut" },
  { orderTypeId: 3, orderType: "DriveThru" },
  { orderTypeId: 4, orderType: "Delivery" },
];

const normalizeOrderType = (value: string) => value.toLowerCase().replace(/[\s_-]/g, "");

const getOrderTypeIcon = (name: string) => {
  const normalized = normalizeOrderType(name);
  if (normalized.includes("takeout") || normalized.includes("takeaway")) return ShoppingBag;
  if (normalized.includes("drive")) return Car;
  if (normalized.includes("delivery")) return Truck;
  return UtensilsCrossed;
};

const formatOrderTypeLabel = (name: string) => {
  return name.replace(/([a-z])([A-Z])/g, "$1 $2");
};

const PosTopNav = ({
  onCashierOut,
  onLogout,
  onDelivery,
  onDriveThrough,
  onProvider,
  onCustomer,
  orderTypes = fallbackOrderTypes,
  selectedOrderTypeId,
  onSelectOrderType,
  activeProvider
}: PosTopNavProps) => {

  const navigate = useNavigate();
  const {
    editingOrderId,
    selectedOrderTypeName,
    selectedTableNo,
    waiterName,
    selectedCustomerId,
    selectedCustomerName,
    vehicleCustomerName,
    deliveryCustomerName,
  } = useAppSelector(state => state.pos);

  const isCustomCustomerSelected = Boolean(selectedCustomerId && Number(selectedCustomerId) !== 1);
  const displayCustomerName = isCustomCustomerSelected
    ? (t(selectedCustomerName) || deliveryCustomerName || vehicleCustomerName || `${t("Customer")} #${selectedCustomerId}`)
    : (t(selectedCustomerName) || t("Cash Customer"));
  const visibleOrderTypes = orderTypes.length > 0 ? orderTypes : fallbackOrderTypes;

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleLogoutClick = () => {
    if (onLogout) {
      onLogout();
    } else if (onCashierOut) {
      onCashierOut(); // Open the Close Session modal
    }
  };

  return (
    <nav className="flex items-center justify-between gap-1 sm:gap-2 xl:gap-3 border-b border-[#3a2031] bg-[#49293e] px-2 sm:px-2.5 xl:px-4 h-[50px] sm:h-[52px] xl:h-[58px] shadow-sm shrink-0 w-full transition-all duration-200">
      <div className="flex items-center gap-0 min-w-0 h-full">
        
        {/* Centered logo, cleanly proportioned across all screen sizes */}
        <div className="flex items-center justify-center w-[75px] sm:w-[85px] md:w-[90px] lg:w-[95px] xl:w-[120px] h-full shrink-0 px-1 transition-all duration-200">
          <div className="w-full h-full flex items-center justify-center">
            <img 
               src="/LOGO6.png" 
               alt="Bitezo" 
               className="h-5.5 sm:h-6 md:h-6.5 xl:h-8 max-w-full object-contain brightness-0 invert" 
            />
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 ml-1 sm:ml-1.5 md:ml-2 xl:ml-3 min-w-0 overflow-x-auto no-scrollbar pb-0.5">
          {visibleOrderTypes.map((type) => {
            const Icon = getOrderTypeIcon(type.orderType);
            const label = formatOrderTypeLabel(type.orderType);
            const normalized = normalizeOrderType(type.orderType);
            const isActive = !activeProvider && selectedOrderTypeId === type.orderTypeId;

            return (
            <PosActionButton
              key={type.orderTypeId}
              accent={isActive ? "orange" : "order-inactive"}
              noPadding
              className="h-8 md:h-8.5 xl:h-9.5 px-2 xl:px-2.5 rounded-lg xl:rounded-xl text-[9.5px] xl:text-[10.5px] shrink-0 shadow-xs flex items-center gap-1 transition-all duration-200"
              onClick={() => {
                onSelectOrderType?.(type);
                if (normalized.includes("dine")) {
                  navigate("/pos/dine-in", {
                    state: {
                      skipAutoDineIn: true,
                      fromTerminal: true,
                      isEditingOrder: Boolean(editingOrderId),
                    },
                  });
                } else if (normalized.includes("delivery") && onDelivery) {
                  onDelivery();
                } else if (normalized.includes("drive") && onDriveThrough) {
                  onDriveThrough();
                }
              }}
            >
              <Icon size={13} className="shrink-0" />
              <span className="inline whitespace-nowrap">{t(label)}</span>
            </PosActionButton>
          )})}
          <PosActionButton
            accent={activeProvider ? "orange" : "order-inactive"}
            noPadding
            className="h-8 md:h-8.5 xl:h-9.5 px-2 xl:px-2.5 rounded-lg xl:rounded-xl text-[9.5px] xl:text-[10.5px] shrink-0 shadow-xs flex items-center gap-1 transition-all duration-200"
            onClick={onProvider}
          >
            <Users size={13} className="shrink-0" />
            <span
              className={`inline uppercase whitespace-nowrap ${
                activeProvider ? "max-w-[90px] xl:max-w-[130px] truncate" : ""
              }`}
              title={activeProvider ? activeProvider.provider.providerName : undefined}
            >
              {activeProvider ? activeProvider.provider.providerName : t("Providers")}
            </span>
          </PosActionButton>
        </div>

      </div>

      <div className="flex items-center gap-1 xl:gap-1.5 shrink-0">

        <div className="flex flex-col text-right mr-1 sm:mr-1.5 xl:mr-3 leading-tight justify-center shrink-0">
          <div className="flex gap-1 sm:gap-1.5 xl:gap-2 justify-end items-center text-white font-bold text-[10px] md:text-[10.5px] xl:text-[12px]">
            <button
              type="button"
              onClick={onCustomer}
              className={`inline-flex items-center gap-1 transition-all ${
                onCustomer ? "hover:opacity-80 cursor-pointer" : "cursor-default"
              }`}
              title={isCustomCustomerSelected ? `Assigned Customer: ${displayCustomerName}` : t("Customer")}
            >
              <User size={10} className={isCustomCustomerSelected ? "text-emerald-400" : "text-white/60"} />
              <span className="text-white/60 font-semibold mr-0.5">{t("Customer")}:</span>
              <span
                className={`truncate max-w-[70px] sm:max-w-[85px] md:max-w-[100px] xl:max-w-[130px] ${
                  isCustomCustomerSelected
                    ? "text-emerald-300 font-black drop-shadow-xs"
                    : "text-white/90 font-bold"
                }`}
              >
                {displayCustomerName}
              </span>
            </button>
            <span className="text-white/30">|</span>
            <span><span className="text-white/70 font-semibold mr-0.5">{t("Order")}:</span>{editingOrderId || activeProvider?.orderNo || t("New")}</span>
            <span className="text-white/30">|</span>
            <span><span className="text-white/70 font-semibold mr-0.5">{t("Ticket")}:</span>{editingOrderId || activeProvider?.orderNo || t("New")}</span>
          </div>
          <div className="flex gap-1 sm:gap-1.5 xl:gap-2 justify-end text-white/90 font-semibold text-[9px] md:text-[9.5px] xl:text-[10.5px] mt-0.5">
            <span><span className="text-white/50 font-medium mr-0.5">{t("Section")}:</span>{activeProvider ? activeProvider.provider.providerName : t(selectedOrderTypeName || "-")}</span>
            <span className="text-white/30">|</span>
            <span><span className="text-white/50 font-medium mr-0.5">{t("Table")}:</span>{activeProvider ? "-" : (selectedTableNo || "-")}</span>
            {waiterName && (
              <>
                <span className="text-white/30">|</span>
                <span className="text-[#fca311]"><span className="text-white/50 font-medium mr-0.5">{t("Waiter")}:</span>{t(waiterName)}</span>
              </>
            )}
          </div>
        </div>

        <div className="hidden xl:inline-flex shrink-0 mr-1 xl:mr-1.5">
          <SubscriptionStatusBadge theme="dark" />
        </div>

        <PosActionButton
          accent="gray"
          noPadding
          className="h-7.5 w-7.5 sm:h-8 sm:w-8 xl:h-9 xl:w-9 rounded-lg xl:rounded-xl shadow-xs text-slate-600 mr-0.5 xl:mr-1 transition-all duration-200"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <Minimize size={15} strokeWidth={2.5} /> : <Maximize size={15} strokeWidth={2.5} />}
        </PosActionButton>

        <PosActionButton
          accent="red"
          noPadding
          className="h-7.5 w-7.5 sm:h-8 sm:w-8 xl:h-9 xl:w-9 rounded-lg xl:rounded-xl shadow-xs transition-all duration-200"
          onClick={handleLogoutClick}
          title="Logout"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" />
          </svg>
        </PosActionButton>
      </div>
    </nav>
  );
};

export default React.memo(PosTopNav);
