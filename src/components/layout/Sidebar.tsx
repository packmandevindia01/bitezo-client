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
  Percent,
  LogIn,
  LogOut,
  Monitor,
} from "lucide-react";

import SidebarItem from "./SidebarItem";
import SidebarDropdown from "./SidebarDropdown";

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
      <div className="flex shrink-0 justify-end p-4 md:hidden">
        <X size={20} onClick={onClose} className="cursor-pointer" />
      </div>

      <div className="flex h-16 shrink-0 items-center border-b border-gray-200 px-4 text-xl font-bold text-[#49293e] md:h-20">
        Bitezo
        {systemName && (
          <span className="ml-2 text-xs font-normal text-gray-400 truncate max-w-[100px]">
            · {systemName}
          </span>
        )}
      </div>

      <div className="min-h-0 flex flex-1 flex-col overflow-y-auto overscroll-contain py-2 text-sm md:text-base">
        <SidebarItem
          icon={<LayoutDashboard size={18} />}
          label="Dashboard"
          onClick={() => {
            navigate("/dashboard");
            onClose();
          }}
        />

        <SidebarDropdown icon={<Package size={18} />} label="Master">
          <SidebarDropdown label="General" icon={<Layers3 size={14} />} nested defaultOpen>
            <div
              onClick={() => {
                navigate("/dashboard/users");
                onClose();
              }}
              className={itemClassName}
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
              className={itemClassName}
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
              className={itemClassName}
            >
              <div className="flex items-center gap-2">
                <UserCog size={14} />
                <span>Employees</span>
              </div>
            </div>

            <div
              onClick={() => {
                navigate("/dashboard/paymodes");
                onClose();
              }}
              className={itemClassName}
            >
              <div className="flex items-center gap-2">
                <Ticket size={14} />
                <span>Paymode</span>
              </div>
            </div>

            <div
              onClick={() => {
                navigate("/dashboard/counters");
                onClose();
              }}
              className={itemClassName}
            >
              <div className="flex items-center gap-2">
                <Store size={14} />
                <span>Counter</span>
              </div>
            </div>

            <div
              onClick={() => {
                navigate("/dashboard/sections");
                onClose();
              }}
              className={itemClassName}
            >
              <div className="flex items-center gap-2">
                <Layers3 size={14} />
                <span>Section</span>
              </div>
            </div>

            <div
              onClick={() => {
                navigate("/dashboard/tables");
                onClose();
              }}
              className={itemClassName}
            >
              <div className="flex items-center gap-2">
                <Grid2x2 size={14} />
                <span>Table Master</span>
              </div>
            </div>



            <div
              onClick={() => {
                navigate("/dashboard/taxes");
                onClose();
              }}
              className={itemClassName}
            >
              <div className="flex items-center gap-2">
                <Percent size={14} />
                <span>Tax Master</span>
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
              className={itemClassName}
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
              className={itemClassName}
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
              className={itemClassName}
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
              className={itemClassName}
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
              className={itemClassName}
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
              className={itemClassName}
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
              className={itemClassName}
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
              className={itemClassName}
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
              className={itemClassName}
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
              className={itemClassName}
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
              className={itemClassName}
            >
              <div className="flex items-center gap-2">
                <Ticket size={14} />
                <span>Voucher Series</span>
              </div>
            </div>
          </SidebarDropdown>
        </SidebarDropdown>

        <SidebarDropdown icon={<BarChart3 size={18} />} label="Reports">
          <div className="cursor-pointer px-6 py-2 text-sm hover:text-[#49293e]">
            Sales Report
          </div>

          <div className="cursor-pointer px-6 py-2 text-sm hover:text-[#49293e]">
            Stock Report
          </div>
        </SidebarDropdown>





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
