import { useNavigate } from "react-router-dom";
import {
  MoreHorizontal,
  UtensilsCrossed,
  ShoppingBag,
  Truck,
  Car,
  Users,
  UserPlus,
} from "lucide-react";
import PosActionButton from "./PosActionButton";
import { useToast } from "../../../../app/providers/useToast";
import type { PosOrderType, MenuProvider } from "../../types";


interface PosTopNavProps {
  onNewOrder?: () => void;
  onHoldTicket?: () => void;
  onMore?: () => void;
  onProvider?: () => void;
  onCashierOut?: () => void;
  onCustomerMaster?: () => void;
  onDelivery?: () => void;
  onDriveThrough?: () => void;
  onRecall?: () => void;
  onVoidOrder?: () => void;
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
  onNewOrder,
  onMore,
  onCashierOut,
  onCustomerMaster,
  onDelivery,
  onDriveThrough,
  onRecall,
  onVoidOrder,
  onProvider,
  orderTypes = fallbackOrderTypes,
  selectedOrderTypeId,
  onSelectOrderType,
  status,
  activeProvider
}: PosTopNavProps) => {

  const navigate = useNavigate();
  const { showToast } = useToast();
  const visibleOrderTypes = orderTypes.length > 0 ? orderTypes : fallbackOrderTypes;

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

        <PosActionButton
          accent="orange"
          size="lg"
          className="rounded-xl px-3 lg:px-4 h-9 lg:h-10 shadow-md flex items-center gap-1.5 lg:gap-2 shrink-0"
          onClick={onNewOrder}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <path d="M3 6h18" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          <span className="hidden sm:inline text-xs">New Order</span>
        </PosActionButton>

        <div className="hidden md:flex gap-1 ml-1 lg:ml-2 min-w-0">
          {visibleOrderTypes.map((type) => {
            const Icon = getOrderTypeIcon(type.orderType);
            const label = formatOrderTypeLabel(type.orderType);
            const normalized = normalizeOrderType(type.orderType);
            const isActive = selectedOrderTypeId === type.orderTypeId;

            return (
            <PosActionButton
              key={type.orderTypeId}
              accent={isActive ? "orange" : "gray"}
              className="h-9 lg:h-10 px-2 rounded-xl text-[10px] min-w-0 shadow-sm flex items-center gap-1"
              onClick={() => {
                onSelectOrderType?.(type);
                if (normalized.includes("dine")) {
                  navigate("/pos/dine-in");
                } else if (normalized.includes("delivery") && onDelivery) {
                  onDelivery();
                } else if (normalized.includes("drive") && onDriveThrough) {
                  onDriveThrough();
                } else {
                  showToast(`${label} selected`, "success");
                }
              }}
            >
              <Icon size={13} className="xl:w-3.5 xl:h-3.5" />
              <span className="hidden xl:inline">{label}</span>
            </PosActionButton>
          )})}
          <PosActionButton
            accent={activeProvider ? "orange" : "gray"}
            className="h-9 lg:h-10 px-2 rounded-xl text-[10px] min-w-0 shadow-sm flex items-center gap-1"
            onClick={onProvider}
          >
            <Users size={13} className="xl:w-3.5 xl:h-3.5" />
            <span className="hidden xl:inline uppercase">
              {activeProvider ? activeProvider.provider.providerName : "Provider"}
            </span>
          </PosActionButton>
        </div>

      </div>

      <div className="flex items-center gap-1 lg:gap-1.5 shrink-0">
        <PosActionButton accent="orange" noPadding className="h-9 w-9 lg:h-10 lg:w-10 rounded-xl shadow-md" title="Split">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 3h5v5" /><path d="M8 21H3v-5" /><path d="M12 12 21 3" /><path d="m12 12-9 9" />
          </svg>
        </PosActionButton>
        <PosActionButton accent="orange" noPadding className="h-9 w-9 lg:h-10 lg:w-10 rounded-xl shadow-md" title="Combine">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21 3-9 9" /><path d="m3 21 9-9" /><path d="M16 12h5V7" /><path d="M8 12H3v5" />
          </svg>
        </PosActionButton>
        <PosActionButton accent="orange" noPadding className="h-9 w-9 lg:h-10 lg:w-10 rounded-xl shadow-md" title="Recall" onClick={onRecall}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
          </svg>
        </PosActionButton>
        <PosActionButton accent="red" noPadding className="h-9 w-9 lg:h-10 lg:w-10 rounded-xl shadow-md" title="Void Order" onClick={onVoidOrder}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </PosActionButton>

        <div className="w-px h-6 lg:h-8 bg-slate-200 mx-1" />

        <PosActionButton
          accent="gray"
          noPadding
          className="h-9 w-9 lg:h-10 lg:w-10 rounded-xl shadow-md"
          onClick={onCustomerMaster}
          title="Customer Master"
        >
          <UserPlus size={18} strokeWidth={2.5} color="white" />
        </PosActionButton>

        <PosActionButton
          accent="gray"
          noPadding
          className="h-9 w-9 lg:h-10 lg:w-10 rounded-xl shadow-md"
          onClick={onMore}
          title="More Options"
        >
          <MoreHorizontal size={20} strokeWidth={2.5} color="white" />
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

export default PosTopNav;
