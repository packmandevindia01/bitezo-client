import { useNavigate } from "react-router-dom";
import { MoreHorizontal, UtensilsCrossed, ShoppingBag, Truck, Car, Users } from "lucide-react";
import PosActionButton from "./PosActionButton";
import { useToast } from "../../../../app/providers/useToast";


interface PosTopNavProps {
  onNewOrder?: () => void;
  onHoldTicket?: () => void;
  onMore?: () => void;
  onCashierOut?: () => void;
  status: any;
}


const PosTopNav = ({ onNewOrder, onMore, onCashierOut, status }: PosTopNavProps) => {

  const navigate = useNavigate();
  const { showToast } = useToast();

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
    <nav className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-1 shadow-sm shrink-0">
      <div className="flex items-center gap-4 xl:gap-6">
        <div className="flex items-center justify-center p-1 border-2 border-slate-100 rounded-lg bg-white overflow-hidden w-10 h-10 xl:w-14 xl:h-14 shadow-sm">
          <img src="/bitezo-logo-hq.png" alt="Bitezo" className="w-8 h-8 xl:w-10 xl:h-10 object-contain" />
        </div>

        <PosActionButton 
          accent="orange" 
          size="lg" 
          className="rounded-xl px-4 h-9 xl:h-10 shadow-md flex items-center gap-2"
          onClick={onNewOrder}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <path d="M3 6h18" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          <span className="hidden sm:inline text-xs">New Order</span>
        </PosActionButton>

        <div className="hidden md:flex gap-1 ml-2">
          {[
            { label: "Dine In", icon: UtensilsCrossed, color: "orange" },
            { label: "Take Out", icon: ShoppingBag, color: "gray" },
            { label: "Drive Thru", icon: Car, color: "gray" },
            { label: "Delivery", icon: Truck, color: "gray" },
            { label: "Provider", icon: Users, color: "gray" }
          ].map((type) => (
            <PosActionButton
              key={type.label}
              accent={type.color as any}
              className="h-9 xl:h-10 px-2 xl:px-3 rounded-xl text-[10px] min-w-max shadow-sm flex items-center gap-1.5"
              onClick={() => {
                if (type.label === "Dine In") {
                  navigate("/pos/dine-in");
                } else {
                  showToast(`${type.label} selected`, "success");
                }
              }}
            >
              <type.icon size={13} className="xl:w-3.5 xl:h-3.5" />
              <span className="hidden xl:inline">{type.label}</span>
            </PosActionButton>
          ))}
        </div>

      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <PosActionButton accent="orange" noPadding className="h-9 w-9 xl:h-10 xl:w-10 rounded-xl shadow-md" title="Split">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 3h5v5" /><path d="M8 21H3v-5" /><path d="M12 12 21 3" /><path d="m12 12-9 9" />
          </svg>
        </PosActionButton>
        <PosActionButton accent="orange" noPadding className="h-9 w-9 xl:h-10 xl:w-10 rounded-xl shadow-md" title="Combine">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21 3-9 9" /><path d="m3 21 9-9" /><path d="M16 12h5V7" /><path d="M8 12H3v5" />
          </svg>
        </PosActionButton>
        <PosActionButton accent="orange" noPadding className="h-9 w-9 xl:h-10 xl:w-10 rounded-xl shadow-md" title="Recall">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
          </svg>
        </PosActionButton>

        <div className="w-px h-6 xl:h-8 bg-slate-200 mx-1" />

        <PosActionButton
          accent="gray"
          noPadding
          className="h-9 w-9 xl:h-10 xl:w-10 rounded-xl shadow-md"
          onClick={onMore}
          title="More Options"
        >
          <MoreHorizontal size={20} strokeWidth={2.5} color="white" />
        </PosActionButton>


        <PosActionButton
          accent="red"
          noPadding
          className="h-9 w-9 xl:h-10 xl:w-10 rounded-xl shadow-md"
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
