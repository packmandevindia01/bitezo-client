import { useNavigate } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import PosActionButton from "./PosActionButton";


interface PosTopNavProps {
  onNewOrder?: () => void;
  onHoldTicket?: () => void;
  onMore?: () => void;
}


const PosTopNav = ({ onNewOrder, onMore }: PosTopNavProps) => {

  const navigate = useNavigate();

  return (
    <nav className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-2 shadow-sm shrink-0">
      <div className="flex items-center gap-4 xl:gap-6">
        <div className="flex items-center justify-center p-1 border-2 border-slate-100 rounded-lg bg-white overflow-hidden w-12 h-12 xl:w-20 xl:h-20 shadow-sm">
          <img src="/bitezo-logo-hq.png" alt="Bitezo" className="w-10 h-10 xl:w-16 xl:h-16 object-contain" />
        </div>

        <PosActionButton 
          accent="orange" 
          size="lg" 
          className="rounded-xl px-4 h-10 xl:h-12 shadow-md flex items-center gap-2"
          onClick={onNewOrder}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <path d="M3 6h18" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
          <span className="hidden sm:inline">New Order</span>
        </PosActionButton>

        <div className="hidden lg:flex gap-1 ml-2">
          {["Dine In", "Take Out", "Drive Thru", "Delivery", "Provider"].map((type) => (
            <PosActionButton
              key={type}
              accent={type === "Dine In" ? "orange" : "gray"}
              className="h-10 xl:h-12 px-3 rounded-xl text-[10px] min-w-max shadow-sm"
            >
              {type}
            </PosActionButton>
          ))}
        </div>

      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <PosActionButton accent="orange" noPadding className="h-10 w-10 xl:h-12 xl:w-12 rounded-xl shadow-md" title="Split">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 3h5v5" /><path d="M8 21H3v-5" /><path d="M12 12 21 3" /><path d="m12 12-9 9" />
          </svg>
        </PosActionButton>
        <PosActionButton accent="orange" noPadding className="h-10 w-10 xl:h-12 xl:w-12 rounded-xl shadow-md" title="Combine">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m21 3-9 9" /><path d="m3 21 9-9" /><path d="M16 12h5V7" /><path d="M8 12H3v5" />
          </svg>
        </PosActionButton>
        <PosActionButton accent="orange" noPadding className="h-10 w-10 xl:h-12 xl:w-12 rounded-xl shadow-md" title="Recall">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
          </svg>
        </PosActionButton>

        <div className="w-px h-8 xl:h-10 bg-slate-200 mx-1" />

        <PosActionButton
          accent="gray"
          noPadding
          className="h-10 w-10 xl:h-12 xl:w-12 rounded-xl shadow-md"
          onClick={onMore}
          title="More Options"
        >
          <MoreHorizontal size={24} strokeWidth={2.5} color="white" />
        </PosActionButton>


        <PosActionButton
          accent="red"
          noPadding
          className="h-10 w-10 xl:h-12 xl:w-12 rounded-xl shadow-md"
          onClick={() => navigate("/cashier/out")}
          title="Logout"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" />
          </svg>
        </PosActionButton>
      </div>
    </nav>
  );
};

export default PosTopNav;
