import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart3,
  Package,
  Settings,
  Layers3,
  ShieldUser,
  Users,
  UserCog,
  PackageSearch,
  Store,
  Tags,
  Boxes,
  Grid2x2,
  Ruler,
  SlidersHorizontal,
  PackagePlus,
  Ticket,
  Shapes,
  ListTree,
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
        fixed top-0 left-0 h-dvh w-[280px] max-w-[85vw] md:static md:h-auto md:w-64
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
      <div className="flex flex-1 flex-col overflow-y-auto py-2 text-sm md:text-base">

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
          <SidebarDropdown label="General" icon={<Layers3 size={14} />} nested defaultOpen>
            <div
              onClick={() => {
                navigate("/dashboard/users");
                onClose();
              }}
              className="px-4 py-2 rounded-md hover:bg-gray-100 hover:text-[#49293e] transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ShieldUser size={14} />
                <span>Users</span>
              </div>
            </div>

            <div
              onClick={() => {
                navigate("/dashboard/customers");
                onClose();
              }}
              className="px-4 py-2 rounded-md hover:bg-gray-100 hover:text-[#49293e] transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Users size={14} />
                <span>Customers</span>
              </div>
            </div>

            <div
              onClick={() => {
                navigate("/dashboard/employees");
                onClose();
              }}
              className="px-4 py-2 rounded-md hover:bg-gray-100 hover:text-[#49293e] transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <UserCog size={14} />
                <span>Employees</span>
              </div>
            </div>
          </SidebarDropdown>

          <SidebarDropdown
            label="Inventory"
            icon={<PackageSearch size={14} />}
            nested
            defaultOpen
          >
            <div
              onClick={() => {
                navigate("/dashboard/branches");
                onClose();
              }}
              className="px-4 py-2 rounded-md hover:bg-gray-100 hover:text-[#49293e] transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Store size={14} />
                <span>Branch</span>
              </div>
            </div>

            <div
              onClick={() => {
                navigate("/dashboard/categories");
                onClose();
              }}
              className="px-4 py-2 rounded-md hover:bg-gray-100 hover:text-[#49293e] transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Tags size={14} />
                <span>Category</span>
              </div>
            </div>

            <div
              onClick={() => {
                navigate("/dashboard/sub-categories");
                onClose();
              }}
              className="px-4 py-2 rounded-md hover:bg-gray-100 hover:text-[#49293e] transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Boxes size={14} />
                <span>Sub Category</span>
              </div>
            </div>

            <div
              onClick={() => {
                navigate("/dashboard/groups");
                onClose();
              }}
              className="px-4 py-2 rounded-md hover:bg-gray-100 hover:text-[#49293e] transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Grid2x2 size={14} />
                <span>Group</span>
              </div>
            </div>

            <div
              onClick={() => {
                navigate("/dashboard/units");
                onClose();
              }}
              className="px-4 py-2 rounded-md hover:bg-gray-100 hover:text-[#49293e] transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Ruler size={14} />
                <span>Unit</span>
              </div>
            </div>

            <div
              onClick={() => {
                navigate("/dashboard/extras-type");
                onClose();
              }}
              className="px-4 py-2 rounded-md hover:bg-gray-100 hover:text-[#49293e] transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ListTree size={14} />
                <span>Extras Type</span>
              </div>
            </div>

            <div
              onClick={() => {
                navigate("/dashboard/extras-master");
                onClose();
              }}
              className="px-4 py-2 rounded-md hover:bg-gray-100 hover:text-[#49293e] transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Shapes size={14} />
                <span>Extras Master</span>
              </div>
            </div>

            <div
              onClick={() => {
                navigate("/dashboard/modifier-type");
                onClose();
              }}
              className="px-4 py-2 rounded-md hover:bg-gray-100 hover:text-[#49293e] transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={14} />
                <span>Modifier Type</span>
              </div>
            </div>

            <div
              onClick={() => {
                navigate("/dashboard/modifiers");
                onClose();
              }}
              className="px-4 py-2 rounded-md hover:bg-gray-100 hover:text-[#49293e] transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={14} />
                <span>Modifier</span>
              </div>
            </div>

            <div
              onClick={() => {
                navigate("/dashboard/products");
                onClose();
              }}
              className="px-4 py-2 rounded-md hover:bg-gray-100 hover:text-[#49293e] transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <PackagePlus size={14} />
                <span>Product</span>
              </div>
            </div>

            <div
              onClick={() => {
                navigate("/dashboard/voucher-series");
                onClose();
              }}
              className="px-4 py-2 rounded-md hover:bg-gray-100 hover:text-[#49293e] transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Ticket size={14} />
                <span>Voucher Series</span>
              </div>
            </div>
          </SidebarDropdown>
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
