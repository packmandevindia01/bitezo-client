import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Settings,
} from "lucide-react";

import SidebarItem from "./SidebarItem";
import SidebarHeader from "./sidebar/SidebarHeader";
import NavMasterGroup from "./sidebar/NavMasterGroup";
import NavReportGroup from "./sidebar/NavReportGroup";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const itemClassName =
  "px-4 py-2 rounded-md hover:bg-gray-100 hover:text-[#49293e] transition cursor-pointer";

const Sidebar = ({ isOpen: _isOpen, onClose }: Props) => {
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
        />

        <NavReportGroup onClose={onClose} />

        <SidebarItem
          icon={<Settings size={18} />}
          label="Settings"
          onClick={() => {
            navigate("/dashboard/settings");
            onClose();
          }}
        />
      </div>
    </div>
  );
};

export default Sidebar;
