import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector } from "../../../../../app/hooks";
import {
  UtensilsCrossed,
  ShoppingBag,
  Truck,
  Car,
  Users,
  Maximize,
  Minimize
} from "lucide-react";
import PosActionButton from "./PosActionButton";
import type { PosOrderType, MenuProvider } from "../../../types";


interface PosTopNavProps {
  onProvider?: () => void;
  onCashierOut?: () => void;
  onDelivery?: () => void;
  onDriveThrough?: () => void;
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
  onDelivery,
  onDriveThrough,
  onProvider,
  orderTypes = fallbackOrderTypes,
  selectedOrderTypeId,
  onSelectOrderType,
  activeProvider
}: PosTopNavProps) => {

  const navigate = useNavigate();
  const { editingOrderId, selectedOrderTypeName, selectedTableNo } = useAppSelector(state => state.pos);
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
    if (onCashierOut) {
      onCashierOut(); // Open the Close Session modal
    }
  };

  return (
    <nav className="flex items-center justify-between gap-2 lg:gap-3 max-[1100px]:gap-1.5 max-[800px]:gap-1 border-b border-[#3a2031] bg-[#49293e] pr-3 lg:pr-4 max-[800px]:pr-1.5 h-[60px] max-[1100px]:h-[52px] max-[800px]:h-[46px] shadow-sm shrink-0 w-full transition-all duration-300">
      <div className="flex items-center gap-0 lg:gap-0 xl:gap-0 min-w-0 h-full">
        
        {/* Centered logo, cleanly proportioned across all screen sizes */}
        <div className="flex items-center justify-center w-[90px] sm:w-[110px] md:w-[130px] lg:w-[140px] xl:w-[150px] h-full shrink-0 px-2 transition-all duration-300">
          <div className="w-full h-full flex items-center justify-center">
            <img 
               src="/LOGO6.png" 
               alt="Bitezo" 
               className="h-7 sm:h-8 md:h-8 lg:h-9 max-w-full object-contain brightness-0 invert" 
            />
          </div>
        </div>

        <div className="flex gap-1 ml-2 lg:ml-4 max-[1100px]:ml-2 max-[800px]:ml-1 min-w-0 overflow-x-auto no-scrollbar pb-1 -mb-1">
          {visibleOrderTypes.map((type) => {
            const Icon = getOrderTypeIcon(type.orderType);
            const label = formatOrderTypeLabel(type.orderType);
            const normalized = normalizeOrderType(type.orderType);
            const isActive = !activeProvider && selectedOrderTypeId === type.orderTypeId;

            return (
            <PosActionButton
              key={type.orderTypeId}
              accent={isActive ? "orange" : "order-inactive"}
              className="h-9 lg:h-10 px-2 rounded-xl text-[10px] max-[1100px]:!h-9 max-[1100px]:!px-1.5 max-[1100px]:!text-[9.5px] max-[800px]:!h-8 max-[800px]:!px-1 max-[800px]:!text-[8px] max-[700px]:!h-7 max-[700px]:!text-[7px] max-[700px]:!rounded-lg shrink-0 shadow-sm flex items-center gap-1 transition-all duration-300"
              onClick={() => {
                onSelectOrderType?.(type);
                if (normalized.includes("dine")) {
                  navigate("/pos/dine-in");
                } else if (normalized.includes("delivery") && onDelivery) {
                  onDelivery();
                } else if (normalized.includes("drive") && onDriveThrough) {
                  onDriveThrough();
                }
              }}
            >
              <Icon size={13} className="xl:w-3.5 xl:h-3.5 max-[1100px]:scale-90 max-[800px]:scale-75 max-[700px]:scale-50" />
              <span className="inline whitespace-nowrap">{label}</span>
            </PosActionButton>
          )})}
          <PosActionButton
            accent={activeProvider ? "orange" : "order-inactive"}
            className="h-9 lg:h-10 px-2 rounded-xl text-[10px] max-[1100px]:!h-9 max-[1100px]:!px-1.5 max-[1100px]:!text-[9.5px] max-[800px]:!h-8 max-[800px]:!px-1 max-[800px]:!text-[8px] max-[700px]:!h-7 max-[700px]:!text-[7px] max-[700px]:!rounded-lg shrink-0 shadow-sm flex items-center gap-1 transition-all duration-300"
            onClick={onProvider}
          >
            <Users size={13} className="xl:w-3.5 xl:h-3.5 max-[1100px]:scale-90 max-[800px]:scale-75 max-[700px]:scale-50" />
            <span className="inline uppercase whitespace-nowrap max-w-[100px] xl:max-w-[140px] max-[1100px]:!max-w-[80px] max-[800px]:!max-w-[50px] max-[700px]:!max-w-[40px] truncate" title={activeProvider ? activeProvider.provider.providerName : undefined}>
              {activeProvider ? activeProvider.provider.providerName : "Provider"}
            </span>
          </PosActionButton>
        </div>

      </div>

      <div className="flex items-center gap-1 lg:gap-1.5 max-[1100px]:gap-1 max-[800px]:gap-0.5 shrink-0">

        <div className="hidden lg:flex flex-col text-right mr-4 lg:mr-6 max-[1100px]:mr-3 max-[800px]:mr-1.5 leading-tight justify-center max-[1100px]:!flex">
          <div className="flex gap-3 max-[1100px]:gap-2 justify-end text-white font-bold text-sm max-[1100px]:text-[12px] max-[800px]:text-[9px] max-[700px]:text-[8px]">
            <span><span className="text-white/70 font-semibold mr-1">Order:</span>{editingOrderId || activeProvider?.orderNo || "New"}</span>
            <span className="text-white/30">|</span>
            <span><span className="text-white/70 font-semibold mr-1">Ticket:</span>{editingOrderId || activeProvider?.orderNo || "New"}</span>
          </div>
          <div className="flex gap-3 max-[1100px]:gap-2 justify-end text-white/90 font-semibold text-[12px] max-[1100px]:text-[10px] max-[800px]:text-[8px] max-[700px]:text-[7px] mt-0.5">
            <span><span className="text-white/50 font-medium mr-1">Section:</span>{activeProvider ? activeProvider.provider.providerName : (selectedOrderTypeName || "-")}</span>
            <span className="text-white/30">|</span>
            <span><span className="text-white/50 font-medium mr-1">Table:</span>{activeProvider ? "-" : (selectedTableNo || "-")}</span>
          </div>
        </div>

        <PosActionButton
          accent="gray"
          noPadding
          className="h-9 w-9 lg:h-10 lg:w-10 rounded-xl shadow-md text-slate-600 mr-1 max-[1100px]:!h-9 max-[1100px]:!w-9 max-[800px]:!h-7 max-[800px]:!w-7 max-[800px]:!rounded-lg transition-all duration-300"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <Minimize size={18} strokeWidth={2.5} className="max-[1100px]:scale-90 max-[800px]:scale-75 max-[700px]:scale-50" /> : <Maximize size={18} strokeWidth={2.5} className="max-[1100px]:scale-90 max-[800px]:scale-75 max-[700px]:scale-50" />}
        </PosActionButton>

        <PosActionButton
          accent="red"
          noPadding
          className="h-9 w-9 lg:h-10 lg:w-10 rounded-xl shadow-md max-[1100px]:!h-9 max-[1100px]:!w-9 max-[800px]:!h-7 max-[800px]:!w-7 max-[800px]:!rounded-lg transition-all duration-300"
          onClick={handleLogoutClick}
          title="Logout"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="max-[1100px]:scale-90 max-[800px]:scale-75 max-[700px]:scale-50">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" />
          </svg>
        </PosActionButton>
      </div>
    </nav>
  );
};

export default React.memo(PosTopNav);
