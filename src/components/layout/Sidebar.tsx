import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart3,
  Package,
  Settings,
  X,
} from "lucide-react";

import SidebarItem from "./SidebarItem";
import SidebarDropdown from "./SidebarDropdown";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: Props) => {
  const navigate = useNavigate();

  return (
    <div
      className={`
        fixed md:static top-0 left-0 h-full w-64
        bg-white flex flex-col z-50
        border-r border-gray-200
        transform
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0
        transition-transform duration-300 ease-in-out
      `}
    >
      {/* CLOSE BUTTON (MOBILE) */}
      <div className="md:hidden flex justify-end p-4">
        <X size={20} onClick={onClose} className="cursor-pointer" />
      </div>

      {/* LOGO */}
      <div className="h-16 md:h-20 flex items-center px-4 font-bold text-xl border-b border-gray-200 text-[#49293e]">
        Bitezo
      </div>

      {/* MENU */}
      <div className="flex flex-col text-sm md:text-base flex-1 overflow-y-auto py-2">

        {/* Dashboard */}
        <SidebarItem
          icon={<LayoutDashboard size={18} />}
          label="Dashboard"
          onClick={() => {
            navigate("/dashboard");
            onClose();
          }}
        />

        {/* Master */}
        <SidebarDropdown icon={<Package size={18} />} label="Master">
          <div
            onClick={() => {
              navigate("/dashboard/users");
              onClose();
            }}
            className="px-4 py-2 rounded-md hover:bg-gray-100 hover:text-[#49293e] transition cursor-pointer"
          >
            User
          </div>

          <div
            onClick={() => {
              navigate("/dashboard/customers");
              onClose();
            }}
            className="px-4 py-2 rounded-md hover:bg-gray-100 hover:text-[#49293e] transition cursor-pointer"
          >
            Customer
          </div>
        </SidebarDropdown>

        {/* Reports */}
        <SidebarDropdown icon={<BarChart3 size={18} />} label="Reports">
          <div className="px-6 py-2 hover:text-[#49293e] cursor-pointer text-sm">
            Sales Report
          </div>

          <div className="px-6 py-2 hover:text-[#49293e] cursor-pointer text-sm">
            Stock Report
          </div>
        </SidebarDropdown>

        {/* Settings */}
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