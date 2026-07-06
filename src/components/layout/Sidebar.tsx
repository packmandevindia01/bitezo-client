import { useNavigate } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";

import SidebarItem from "./SidebarItem";
import SidebarHeader from "./sidebar/SidebarHeader";
import NavMasterGroup from "./sidebar/NavMasterGroup";
import NavReportGroup from "./sidebar/NavReportGroup";
import NavTransactionGroup from "./sidebar/NavTransactionGroup";
import NavSettingsGroup from "./sidebar/NavSettingsGroup";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onDenominationOpen: () => void;
}

const itemClassName =
  "group flex items-center gap-2 px-3 py-1.5 mx-1 my-0.5 rounded-lg text-sm text-gray-600 cursor-pointer transition-all duration-150 hover:bg-[#49293e]/8 hover:text-[#49293e] hover:translate-x-0.5 active:scale-[0.98]";

const Sidebar = ({ onClose, onDenominationOpen }: Props) => {
  const navigate = useNavigate();
  const systemName = localStorage.getItem("systemName");

  return (
    <div className="flex h-dvh w-[280px] max-w-[85vw] flex-col border-r border-gray-200 bg-white md:h-screen md:w-64 md:max-w-none">
      <SidebarHeader systemName={systemName} onClose={onClose} />

      <div className="min-h-0 flex flex-1 flex-col overflow-y-auto overscroll-contain py-2 text-sm md:text-base">
        <SidebarItem
          icon={<LayoutDashboard size={18} />}
          label="Dashboard"
          onClick={() => {
            navigate("/dashboard");
            onClose();
          }}
        />

        <NavMasterGroup 
          navigate={navigate} 
          onClose={onClose} 
          itemClassName={itemClassName} 
          onOpenDenomination={onDenominationOpen}
        />

        <NavTransactionGroup
          navigate={navigate}
          onClose={onClose}
          itemClassName={itemClassName}
        />

        <NavReportGroup 
          navigate={navigate}
          onClose={onClose}
          itemClassName={itemClassName}
        />

        <NavSettingsGroup
          navigate={navigate}
          onClose={onClose}
          itemClassName={itemClassName}
        />

      </div>
    </div>
  );
};

export default Sidebar;
