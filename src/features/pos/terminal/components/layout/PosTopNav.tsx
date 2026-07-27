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
  status,
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
    // If Day or Shift is still OPEN, give a reminder
    if (status && (!status.isDayClosed || !status.isShiftClosed)) {
      if (onCashierOut) {
        onCashierOut(); // Open the Close Session dashboard
      } else {
        navigate("/cashier/out");
      }
    } else {
      // If everything is closed, go to the final out page/login
      navigate("/cashier/out");
    }
  };

  return (
    <nav className="flex items-center justify-between gap-2 lg:gap-3 border-b border-slate-200 bg-white px-3 lg:px-4 py-1 shadow-sm shrink-0">
      <div className="flex items-center gap-2 lg:gap-3 xl:gap-5 min-w-0">
        <div className="flex items-center justify-center overflow-hidden w-24 md:w-28 lg:w-30 xl:w-36 h-9 lg:h-10 shrink-0">
          <img src="/LOGO6.png" alt="Bitezo" className="w-full h-full object-contain" style={{ transform: 'scale(3.2) translateY(1.5px)' }} />
        </div>



        <div className="flex gap-1 ml-1 lg:ml-2 min-w-0 overflow-x-auto no-scrollbar pb-1 -mb-1">
          {visibleOrderTypes.map((type) => {
            const Icon = getOrderTypeIcon(type.orderType);
            const label = formatOrderTypeLabel(type.orderType);
            const normalized = normalizeOrderType(type.orderType);
            const isActive = selectedOrderTypeId === type.orderTypeId;

            return (
            <PosActionButton
              key={type.orderTypeId}
              accent={isActive ? "orange" : "gray"}
              className="h-9 lg:h-10 px-2 rounded-xl text-[10px] shrink-0 shadow-sm flex items-center gap-1"
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
              <Icon size={13} className="xl:w-3.5 xl:h-3.5" />
              <span className="inline whitespace-nowrap">{label}</span>
            </PosActionButton>
          )})}
          <PosActionButton
            accent={activeProvider ? "orange" : "gray"}
            className="h-9 lg:h-10 px-2 rounded-xl text-[10px] shrink-0 shadow-sm flex items-center gap-1"
            onClick={onProvider}
          >
            <Users size={13} className="xl:w-3.5 xl:h-3.5" />
            <span className="inline uppercase whitespace-nowrap">
              {activeProvider ? activeProvider.provider.providerName : "Provider"}
            </span>
          </PosActionButton>
        </div>

      </div>

      <div className="flex items-center gap-1 lg:gap-1.5 shrink-0">

        <div className="hidden lg:flex flex-col text-right mr-4 lg:mr-6 leading-tight justify-center">
          <div className="flex gap-3 justify-end text-slate-900 font-bold text-sm">
            <span><span className="text-slate-500 font-semibold mr-1">Order:</span>{editingOrderId || activeProvider?.orderNo || "New"}</span>
            <span className="text-slate-300">|</span>
            <span><span className="text-slate-500 font-semibold mr-1">Ticket:</span>{editingOrderId || activeProvider?.orderNo || "New"}</span>
          </div>
          <div className="flex gap-3 justify-end text-slate-700 font-semibold text-[12px] mt-0.5">
            <span><span className="text-slate-400 font-medium mr-1">Section:</span>{selectedOrderTypeName || "-"}</span>
            <span className="text-slate-300">|</span>
            <span><span className="text-slate-400 font-medium mr-1">Table:</span>{selectedTableNo || "-"}</span>
          </div>
        </div>

        <PosActionButton
          accent="gray"
          noPadding
          className="h-9 w-9 lg:h-10 lg:w-10 rounded-xl shadow-md text-slate-600 mr-1"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <Minimize size={18} strokeWidth={2.5} /> : <Maximize size={18} strokeWidth={2.5} />}
        </PosActionButton>

        <PosActionButton
          accent="red"
          noPadding
          className="h-9 w-9 lg:h-10 lg:w-10 rounded-xl shadow-md"
          onClick={handleLogoutClick}
          title="Logout"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" />
          </svg>
        </PosActionButton>
      </div>
    </nav>
  );
};

export default React.memo(PosTopNav);
