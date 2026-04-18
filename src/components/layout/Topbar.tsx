import { Menu, LogOut, ChevronRight, User, ChevronDown, Monitor, Clock } from "lucide-react";
import { Modal, Button } from "../common";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useToast } from "../../app/providers/useToast";

interface TopbarProps {
  toggleSidebar: () => void;
}

const getPageTitle = (pathname: string): string => {
  const map: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/dashboard/users": "Users",
    "/dashboard/customers": "Customers",
    "/dashboard/customers/new": "New Customer",
    "/dashboard/employees": "Employees",
    "/dashboard/paymodes": "Pay Modes",
    "/dashboard/counters": "Counters",
    "/dashboard/sections": "Sections",
    "/dashboard/tables": "Table Master",
    "/dashboard/pos-terminal": "POS Terminal",
    "/dashboard/branches": "Branch Creation",
    "/dashboard/categories": "Categories",
    "/dashboard/sub-categories": "Sub Categories",
    "/dashboard/groups": "Groups",
    "/dashboard/units": "Units",
    "/dashboard/modifiers": "Modifiers",
    "/dashboard/products": "Products",
    "/dashboard/voucher-series": "Voucher Series",
    "/dashboard/extras-master": "Extras Master",
    "/dashboard/extras-type": "Extras Type",
    "/dashboard/modifier-type": "Modifier Type",
    "/dashboard/taxes": "Tax Master",
    "/cashier/in": "Cashier In — Open Shift",
    "/cashier/out": "Cashier Out — Close Shift",
    "/system/register": "System Registration",
  };
  return map[pathname] ?? "Dashboard";
};

const AUTH_KEYS = [
  "accessToken",
  "refreshToken",
  "userId",
  "userName",
  "tenantId",
  "isMaster",
  "sessionExpiresAt",
];

const Topbar = ({ toggleSidebar }: TopbarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const username = localStorage.getItem("userName") ?? "Admin";
  const pageTitle = getPageTitle(location.pathname);

  const systemType = localStorage.getItem("systemType");
  const systemName = localStorage.getItem("systemName");
  const isPOS = systemType === "pos";

  // Check if there's an open shift
  const openShiftCash = (() => {
    try {
      const raw = localStorage.getItem("activeShift");
      const shift = raw ? JSON.parse(raw) : null;
      return shift?.status === "open" ? shift.openingCash : null;
    } catch {
      return null;
    }
  })();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const initials = username
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleLogout = () => {
    AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
    showToast("Logged out successfully", "success");
    navigate("/", { replace: true });
  };

  return (
    <>
      <div className="sticky top-0 z-20 flex w-full items-center justify-between border-b border-gray-100 bg-white px-4 shadow-sm md:px-6" style={{ height: "64px" }}>

        {/* LEFT — hamburger + breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="rounded-lg p-2 transition hover:bg-gray-100 md:hidden"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-1.5 text-sm">
            <span className="hidden text-gray-400 sm:block">Bitezo</span>
            <ChevronRight size={13} className="hidden text-gray-300 sm:block" />
            <span className="font-semibold text-gray-700">{pageTitle}</span>
          </div>

          {/* POS / Back Office badge */}
          {systemType && (
            <div className={`hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              isPOS ? "bg-[#49293e]/10 text-[#49293e]" : "bg-slate-100 text-slate-500"
            }`}>
              {isPOS ? <Monitor size={11} /> : null}
              <span>{isPOS ? "POS" : "Back Office"}</span>
              {systemName && <span className="text-gray-400">· {systemName}</span>}
            </div>
          )}

          {/* Open shift indicator for POS */}
          {isPOS && openShiftCash !== null && (
            <div className="hidden md:flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
              <Clock size={11} />
              <span>Shift Open · {Number(openShiftCash).toFixed(3)}</span>
            </div>
          )}
        </div>

        {/* RIGHT — profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown((prev) => !prev)}
            className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 py-1 pl-1 pr-3 transition hover:bg-gray-100"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#49293e]">
              <span className="text-[10px] font-bold text-white">{initials}</span>
            </div>
            <span className="hidden text-sm font-medium text-gray-700 sm:block">{username}</span>
            <ChevronDown size={13} className="hidden text-gray-400 sm:block" />
          </button>

          {/* Dropdown menu */}
          {showDropdown && (
            <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg">

              {/* User info header */}
              <div className="flex items-center gap-3 border-b border-gray-100 bg-gray-50 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#49293e]">
                  <span className="text-xs font-bold text-white">{initials}</span>
                </div>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold text-gray-800">{username}</span>
                  <span className="text-xs text-gray-400">Administrator</span>
                </div>
              </div>

              {/* Profile */}
              <button
                onClick={() => {
                  setShowDropdown(false);
                  navigate("/dashboard/settings");
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50"
              >
                <User size={15} className="text-gray-400" />
                Profile
              </button>

              {/* Logout */}
              <button
                onClick={() => {
                  setShowDropdown(false);
                  setShowLogoutModal(true);
                }}
                className="flex w-full items-center gap-2.5 border-t border-gray-100 px-4 py-2.5 text-sm text-red-500 transition hover:bg-red-50"
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Logout confirm modal */}
      <Modal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Confirm Logout"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowLogoutModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleLogout}>
              Logout
            </Button>
          </>
        }
      >
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <LogOut size={22} className="text-red-400" />
          </div>
          <p className="text-center text-sm text-gray-600">
            Are you sure you want to logout,{" "}
            <span className="font-semibold text-gray-800">{username}</span>?
          </p>
        </div>
      </Modal>
    </>
  );
};

export default Topbar;